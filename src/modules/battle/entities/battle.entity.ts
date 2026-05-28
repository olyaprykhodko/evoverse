export interface BattleRound {
  round: number;
  attackerId: number;
  defenderId: number;
  damage: number;
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
  yourTurn: boolean;
}

export interface MatchResult {
  battleId: string;
  p1: { socketId: string; payload: MatchedPayload };
  p2: { socketId: string; payload: MatchedPayload };
}
