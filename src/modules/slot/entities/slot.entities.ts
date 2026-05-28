export interface SlotSession {
  serverSeed: string;
  serverHash: string;
  nonce: number;
}

export interface WinResult {
  multiplier: number;
  winType: '3oak' | '2oak' | null;
}
