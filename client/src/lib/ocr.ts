import { createWorker } from 'tesseract.js';
import type { PlayerRoster } from '@shared/schema';

// Convert file to base64 for OpenAI API
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Comprehensive NFL player database for 2024/2025 fantasy football
const NFL_PLAYERS = {
  QB: [
    'Josh Allen', 'Lamar Jackson', 'Jalen Hurts', 'Jayden Daniels', 'Bo Nix',
    'Joe Burrow', 'Patrick Mahomes', 'Baker Mayfield', 'C.J. Stroud', 'Jordan Love',
    'Brock Purdy', 'Jared Goff', 'Kyler Murray', 'Dak Prescott', 'Caleb Williams',
    'Tua Tagovailoa', 'Anthony Richardson', 'Justin Herbert', 'Aaron Rodgers', 'Trevor Lawrence',
    'Geno Smith', 'Sam Darnold', 'Russell Wilson', 'Daniel Jones', 'J.J. McCarthy'
  ],
  RB: [
    'Bijan Robinson', 'Jahmyr Gibbs', 'Saquon Barkley', 'Christian McCaffrey', 'Ashton Jeanty',
    'Derrick Henry', 'Josh Jacobs', 'Kyren Williams', 'James Cook', 'Jonathan Taylor',
    'Alvin Kamara', 'Bucky Irving', 'James Conner', "D'Andre Swift", 'Cam Skattebo',
    'J.K. Dobbins', 'David Montgomery', 'Javonte Williams', 'Nick Chubb', 'TreVeyon Henderson',
    'Tony Pollard', 'Rachaad White', 'Jerome Ford', 'Rhamondre Stevenson', 'Travis Etienne',
    'De\'Von Achane', 'Isiah Pacheco', 'Najee Harris', 'Brian Robinson Jr.', 'Rico Dowdle'
  ],
  WR: [
    "Ja'Marr Chase", 'Justin Jefferson', 'CeeDee Lamb', 'Tyreek Hill', 'Malik Nabers',
    'Puka Nacua', 'Nico Collins', 'Brian Thomas Jr.', 'A.J. Brown', 'Garrett Wilson',
    'Drake London', 'Tee Higgins', 'Ladd McConkey', 'Davante Adams', 'Jaxon Smith-Njigba',
    'Amon-Ra St. Brown', 'George Pickens', 'DK Metcalf', 'Jerry Jeudy', 'Stefon Diggs',
    'Rome Odunze', 'Chris Godwin', 'Jakobi Meyers', 'Chris Olave', 'Tetairoa McMillan',
    'Jordan Addison', 'Josh Downs', 'Rashod Bateman', 'Marvin Mims Jr.', 'Luther Burden III',
    'Mike Evans', 'DeAndre Hopkins', 'Amari Cooper', 'Calvin Ridley', 'DJ Moore',
    'Keenan Allen', 'Tyler Lockett', 'Hollywood Brown', 'Michael Pittman Jr.', 'Courtland Sutton'
  ],
  TE: [
    'Brock Bowers', 'Travis Kelce', 'Trey McBride', 'Mark Andrews', 'Sam LaPorta',
    'Evan Engram', 'Kyle Pitts', 'George Kittle', 'Colston Loveland', 'Tyler Warren',
    'Cade Stover', 'Pat Freiermuth', 'Cade Otton', 'Tyler Conklin', 'Noah Fant',
    'Cole Strange', 'Hunter Henry', 'Dalton Kincaid', 'Jake Ferguson', 'Isaiah Likely',
    'T.J. Hockenson', 'David Njoku', 'Jonnu Smith', 'Gerald Everett', 'Dallas Goedert'
  ],
  K: [
    'Justin Tucker', 'Harrison Butker', 'Tyler Bass', 'Daniel Carlson', 'Brandon McManus',
    'Jake Moody', 'Younghoe Koo', 'Jason Sanders', 'Chris Boswell', 'Evan McPherson',
    'Cameron Dicker', 'Jake Elliott', 'Greg Zuerlein', 'Matt Gay', 'Cairo Santos',
    'Ryan Succop', 'Nick Folk', 'Dustin Hopkins', 'Wil Lutz', 'Graham Gano'
  ],
  DEF: [
    'Buffalo Bills', 'Pittsburgh Steelers', 'Denver Broncos', 'Philadelphia Eagles', 'Minnesota Vikings',
    'Green Bay Packers', 'Houston Texans', 'Baltimore Ravens', 'Los Angeles Chargers', 'Miami Dolphins',
    'Kansas City Chiefs', 'San Francisco 49ers', 'Dallas Cowboys', 'New York Jets', 'Cleveland Browns',
    'Indianapolis Colts', 'Tampa Bay Buccaneers', 'Arizona Cardinals', 'Detroit Lions', 'Washington Commanders',
    'New Orleans Saints', 'Seattle Seahawks', 'Atlanta Falcons', 'Los Angeles Rams', 'Chicago Bears',
    'Jacksonville Jaguars', 'Tennessee Titans', 'Carolina Panthers', 'New York Giants', 'Las Vegas Raiders',
    'Cincinnati Bengals', 'New England Patriots'
  ]
};

// Flatten all players for general matching
const ALL_PLAYERS = Object.values(NFL_PLAYERS).flat();

interface OCRResult {
  roster: PlayerRoster | null;
  confidence: number;
  rawText: string;
}

// Advanced fuzzy matching with player name-specific logic
function findBestMatch(text: string, candidates: string[]): string | null {
  const normalized = text.toLowerCase().trim().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ');
  
  if (normalized.length < 3) return null;
  
  // Exact match first
  for (const candidate of candidates) {
    if (candidate.toLowerCase() === normalized) {
      return candidate;
    }
  }
  
  // Last name only match (common in fantasy apps)
  const words = normalized.split(' ');
  for (const candidate of candidates) {
    const candidateWords = candidate.toLowerCase().split(' ');
    const lastName = candidateWords[candidateWords.length - 1];
    
    // Check if any word matches the last name
    if (words.some(word => word === lastName && word.length > 2)) {
      return candidate;
    }
  }
  
  // First and last name initials + last name (e.g., "J. Allen")
  for (const candidate of candidates) {
    const candidateWords = candidate.toLowerCase().split(' ');
    if (candidateWords.length >= 2) {
      const firstInitial = candidateWords[0][0];
      const lastName = candidateWords[candidateWords.length - 1];
      
      const pattern = `${firstInitial}.?\\s*${lastName}`;
      if (new RegExp(pattern, 'i').test(normalized)) {
        return candidate;
      }
    }
  }
  
  // Partial name matching (at least 3 characters)
  for (const candidate of candidates) {
    const candidateLower = candidate.toLowerCase();
    if (candidateLower.includes(normalized) || normalized.includes(candidateLower)) {
      return candidate;
    }
  }
  
  // Split name matching (handles OCR errors with spacing)
  for (const candidate of candidates) {
    const candidateWords = candidate.toLowerCase().split(' ');
    let matchScore = 0;
    
    for (const word of words) {
      if (word.length > 2 && candidateWords.some(cw => cw.includes(word) || word.includes(cw))) {
        matchScore++;
      }
    }
    
    if (matchScore >= candidateWords.length) {
      return candidate;
    }
  }
  
  return null;
}

// Calculate Levenshtein distance for fuzzy matching
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

// Enhanced fuzzy matching with edit distance
function findBestFuzzyMatch(text: string, candidates: string[]): string | null {
  const normalized = text.toLowerCase().trim().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ');
  
  if (normalized.length < 3) return null;
  
  let bestMatch = null;
  let bestScore = Infinity;
  const threshold = Math.floor(normalized.length * 0.3); // Allow 30% error rate
  
  for (const candidate of candidates) {
    const candidateLower = candidate.toLowerCase();
    const distance = levenshteinDistance(normalized, candidateLower);
    
    if (distance <= threshold && distance < bestScore) {
      bestMatch = candidate;
      bestScore = distance;
    }
  }
  
  return bestMatch;
}

// Extract player names from OCR text with position awareness
function extractPlayers(text: string): Partial<PlayerRoster> {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 2);
  const players: Partial<PlayerRoster> = {};
  
  // Position patterns to identify lineup structure
  const positionPatterns = {
    QB: /QB|quarterback/i,
    RB: /RB|running.?back/i,
    WR: /WR|wide.?receiver/i,
    TE: /TE|tight.?end/i,
    K: /K\b|kicker/i,
    DEF: /DEF|defense|D\/ST/i,
    FLEX: /FLEX|flex/i
  };
  
  const detectedPlayers: Array<{name: string, position?: string, confidence: number}> = [];
  
  for (const line of lines) {
    // Skip obvious non-player lines
    if (line.match(/week|points|proj|vs|@|\d+\.\d+|total|waiver|bench|start/i)) continue;
    
    // Clean the line for player name extraction
    const cleanLine = line.replace(/\d+/g, '').replace(/[^\w\s'.-]/g, ' ').replace(/\s+/g, ' ').trim();
    if (cleanLine.length < 3) continue;
    
    // Try to detect position from the line
    let detectedPosition = null;
    for (const [pos, pattern] of Object.entries(positionPatterns)) {
      if (pattern.test(line)) {
        detectedPosition = pos;
        break;
      }
    }
    
    // Try multiple matching strategies
    let bestMatch = findBestMatch(cleanLine, ALL_PLAYERS);
    if (!bestMatch) {
      bestMatch = findBestFuzzyMatch(cleanLine, ALL_PLAYERS);
    }
    
    if (bestMatch) {
      // Determine player position if not detected from text
      let playerPosition = detectedPosition;
      if (!playerPosition) {
        // Find which position category this player belongs to
        for (const [pos, playerList] of Object.entries(NFL_PLAYERS)) {
          if (playerList.includes(bestMatch)) {
            playerPosition = pos;
            break;
          }
        }
      }
      
      detectedPlayers.push({
        name: bestMatch,
        position: playerPosition || undefined,
        confidence: bestMatch === cleanLine ? 100 : 75
      });
    }
  }
  
  // Assign players to fantasy positions based on detection and NFL position
  const positionMapping = ['QB', 'RB', 'WR1', 'WR2', 'TE', 'FLEX', 'K', 'DEF'];
  const assignedPositions = new Set<string>();
  
  // First pass: assign exact position matches
  for (const player of detectedPlayers) {
    if (player.position && positionMapping.includes(player.position)) {
      if (!assignedPositions.has(player.position)) {
        (players as any)[player.position] = player.name;
        assignedPositions.add(player.position);
      }
    }
  }
  
  // Second pass: assign WR positions
  const wrs = detectedPlayers.filter(p => p.position === 'WR' && !assignedPositions.has(p.name));
  if (wrs.length >= 1 && !assignedPositions.has('WR1')) {
    (players as any)['WR1'] = wrs[0].name;
    assignedPositions.add('WR1');
  }
  if (wrs.length >= 2 && !assignedPositions.has('WR2')) {
    (players as any)['WR2'] = wrs[1].name;
    assignedPositions.add('WR2');
  }
  
  // Third pass: assign remaining players to FLEX if available
  const flexEligible = detectedPlayers.filter(p => 
    ['RB', 'WR', 'TE'].includes(p.position || '') && 
    !Object.values(players).includes(p.name)
  );
  
  if (flexEligible.length > 0 && !assignedPositions.has('FLEX')) {
    (players as any)['FLEX'] = flexEligible[0].name;
    assignedPositions.add('FLEX');
  }
  
  return players;
}

// Return only detected positions - no artificial filling
function cleanupRoster(partialRoster: Partial<PlayerRoster>): PlayerRoster {
  const roster: PlayerRoster = {};
  
  // Only include positions that were actually detected
  Object.keys(partialRoster).forEach(key => {
    const value = partialRoster[key];
    if (value && value.trim() && value !== 'Not Available') {
      roster[key] = value;
    }
  });
  
  return roster;
}

export async function processRosterImage(imageFile: File): Promise<OCRResult> {
  const worker = await createWorker('eng');
  
  try {
    await worker.setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,()/-\' '
    });
    
    const { data: { text, confidence } } = await worker.recognize(imageFile);
    
    console.log('OCR Raw Text:', text);
    console.log('OCR Confidence:', confidence);
    
    const partialRoster = extractPlayers(text);
    const roster = cleanupRoster(partialRoster);
    
    return {
      roster,
      confidence,
      rawText: text
    };
  } catch (error) {
    console.error('OCR processing failed:', error);
    return {
      roster: null,
      confidence: 0,
      rawText: ''
    };
  } finally {
    await worker.terminate();
  }
}

// Enhanced mock OCR for development - processes a single matchup screenshot
export function mockOCRProcess(imageFile: File, isOpponent = false): Promise<OCRResult> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const mockRoster: PlayerRoster = isOpponent ? {
        QB: 'Aaron Rodgers',
        RB: 'Jonathan Taylor',
        WR1: 'Cooper Kupp',
        WR2: 'Mike Evans',
        TE: 'George Kittle',
        FLEX: 'Alvin Kamara',
        K: 'Harrison Butker',
        DEF: 'Pittsburgh Steelers'
      } : {
        QB: 'Josh Allen',
        RB: 'Derrick Henry',
        WR1: 'Tyreek Hill',
        WR2: 'Davante Adams',
        TE: 'Travis Kelce',
        FLEX: 'Christian McCaffrey',
        K: 'Justin Tucker',
        DEF: 'Buffalo Bills'
      };
      
      resolve({
        roster: mockRoster,
        confidence: 85,
        rawText: 'Mocked OCR result'
      });
    }, 2000);
  });
}

interface MatchupAnalysis {
  teamNames: { your: string; opponent: string };
  rosters: { your: PlayerRoster; opponent: PlayerRoster };
  confidence: number;
  rawText: string;
}

// Extract team names from OCR text
function extractTeamNames(text: string): { your: string; opponent: string } {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 2);
  
  // Look for common fantasy team name patterns
  const teamNamePatterns = [
    /^([A-Za-z\s]{3,20})\s+vs?\s+([A-Za-z\s]{3,20})$/i,
    /^([A-Za-z\s]{3,20})\s+@\s+([A-Za-z\s]{3,20})$/i,
    /matchup:?\s*([A-Za-z\s]{3,20})\s+(?:vs?|@)\s+([A-Za-z\s]{3,20})/i
  ];
  
  for (const line of lines) {
    for (const pattern of teamNamePatterns) {
      const match = line.match(pattern);
      if (match) {
        return {
          your: match[1].trim(),
          opponent: match[2].trim()
        };
      }
    }
  }
  
  // Fallback: try to extract team names from header-like lines
  const potentialTeamNames = lines.filter(line => 
    line.length > 5 && 
    line.length < 25 && 
    !/\d/.test(line) &&
    !line.match(/QB|RB|WR|TE|K|DEF|points|week|proj/i)
  ).slice(0, 2);
  
  if (potentialTeamNames.length >= 2) {
    return {
      your: potentialTeamNames[0],
      opponent: potentialTeamNames[1]
    };
  }
  
  return {
    your: "Your Team",
    opponent: "Opponent Team"
  };
}

// Split OCR text into two team sections
function splitMatchupText(text: string): { yourTeam: string; opponentTeam: string } {
  const lines = text.split('\n');
  const midpoint = Math.floor(lines.length / 2);
  
  // Try to find natural division points
  let splitPoint = midpoint;
  
  // Look for visual separators or repeated patterns
  for (let i = 1; i < lines.length - 1; i++) {
    const line = lines[i].trim();
    if (line.length === 0 || line.match(/^[-=_]{3,}$/) || line.match(/total|vs|@/i)) {
      splitPoint = i;
      break;
    }
  }
  
  return {
    yourTeam: lines.slice(0, splitPoint).join('\n'),
    opponentTeam: lines.slice(splitPoint).join('\n')
  };
}

// Enhanced matchup analysis using OpenAI Vision API
export async function processMatchupImage(imageFile: File): Promise<MatchupAnalysis> {
  try {
    const base64Image = await fileToBase64(imageFile);
    
    const response = await fetch('/api/analyze-screenshot', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: base64Image,
        mimeType: imageFile.type
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to analyze screenshot');
    }
    
    const analysis = await response.json();
    
    console.log('OpenAI Vision Analysis:', analysis);
    
    return {
      teamNames: analysis.teamNames || { your: "Your Team", opponent: "Opponent Team" },
      rosters: {
        your: analysis.yourRoster || cleanupRoster({}),
        opponent: analysis.opponentRoster || cleanupRoster({})
      },
      confidence: analysis.confidence || 90,
      rawText: analysis.rawAnalysis || 'AI Vision Analysis'
    };
  } catch (error) {
    console.error('AI Vision analysis failed:', error);
    
    // Fallback to basic extraction
    return {
      teamNames: { your: "Your Team", opponent: "Opponent Team" },
      rosters: { 
        your: cleanupRoster({}), 
        opponent: cleanupRoster({}) 
      },
      confidence: 0,
      rawText: 'Analysis failed'
    };
  }
}

// Legacy OCR function (keeping for fallback)
export async function processMatchupImageOCR(imageFile: File): Promise<MatchupAnalysis> {
  const worker = await createWorker('eng');
  
  try {
    await worker.setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,()/-\' '
    });
    
    const { data: { text, confidence } } = await worker.recognize(imageFile);
    
    console.log('Matchup OCR Raw Text:', text);
    console.log('Matchup OCR Confidence:', confidence);
    
    // Extract team names from the full text
    const teamNames = extractTeamNames(text);
    
    // Split the text into two team sections
    const { yourTeam, opponentTeam } = splitMatchupText(text);
    
    // Extract rosters for each team
    console.log('Your team text section:', yourTeam);
    console.log('Opponent team text section:', opponentTeam);
    
    const yourPartialRoster = extractPlayers(yourTeam);
    const opponentPartialRoster = extractPlayers(opponentTeam);
    
    console.log('Detected your roster:', yourPartialRoster);
    console.log('Detected opponent roster:', opponentPartialRoster);
    
    const yourRoster = cleanupRoster(yourPartialRoster);
    const opponentRoster = cleanupRoster(opponentPartialRoster);
    
    return {
      teamNames,
      rosters: { your: yourRoster, opponent: opponentRoster },
      confidence,
      rawText: text
    };
  } catch (error) {
    console.error('Matchup OCR processing failed:', error);
    
    // Fallback to basic extraction
    return {
      teamNames: { your: "Your Team", opponent: "Opponent Team" },
      rosters: { 
        your: cleanupRoster({}), 
        opponent: cleanupRoster({}) 
      },
      confidence: 0,
      rawText: ''
    };
  } finally {
    await worker.terminate();
  }
}

// Mock enhanced OCR that analyzes a full matchup screenshot
export function mockMatchupAnalysis(imageFile: File): Promise<MatchupAnalysis> {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Simulate analyzing a fantasy football matchup screenshot
      const mockTeamNames = {
        your: "Thunder Bolts",
        opponent: "Lightning Strikes"
      };
      
      const mockYourRoster: PlayerRoster = {
        QB: 'Josh Allen',
        RB: 'Derrick Henry', 
        WR1: 'Tyreek Hill',
        WR2: 'Davante Adams',
        TE: 'Travis Kelce',
        FLEX: 'Christian McCaffrey',
        K: 'Justin Tucker',
        DEF: 'Buffalo Bills'
      };
      
      const mockOpponentRoster: PlayerRoster = {
        QB: 'Aaron Rodgers',
        RB: 'Jonathan Taylor',
        WR1: 'Cooper Kupp', 
        WR2: 'Mike Evans',
        TE: 'George Kittle',
        FLEX: 'Alvin Kamara',
        K: 'Harrison Butker',
        DEF: 'Pittsburgh Steelers'
      };
      
      resolve({
        teamNames: mockTeamNames,
        rosters: { your: mockYourRoster, opponent: mockOpponentRoster },
        confidence: 90,
        rawText: 'Mock analysis of fantasy football matchup screenshot'
      });
    }, 3000); // Slightly longer since we're processing more data
  });
}
