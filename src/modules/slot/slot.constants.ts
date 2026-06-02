export enum SlotSymbol {
  LEMON = 'LEMON',
  CHERRY = 'CHERRY',
  GRAPE = 'GRAPE',
  BELL = 'BELL',
  BAR = 'BAR',
  SEVEN = 'SEVEN',
  DIAMOND = 'DIAMOND',
  WILD = 'WILD', // substitutes for any symbol; pays nothing on its own
}

export const REEL_COUNT = 5;
export const ROW_COUNT = 3;
export const REEL_LENGTH = 32;

const { LEMON, CHERRY, GRAPE, BELL, BAR, SEVEN, DIAMOND, WILD } = SlotSymbol;

// Fixed reel strips — 5 reels × 32 positions.
// Per-reel composition is identical (LEMON 7, CHERRY 6, GRAPE 5, BELL 4,
// BAR 4, SEVEN 3, DIAMOND 2, WILD 1) which fixes the RTP at ~95.2%
// (measured over 20M spins, see scripts/slot-sim.mjs). Only the ORDER differs
// per reel — order has no effect on RTP, only on visual clustering.
export const REELS: SlotSymbol[][] = [
  [CHERRY, GRAPE, BELL, BAR, SEVEN, DIAMOND, WILD, LEMON, CHERRY, GRAPE, BELL, BAR, SEVEN, DIAMOND, LEMON, CHERRY, GRAPE, BELL, BAR, SEVEN, LEMON, CHERRY, GRAPE, BELL, BAR, LEMON, CHERRY, GRAPE, LEMON, CHERRY, LEMON, LEMON],
  [BAR, SEVEN, DIAMOND, WILD, LEMON, CHERRY, GRAPE, BELL, BAR, SEVEN, DIAMOND, LEMON, CHERRY, GRAPE, BELL, BAR, SEVEN, LEMON, CHERRY, GRAPE, BELL, BAR, LEMON, CHERRY, GRAPE, BELL, LEMON, CHERRY, GRAPE, LEMON, CHERRY, LEMON],
  [WILD, LEMON, CHERRY, GRAPE, BELL, BAR, SEVEN, DIAMOND, LEMON, CHERRY, GRAPE, BELL, BAR, SEVEN, DIAMOND, LEMON, CHERRY, GRAPE, BELL, BAR, SEVEN, LEMON, CHERRY, GRAPE, BELL, BAR, LEMON, CHERRY, GRAPE, LEMON, CHERRY, LEMON],
  [GRAPE, BELL, BAR, SEVEN, DIAMOND, WILD, LEMON, CHERRY, GRAPE, BELL, BAR, SEVEN, DIAMOND, LEMON, CHERRY, GRAPE, BELL, BAR, SEVEN, LEMON, CHERRY, GRAPE, BELL, BAR, LEMON, CHERRY, GRAPE, LEMON, CHERRY, LEMON, CHERRY, LEMON],
  [SEVEN, DIAMOND, WILD, LEMON, CHERRY, GRAPE, BELL, BAR, SEVEN, DIAMOND, LEMON, CHERRY, GRAPE, BELL, BAR, SEVEN, LEMON, CHERRY, GRAPE, BELL, BAR, LEMON, CHERRY, GRAPE, BELL, BAR, LEMON, CHERRY, GRAPE, LEMON, CHERRY, LEMON],
];

// Paylines: row index (0=top, 1=middle, 2=bottom) per reel, left to right.
// Matches the agreed scheme: 3 straight rows + triangle + inverted triangle.
export const PAYLINES: ReadonlyArray<readonly [number, number, number, number, number]> = [
  [1, 1, 1, 1, 1], // 1 — center row
  [0, 0, 0, 0, 0], // 2 — top row
  [2, 2, 2, 2, 2], // 3 — bottom row
  [2, 1, 0, 1, 2], // 4 — triangle (peak up)
  [0, 1, 2, 1, 0], // 5 — inverted triangle (valley)
];

export const LINE_COUNT = PAYLINES.length;

// Paytable: symbol -> matches-in-a-row (left to right) -> multiplier on the
// per-line bet (bet / LINE_COUNT). Rarer symbols pay more. Tuned for ~95% RTP.
export const PAYTABLE: Record<
  Exclude<SlotSymbol, SlotSymbol.WILD>,
  Record<number, number>
> = {
  [LEMON]:   { 3: 6,  4: 15,  5: 45 },
  [CHERRY]:  { 3: 8,  4: 25,  5: 75 },
  [GRAPE]:   { 3: 12, 4: 40,  5: 120 },
  [BELL]:    { 3: 18, 4: 60,  5: 240 },
  [BAR]:     { 3: 25, 4: 90,  5: 360 },
  [SEVEN]:   { 3: 45, 4: 180, 5: 750 },
  [DIAMOND]: { 3: 90, 4: 450, 5: 1800 },
};

export const SCALING_FACTOR = 1;

export const SLOT_SESSION_TTL = 60 * 60 * 24;
