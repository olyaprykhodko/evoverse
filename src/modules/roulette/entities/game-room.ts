import type { BetType } from './bet-types.js';

export interface RoomMeta {
  id: string;
  serverSeed: string;
  serverHash: string;
  roundNonce: number;
  phase: 'betting' | 'closed';
  createdAt: number;
}

export interface RoomBet {
  userId: number;
  clientSeed: string;
  type: BetType;
  targetNumber?: number;
  amount: number;
  placedAt: number;
}
