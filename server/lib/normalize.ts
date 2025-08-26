import crypto from 'crypto';
import type { PlayerRoster, Genre, Tone, Persona, RatingMode } from '@shared/schema';

interface NormalizeInput {
  teamName: string;
  opponentTeamName: string;
  yourRosterRaw: PlayerRoster;
  opponentRosterRaw: PlayerRoster;
  genre: Genre;
  tone: Tone;
  persona: Persona;
  ratingMode: RatingMode;
}

interface NormalizedData {
  teamName: string;
  opponentTeamName: string;
  yourRoster: PlayerRoster;
  opponentRoster: PlayerRoster;
  genre: Genre;
  tone: Tone;
  persona: Persona;
  ratingMode: RatingMode;
}

function normalizeString(str: string): string {
  return str.trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizePlayerName(name: string): string {
  return name.trim().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');
}

function normalizeRoster(roster: PlayerRoster): PlayerRoster {
  const positions = ['QB', 'RB', 'WR1', 'WR2', 'TE', 'FLEX', 'K', 'DEF'] as const;
  const normalized: PlayerRoster = {} as PlayerRoster;
  
  positions.forEach(pos => {
    normalized[pos] = normalizePlayerName(roster[pos] || '');
  });
  
  return normalized;
}

export function normalizeInputs(payload: NormalizeInput): { normalized: NormalizedData; hash: string } {
  const normalized: NormalizedData = {
    teamName: normalizeString(payload.teamName),
    opponentTeamName: normalizeString(payload.opponentTeamName),
    yourRoster: normalizeRoster(payload.yourRosterRaw),
    opponentRoster: normalizeRoster(payload.opponentRosterRaw),
    genre: payload.genre,
    tone: payload.tone,
    persona: payload.persona,
    ratingMode: payload.ratingMode,
  };
  
  // Create deterministic hash for caching
  const hashData = {
    teamName: normalized.teamName,
    opponentTeamName: normalized.opponentTeamName,
    yourRoster: normalized.yourRoster,
    opponentRoster: normalized.opponentRoster,
    genre: normalized.genre,
    tone: normalized.tone,
    persona: normalized.persona,
    ratingMode: normalized.ratingMode,
  };
  
  const hashString = JSON.stringify(hashData, Object.keys(hashData).sort());
  const hash = crypto.createHash('sha256').update(hashString).digest('hex');
  
  return { normalized, hash };
}
