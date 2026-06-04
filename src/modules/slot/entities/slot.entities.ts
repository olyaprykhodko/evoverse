import { SlotSymbol } from '../slot.constants.js';

export interface SlotSession {
  serverSeed: string;
  serverHash: string;
  nonce: number;
}

export interface LineWin {
  line: number;
  symbol: SlotSymbol;
  count: number;
  multiplier: number;
}

export interface SpinEvaluation {
  wins: LineWin[];
  totalMultiplier: number;
}
