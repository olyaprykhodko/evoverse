import { TABLE_IDS } from '../constants/room.constants.js';

export type TableId = (typeof TABLE_IDS)[number];

export interface RoomMeta {
  id: string;
  tableId: string;
  serverSeed: string;
  serverHash: string;
  roundNonce: number;
  phase: 'betting' | 'closed';
  createdAt: number;
}

export interface SpinResult {
  tableId: string;
  winningNumber: number;
  serverSeed: string;
  serverHash: string;

  clientSeed: string;
  roundNonce: number;
  totalBets: number;
}

export interface BetPlacedEvent {
  tableId: string;
  userId: number;
  username: string;
  betType: string;
  amount: number;
}

export interface PlayerInfo {
  userId: number;
  username: string;
}
