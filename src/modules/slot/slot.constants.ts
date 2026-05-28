export enum SlotSymbol {
  LEMON = 'LEMON',
  CHERRY = 'CHERRY',
  GRAPE = 'GRAPE',
  BELL = 'BELL',
  BAR = 'BAR',
  SEVEN = 'SEVEN',
  DIAMOND = 'DIAMOND',
}

export const REEL_LENGTH = 31;

// Static reel strips extracted from slot model.xlsx
// Reels 1 & 2 are identical; Reel 3 is "tighter" (more rare symbols) for RTP control
export const REELS: SlotSymbol[][] = [
  // Reel 1
  [
    SlotSymbol.LEMON,
    SlotSymbol.LEMON,
    SlotSymbol.LEMON,
    SlotSymbol.LEMON,
    SlotSymbol.LEMON,
    SlotSymbol.LEMON,
    SlotSymbol.LEMON,
    SlotSymbol.LEMON,
    SlotSymbol.LEMON,
    SlotSymbol.LEMON,
    SlotSymbol.LEMON,
    SlotSymbol.LEMON,
    SlotSymbol.LEMON,
    SlotSymbol.LEMON,
    SlotSymbol.CHERRY,
    SlotSymbol.CHERRY,
    SlotSymbol.CHERRY,
    SlotSymbol.CHERRY,
    SlotSymbol.CHERRY,
    SlotSymbol.CHERRY,
    SlotSymbol.CHERRY,
    SlotSymbol.GRAPE,
    SlotSymbol.GRAPE,
    SlotSymbol.GRAPE,
    SlotSymbol.BELL,
    SlotSymbol.BELL,
    SlotSymbol.BAR,
    SlotSymbol.BAR,
    SlotSymbol.SEVEN,
    SlotSymbol.SEVEN,
    SlotSymbol.DIAMOND,
  ],
  // Reel 2 (identical to Reel 1)
  [
    SlotSymbol.LEMON,
    SlotSymbol.LEMON,
    SlotSymbol.LEMON,
    SlotSymbol.LEMON,
    SlotSymbol.LEMON,
    SlotSymbol.LEMON,
    SlotSymbol.LEMON,
    SlotSymbol.LEMON,
    SlotSymbol.LEMON,
    SlotSymbol.LEMON,
    SlotSymbol.LEMON,
    SlotSymbol.LEMON,
    SlotSymbol.LEMON,
    SlotSymbol.LEMON,
    SlotSymbol.CHERRY,
    SlotSymbol.CHERRY,
    SlotSymbol.CHERRY,
    SlotSymbol.CHERRY,
    SlotSymbol.CHERRY,
    SlotSymbol.CHERRY,
    SlotSymbol.CHERRY,
    SlotSymbol.GRAPE,
    SlotSymbol.GRAPE,
    SlotSymbol.GRAPE,
    SlotSymbol.BELL,
    SlotSymbol.BELL,
    SlotSymbol.BAR,
    SlotSymbol.BAR,
    SlotSymbol.SEVEN,
    SlotSymbol.SEVEN,
    SlotSymbol.DIAMOND,
  ],
  // Reel 3 — more rare symbols to control RTP
  [
    SlotSymbol.LEMON,
    SlotSymbol.LEMON,
    SlotSymbol.LEMON,
    SlotSymbol.LEMON,
    SlotSymbol.LEMON,
    SlotSymbol.CHERRY,
    SlotSymbol.CHERRY,
    SlotSymbol.CHERRY,
    SlotSymbol.CHERRY,
    SlotSymbol.CHERRY,
    SlotSymbol.CHERRY,
    SlotSymbol.CHERRY,
    SlotSymbol.GRAPE,
    SlotSymbol.GRAPE,
    SlotSymbol.GRAPE,
    SlotSymbol.GRAPE,
    SlotSymbol.GRAPE,
    SlotSymbol.BELL,
    SlotSymbol.BELL,
    SlotSymbol.BELL,
    SlotSymbol.BELL,
    SlotSymbol.BELL,
    SlotSymbol.BAR,
    SlotSymbol.BAR,
    SlotSymbol.BAR,
    SlotSymbol.BAR,
    SlotSymbol.SEVEN,
    SlotSymbol.SEVEN,
    SlotSymbol.SEVEN,
    SlotSymbol.DIAMOND,
    SlotSymbol.DIAMOND,
  ],
];

// 3-of-a-kind payout multipliers (source: slot model.xlsx)
export const PAYTABLE_3OAK: Record<SlotSymbol, number> = {
  [SlotSymbol.LEMON]: 14,
  [SlotSymbol.CHERRY]: 16,
  [SlotSymbol.GRAPE]: 20,
  [SlotSymbol.BELL]: 30,
  [SlotSymbol.BAR]: 60,
  [SlotSymbol.SEVEN]: 100,
  [SlotSymbol.DIAMOND]: 150,
};

// 2-of-a-kind payout multipliers (left-to-right: sym1 === sym2)
export const PAYTABLE_2OAK: Record<SlotSymbol, number> = {
  [SlotSymbol.LEMON]: 0.6,
  [SlotSymbol.CHERRY]: 0.8,
  [SlotSymbol.GRAPE]: 1.5,
  [SlotSymbol.BELL]: 2.5,
  [SlotSymbol.BAR]: 3,
  [SlotSymbol.SEVEN]: 6,
  [SlotSymbol.DIAMOND]: 10,
};

// Payouts match paytable exactly; theoretical RTP ~95.58%
export const SCALING_FACTOR = 1;

// Redis session TTL: 24 hours
export const SLOT_SESSION_TTL = 60 * 60 * 24;
