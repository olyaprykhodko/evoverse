import { SlotSymbol } from '../slot.constants.js';

export interface SlotSession {
  serverSeed: string;
  serverHash: string;
  nonce: number;
}

export interface LineWin {
  line: number; // 1-based payline id (index into PAYLINES + 1)
  symbol: SlotSymbol; // winning symbol (never WILD)
  count: number; // matched symbols in a row, left to right (3..5)
  multiplier: number; // paytable multiplier for this line
}

export interface SpinEvaluation {
  wins: LineWin[];
  totalMultiplier: number; // sum of all line multipliers
}
