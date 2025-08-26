import type { PlayerRoster, Genre, Tone, Persona, RatingMode } from '@shared/schema';

interface LyricsInput {
  teamName: string;
  opponentTeamName: string;
  yourRoster: PlayerRoster;
  opponentRoster: PlayerRoster;
  genre: Genre;
  tone: Tone;
  persona: Persona;
  ratingMode: RatingMode;
}

// Template variations by genre
const GENRE_STYLES = {
  country: {
    intro: "Well howdy y'all, {teamName} ridin' in",
    verse: "{player} takes the field like a rodeo king",
    hook: "{teamName}! {teamName}! Gonna rope 'em up tight"
  },
  rap: {
    intro: "Yo, {teamName} in the house, bout to bring the heat",
    verse: "{player} on the grind, make the competition retreat",
    hook: "{teamName} on top, we don't ever miss a beat"
  },
  electronic: {
    intro: "System loading, {teamName} activated",
    verse: "{player} in the zone, fully concentrated",
    hook: "Beat drop, {teamName}, we're elevated"
  },
  pop: {
    intro: "Turn it up, {teamName} here to play",
    verse: "{player} shining bright like a superstar today",
    hook: "{teamName}, {teamName}, gonna win this game!"
  },
  blues: {
    intro: "Got them {opponentTeamName} blues, {teamName} here to play",
    verse: "{player} got that magic, gonna chase your blues away",
    hook: "Sing it loud, {teamName}, this is our day"
  },
  funk: {
    intro: "Get on up, {teamName} got that funky flow",
    verse: "{player} brings the groove, put on quite a show",
    hook: "Funk it up, {teamName}, let the good times roll"
  },
  rnb: {
    intro: "Smooth like silk, {teamName} here tonight",
    verse: "{player} got that soul, everything's alright",
    hook: "Oh yeah, {teamName}, we're reaching new heights"
  },
  gospel: {
    intro: "Hallelujah, {teamName} blessed to play",
    verse: "{player} got that spirit, leading us the way",
    hook: "Praise the game, {teamName}, this is our day"
  }
};

// Tone intensity modifiers
const TONE_MODIFIERS = {
  mild: {
    adjectives: ['good', 'solid', 'decent', 'nice'],
    verbs: ['plays well', 'does good', 'tries hard', 'competes'],
    endings: ['Good game coming up', 'May the best team win', 'See you on the field']
  },
  medium: {
    adjectives: ['strong', 'tough', 'skilled', 'competitive'],
    verbs: ['dominates', 'crushes', 'outplays', 'defeats'],
    endings: ['Bring your A-game', 'Time to settle this', 'Game on!']
  },
  savage: {
    adjectives: ['unstoppable', 'legendary', 'elite', 'ruthless'],
    verbs: ['destroys', 'demolishes', 'annihilates', 'obliterates'],
    endings: ['No mercy given', 'Prepare for defeat', 'Domination incoming']
  }
};

// Position-specific lines
const POSITION_LINES = {
  QB: {
    mild: "{player} throws with precision",
    medium: "{player} commands the field",
    savage: "{player} is surgical with those passes"
  },
  RB: {
    mild: "{player} runs through the gaps",
    medium: "{player} breaks through the line",
    savage: "{player} tramples the defense"
  },
  WR1: {
    mild: "{player} catches passes clean",
    medium: "{player} burns the secondary",
    savage: "{player} leaves defenders in the dust"
  },
  WR2: {
    mild: "{player} finds the open space",
    medium: "{player} makes clutch catches",
    savage: "{player} torches every corner"
  },
  TE: {
    mild: "{player} reliable in the middle",
    medium: "{player} splits the seams wide",
    savage: "{player} unstoppable over the middle"
  },
  FLEX: {
    mild: "{player} adds versatility",
    medium: "{player} brings the extra punch",
    savage: "{player} is the ultimate weapon"
  },
  K: {
    mild: "{player} kicks them through",
    medium: "{player} splits the uprights",
    savage: "{player} never misses when it counts"
  },
  DEF: {
    mild: "{player} plays solid defense",
    medium: "{player} shuts down the offense",
    savage: "{player} creates chaos and mayhem"
  }
};

function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function buildLyricsPrompt(input: LyricsInput): string {
  const { teamName, opponentTeamName, yourRoster, opponentRoster, genre, tone, persona, ratingMode } = input;
  
  const style = GENRE_STYLES[genre];
  const toneData = TONE_MODIFIERS[tone];
  
  // Build intro
  const intro = style.intro
    .replace('{teamName}', teamName)
    .replace('{opponentTeamName}', opponentTeamName);
  
  // Build your team verse
  const yourPositions = Object.keys(yourRoster) as (keyof PlayerRoster)[];
  const yourLines = yourPositions.map(pos => {
    const player = yourRoster[pos];
    const line = POSITION_LINES[pos][tone].replace('{player}', player);
    return line;
  });
  
  // Build opponent verse (more critical)
  const oppPositions = Object.keys(opponentRoster) as (keyof PlayerRoster)[];
  const oppLines = oppPositions.map(pos => {
    const player = opponentRoster[pos];
    const criticalTone = tone === 'mild' ? 'mild' : tone === 'medium' ? 'medium' : 'savage';
    let line = POSITION_LINES[pos][criticalTone].replace('{player}', player);
    
    // Make it more critical for opponent
    if (tone !== 'mild') {
      line = line.replace('commands', 'struggles to command')
               .replace('burns', 'tries to burn')
               .replace('breaks through', 'gets stopped at')
               .replace('dominates', 'hopes to compete')
               .replace('demolishes', 'barely challenges');
    }
    
    return line;
  });
  
  // Build hook
  const hook = style.hook
    .replace('{teamName}', teamName)
    .replace('{opponentTeamName}', opponentTeamName);
  
  // Combine all parts
  const lyrics = [
    '[Intro]',
    intro,
    '',
    '[Verse 1 - Our Champions]',
    ...yourLines.slice(0, 4),
    '',
    '[Hook]',
    hook,
    `${opponentTeamName}, prepare for the fight!`,
    '',
    '[Verse 2 - Their Struggle]',
    ...oppLines.slice(0, 4),
    '',
    '[Bridge]',
    `When the dust settles and the game is done,`,
    `${teamName} stands tall, we're second to none!`,
    '',
    '[Outro]',
    getRandomItem(toneData.endings),
    `${teamName} victory, loud and clear!`
  ].join('\n');
  
  return lyrics;
}

export function generateLyrics(input: LyricsInput): string {
  return buildLyricsPrompt(input);
}

// Content filtering
const BANNED_WORDS = [
  // Add actual banned words/slurs here
  'injury', 'hurt', 'damage', 'harm'
];

export function filterContent(lyrics: string, ratingMode: RatingMode): string {
  let filtered = lyrics;
  
  // Remove banned words
  BANNED_WORDS.forEach(word => {
    const regex = new RegExp(word, 'gi');
    filtered = filtered.replace(regex, '[FILTERED]');
  });
  
  // Handle profanity based on rating
  if (ratingMode === 'PG') {
    // Replace mild profanity with cleaner alternatives
    filtered = filtered.replace(/damn/gi, 'darn')
                     .replace(/hell/gi, 'heck')
                     .replace(/crap/gi, 'crud');
  }
  
  return filtered;
}
