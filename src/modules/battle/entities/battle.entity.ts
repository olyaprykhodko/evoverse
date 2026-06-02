// Shared types for the real-time battle module (queue, rounds, move results).

export type Zone = 'head' | 'body' | 'legs';

export interface ZoneMove {
  attackZone: Zone | null;
  defenseZone: Zone | null;
}

export interface BattleRound {
  round: number;
  move1: ZoneMove;
  move2: ZoneMove;
  damageTo1: number;
  damageTo2: number;
  hp1After: number;
  hp2After: number;
}

export interface QueueEntry {
  userId: number;
  socketId: string;
  weaponId: number;
}

export interface MatchedPayload {
  battleId: string;
  player1Id: number;
  opponentId: number;
  opponentUsername: string | null;
  opponentAvatar: string | null;
  opponentWeapon: {
    id: number;
    name: string;
    rarity: string;
    minDamage: number;
    maxDamage: number;
  };
  roundEndsAt: number;
}

export interface MatchResult {
  battleId: string;
  p1: { socketId: string; payload: MatchedPayload };
  p2: { socketId: string; payload: MatchedPayload };
}

export interface ResolvedRound {
  status: 'resolved';
  round: BattleRound;
  finished: boolean;
  winnerId?: number;
  nextRound?: number;
  roundEndsAt?: number;
}
export type Weapon = { minDamage: number; maxDamage: number };
export type SubmitMoveResult = { status: 'waiting' } | ResolvedRound;
