import type { Express } from "express";
import { createServer, type Server } from "http";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import { storage } from "./storage";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Load NFL player database
let nflPlayers: Array<{name: string, position: string, team: string}> = [];
try {
  const playersData = fs.readFileSync(path.join(__dirname, 'nfl_players.json'), 'utf8');
  nflPlayers = JSON.parse(playersData);
  console.log(`Loaded ${nflPlayers.length} NFL players for validation`);
} catch (error) {
  console.warn('Could not load NFL players database:', error);
}

// Enhanced fuzzy matching function for player name validation
function findBestPlayerMatch(detectedName: string, position?: string): string {
  if (!detectedName || detectedName.includes('Defense')) return detectedName;
  
  const normalizedDetected = detectedName.toLowerCase().replace(/[^a-z\s\.]/g, '').trim();
  let bestMatch = detectedName;
  let bestScore = 0;
  
  // Handle "First Initial. Last Name" pattern (e.g., "K. Walker")
  const initialLastPattern = /^([a-z])\.?\s+([a-z]+)$/i;
  const initialLastMatch = normalizedDetected.match(initialLastPattern);
  
  for (const player of nflPlayers) {
    const normalizedPlayer = player.name.toLowerCase().replace(/[^a-z\s]/g, '');
    const playerWords = normalizedPlayer.split(' ');
    let score = 0;
    
    // Position boost for matching positions
    const positionBonus = (position && player.position === position) ? 0.3 : 0;
    
    if (initialLastMatch) {
      // Handle "K. Walker" -> "Kenneth Walker III"
      const [, firstInitial, lastName] = initialLastMatch;
      const playerFirstInitial = playerWords[0]?.[0];
      
      // Check all player words for last name match (handles "Kenneth Walker III")
      let lastNameMatch = false;
      for (const playerWord of playerWords) {
        if (playerWord.toLowerCase().includes(lastName.toLowerCase()) || 
            lastName.toLowerCase().includes(playerWord.toLowerCase())) {
          lastNameMatch = true;
          break;
        }
      }
      
      if (playerFirstInitial === firstInitial && lastNameMatch) {
        score = 0.9 + positionBonus;
      }
    } else {
      // Handle full name matching
      const detectedWords = normalizedDetected.split(' ');
      let matchingWords = 0;
      
      for (const detectedWord of detectedWords) {
        if (detectedWord.length < 2) continue;
        
        for (const playerWord of playerWords) {
          if (playerWord.length < 2) continue;
          
          // Exact word match
          if (detectedWord === playerWord) {
            matchingWords += 1;
          }
          // Partial match (for nicknames/abbreviations)
          else if (detectedWord.length >= 3 && playerWord.includes(detectedWord)) {
            matchingWords += 0.8;
          }
          else if (playerWord.length >= 3 && detectedWord.includes(playerWord)) {
            matchingWords += 0.8;
          }
        }
      }
      
      score = (matchingWords / Math.max(detectedWords.length, playerWords.length)) + positionBonus;
    }
    
    if (score > bestScore && score > 0.5) {
      bestScore = score;
      bestMatch = player.name;
    }
  }
  
  console.log(`Player match: "${detectedName}" -> "${bestMatch}" (score: ${bestScore.toFixed(2)})`);
  return bestMatch;
}

// Simplified backend for roster screenshot demo
export async function registerRoutes(app: Express): Promise<Server> {
  
  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      message: "Roster screenshot demo is running"
    });
  });



  // OpenAI Vision analysis endpoint
  app.post("/api/analyze-screenshot", async (req, res) => {
    try {
      const { image, mimeType } = req.body;
      
      if (!image) {
        return res.status(400).json({ error: "No image provided" });
      }

      console.log("Analyzing screenshot with OpenAI Vision...");

      // Create position-aware player reference for better classification
      const playersByPosition = {
        QB: nflPlayers.filter(p => p.position === 'QB').slice(0, 15).map(p => p.name),
        RB: nflPlayers.filter(p => p.position === 'RB').slice(0, 20).map(p => p.name),
        WR: nflPlayers.filter(p => p.position === 'WR').slice(0, 25).map(p => p.name),
        TE: nflPlayers.filter(p => p.position === 'TE').slice(0, 15).map(p => p.name)
      };
      
      const positionGuide = `
**QUARTERBACK (QB):** ${playersByPosition.QB.join(', ')}
**RUNNING BACKS (RB):** ${playersByPosition.RB.join(', ')}
**WIDE RECEIVERS (WR):** ${playersByPosition.WR.join(', ')}
**TIGHT ENDS (TE):** ${playersByPosition.TE.join(', ')}

IMPORTANT POSITION CLASSIFICATION RULES:
- Joe Flacco, Trevor Lawrence, Drake Maye, Josh Allen = QB position
- Ashton Jeanty, Bucky Irving, Tony Pollard, Najee Harris, Kyren Williams = RB position  
- Jalen McMillan, Jayden Reed, Cedric Tillman, Amon-Ra St. Brown, Rashee Rice, Jakobi Meyers, Emeka Egbuka, Michael Pittman Jr. = WR position
- Kyle Pitts Sr., Colston Loveland, David Njoku = TE position
      `.trim();

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `You are an expert at analyzing fantasy football matchup screenshots. Extract team names and complete rosters for both teams. IMPORTANT: Detect the EXACT lineup structure shown in the screenshot - do not force a standard format.

${positionGuide}

SCREENSHOT CONTENT ANALYSIS:
- Look for team names at the top with "VS" between them
- Look for "STARTERS" keyword - roster data should only come from below this line
- Identify if this is a header screenshot (team names) or roster screenshot (player lineup)
- Ignore any players above the "STARTERS" section
- If this appears to be a continuation of a roster (starting with WRT/FLEX positions), classify as flex_section
- If this shows core positions (QB/RB/WR/TE), classify as starters_section
- Sequential roster screenshots should be treated as continuous lineup data

Return a JSON response that matches the EXACT lineup structure in the screenshot:
{
  "teamNames": {
    "your": "Team Name 1",
    "opponent": "Team Name 2"  
  },
  "yourRoster": {
    "QB": "Player Name", 
    "RB": "Player Name",
    "RB_2": "Player Name if second RB exists",
    "WR": "Player Name",
    "WR_2": "Player Name if second WR exists", 
    "WR_3": "Player Name if third WR exists",
    "TE": "Player Name",
    "WRT": "Player Name if WRT exists",
    "WRT_2": "Player Name if second WRT exists",
    "WRT_3": "Player Name if third WRT exists",
    "WRT_4": "Player Name if fourth WRT exists",
    "FLEX": "Player Name if FLEX exists",
    "K": "Player Name if kicker exists",
    "DEF": "Team Name if defense exists"
  },
  "opponentRoster": {
    "QB": "Player Name", 
    "RB": "Player Name",
    "RB_2": "Player Name if second RB exists",
    "WR": "Player Name",
    "WR_2": "Player Name if second WR exists", 
    "WR_3": "Player Name if third WR exists",
    "TE": "Player Name",
    "WRT": "Player Name if WRT exists",
    "WRT_2": "Player Name if second WRT exists",
    "WRT_3": "Player Name if third WRT exists",
    "WRT_4": "Player Name if fourth WRT exists",
    "FLEX": "Player Name if FLEX exists",
    "K": "Player Name if kicker exists",
    "DEF": "Team Name if defense exists"
  },
  "confidence": 95,
  "rawAnalysis": "Brief description of what you detected",
  "screenshotType": "header_with_starters|header_only|starters_section|flex_section"
}

CRITICAL RULES:
1. EXTRACT EVERY SINGLE PLAYER visible in the lineup - do not skip any players
2. Use position labels as shown but add _2, _3 for JSON keys when multiple same positions exist
3. ONLY extract roster data from below the "STARTERS" line if visible
4. Team names should be extracted from the header area with VS between them
5. Set screenshotType based on content: header_with_starters, header_only, starters_section, or flex_section
6. If screenshotType is flex_section or starters_section, set teamNames to empty strings - only header screenshots should provide team names
7. Clean up position labels - "P RB" should be "RB", "Q WR" should be "WR", remove prefix letters
8. Preserve the exact lineup format shown - different fantasy platforms use different position schemes
9. Match the screenshot layout exactly - do not impose standard NFL position logic
10. EXTRACT EVERY VISIBLE PLAYER FROM TOP TO BOTTOM - complete roster extraction is critical
11. For multiple same positions: QB, RB, RB_2, WR, WR_2, WRT, WRT_2, etc.
12. NEVER skip players - if you see 10+ players, extract all 10+ players`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this fantasy football matchup screenshot. Look for team names at the top (usually separated by 'VS'). For roster data, ONLY extract players listed under 'STARTERS' if that keyword is visible. If this appears to be just a header or just roster section, extract what's available. Classify the screenshot type and extract data accordingly."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType || 'image/jpeg'};base64,${image}`
                }
              }
            ]
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 1000
      });

      const analysis = JSON.parse(response.choices[0].message.content || '{}');
      
      console.log("OpenAI Vision Analysis Result:", analysis);

      // Validate and enhance player names using the comprehensive database
      if (analysis.yourRoster) {
        const validatedYourRoster: any = {};
        for (const [position, playerName] of Object.entries(analysis.yourRoster)) {
          if (playerName && playerName !== 'Not Available') {
            // Handle arrays (when AI returns multiple players for same position)
            if (Array.isArray(playerName)) {
              playerName.forEach((name, index) => {
                const posKey = index === 0 ? position : `${position}${index + 1}`;
                const positionKey = posKey.replace(/[0-9]/g, ''); // Remove numbers for matching
                const validatedName = findBestPlayerMatch(name as string, positionKey);
                if (validatedName && validatedName !== 'Not Available') {
                  validatedYourRoster[posKey] = validatedName;
                }
              });
            } else {
              const positionKey = position.replace(/[0-9]/g, ''); // Remove numbers (WR1 -> WR)
              const validatedName = findBestPlayerMatch(playerName as string, positionKey);
              if (validatedName && validatedName !== 'Not Available') {
                validatedYourRoster[position] = validatedName;
              }
            }
          }
        }
        analysis.yourRoster = validatedYourRoster;
      }

      if (analysis.opponentRoster) {
        const validatedOpponentRoster: any = {};
        for (const [position, playerName] of Object.entries(analysis.opponentRoster)) {
          if (playerName && playerName !== 'Not Available') {
            // Handle arrays (when AI returns multiple players for same position)
            if (Array.isArray(playerName)) {
              playerName.forEach((name, index) => {
                const posKey = index === 0 ? position : `${position}${index + 1}`;
                const positionKey = posKey.replace(/[0-9]/g, ''); // Remove numbers for matching
                const validatedName = findBestPlayerMatch(name as string, positionKey);
                if (validatedName && validatedName !== 'Not Available') {
                  validatedOpponentRoster[posKey] = validatedName;
                }
              });
            } else {
              const positionKey = position.replace(/[0-9]/g, ''); // Remove numbers (WR1 -> WR)
              const validatedName = findBestPlayerMatch(playerName as string, positionKey);
              if (validatedName && validatedName !== 'Not Available') {
                validatedOpponentRoster[position] = validatedName;
              }
            }
          }
        }
        analysis.opponentRoster = validatedOpponentRoster;
      }

      console.log("Validated Analysis Result:", analysis);

      res.json(analysis);
    } catch (error) {
      console.error("OpenAI Vision analysis error:", error);
      res.status(500).json({ 
        error: "Failed to analyze screenshot",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Simple endpoint to test roster data submission
  app.post("/api/roster-test", (req, res) => {
    const { teamName, opponentName, yourRoster, opponentRoster } = req.body;
    
    console.log("Received roster data:", {
      teamName,
      opponentName,
      yourRosterPlayers: yourRoster ? Object.keys(yourRoster).length : 0,
      opponentRosterPlayers: opponentRoster ? Object.keys(opponentRoster).length : 0
    });

    res.json({
      success: true,
      message: "Roster data received successfully",
      data: {
        teamName,
        opponentName,
        yourRosterCount: yourRoster ? Object.keys(yourRoster).length : 0,
        opponentRosterCount: opponentRoster ? Object.keys(opponentRoster).length : 0
      }
    });
  });

  // Song request submission endpoint
  app.post("/api/submit-song-request", (req, res) => {
    try {
      const { 
        email, 
        teamName, 
        opponentTeamName, 
        yourRoster, 
        opponentRoster, 
        genre, 
        tone, 
        vocalGender,
        smackTalkStyle, 
        timestamp 
      } = req.body;

      if (!email || !teamName || !opponentTeamName) {
        return res.status(400).json({ 
          error: "Missing required fields: email, teamName, or opponentTeamName" 
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ 
          error: "Invalid email format" 
        });
      }

      const submissionData = {
        id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        email: email.trim().toLowerCase(),
        teamName,
        opponentTeamName,
        yourRoster: yourRoster || [],
        opponentRoster: opponentRoster || [],
        genre: genre || 'rap',
        tone: tone || 'medium',
        vocalGender: vocalGender || 'male',
        smackTalkStyle: smackTalkStyle || 'casual_roast',
        timestamp: timestamp || new Date().toISOString(),
        status: 'submitted'
      };

      console.log("Song request submitted:", {
        id: submissionData.id,
        email: submissionData.email,
        teams: `${teamName} vs ${opponentTeamName}`,
        style: `${genre} • ${tone} • ${vocalGender} • ${smackTalkStyle}`,
        playerCount: (yourRoster?.length || 0) + (opponentRoster?.length || 0)
      });

      // In a real app, you would:
      // 1. Save to database
      // 2. Queue for processing
      // 3. Send confirmation email
      // For now, we'll just log and return success

      res.json({
        success: true,
        message: "Song request submitted successfully",
        requestId: submissionData.id
      });

    } catch (error) {
      console.error("Song request submission error:", error);
      res.status(500).json({ 
        error: "Failed to submit song request",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Authentication routes
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { username, email, password } = req.body;
      
      if (!username || !email || !password) {
        return res.status(400).json({ error: "Username, email, and password are required" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "User already exists with this email" });
      }

      // Create user (in real app, password would be hashed)
      const newUser = await storage.createUser({
        username,
        email,
        password, // Note: In production, this should be hashed
        googleId: undefined,
        profileImageUrl: undefined
      });

      // Don't return password in response
      const { password: _, ...userResponse } = newUser;
      
      res.json({
        success: true,
        user: userResponse
      });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ error: "Failed to create account" });
    }
  });

  app.post("/api/auth/signin", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user || user.password !== password) { // In production, use bcrypt.compare
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Don't return password in response
      const { password: _, ...userResponse } = user;
      
      res.json({
        success: true,
        user: userResponse
      });
    } catch (error) {
      console.error("Signin error:", error);
      res.status(500).json({ error: "Failed to sign in" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}