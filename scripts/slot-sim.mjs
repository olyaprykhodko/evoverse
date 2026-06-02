// Standalone Monte-Carlo RTP simulator for the 5-reel slot math model.
// Run: node scripts/slot-sim.mjs [spins]
//
// RTP identity: bet is split evenly across the 5 active paylines
// (betPerLine = bet/5), so by linearity of expectation
//   RTP = E[total payout]/bet = E[multiplier of a single line].
// We therefore measure per-line outcomes (5 samples per spin) for RTP,
// and per-spin outcomes for hit frequency.

const SYMBOLS = ['LEMON', 'CHERRY', 'GRAPE', 'BELL', 'BAR', 'SEVEN', 'DIAMOND'];
const WILD = 'WILD';

// ── Reel strip composition (counts per reel, length 32) ──────────────────────
// Same distribution on every reel. Rarer symbol => higher paytable.
const COUNTS = {
  LEMON: 7, CHERRY: 6, GRAPE: 5, BELL: 4, BAR: 4, SEVEN: 3, DIAMOND: 2, WILD: 1,
};

function buildStrip() {
  // Interleave so identical symbols are spread out (affects line correlation /
  // hit frequency, not RTP). Deterministic shuffle for reproducibility.
  const bag = [];
  for (const [sym, n] of Object.entries(COUNTS)) for (let i = 0; i < n; i++) bag.push(sym);
  // simple deterministic interleave by sorting on a hash
  bag.sort((a, b) => (hash(a + bag.indexOf(a)) - hash(b + bag.indexOf(b))));
  return bag;
}
function hash(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

const STRIP_LEN = 32;
const REELS = Array.from({ length: 5 }, () => {
  // independent pseudo-shuffle per reel
  const s = buildStrip();
  for (let i = s.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [s[i], s[j]] = [s[j], s[i]]; }
  return s;
});

// ── Paylines (row index per reel; 0=top,1=mid,2=bottom) ──────────────────────
const PAYLINES = [
  [1, 1, 1, 1, 1], // center
  [0, 0, 0, 0, 0], // top
  [2, 2, 2, 2, 2], // bottom
  [2, 1, 0, 1, 2], // triangle (peak up)
  [0, 1, 2, 1, 0], // inverted triangle (valley)
];

// ── Paytable: symbol -> { 3, 4, 5 } multiplier (per line, on betPerLine) ─────
const PAYTABLE = {
  LEMON:   { 3: 6,   4: 15,  5: 45 },
  CHERRY:  { 3: 8,   4: 25,  5: 75 },
  GRAPE:   { 3: 12,  4: 40,  5: 120 },
  BELL:    { 3: 18,  4: 60,  5: 240 },
  BAR:     { 3: 25,  4: 90,  5: 360 },
  SEVEN:   { 3: 45,  4: 180, 5: 750 },
  DIAMOND: { 3: 90,  4: 450, 5: 1800 },
};

// Evaluate one line (left-to-right, WILD substitutes, WILD pays nothing alone).
function evalLine(syms) {
  let target = null;
  for (let i = 0; i < 5; i++) { if (syms[i] !== WILD) { target = syms[i]; break; } }
  if (target === null) return { count: 5, symbol: null }; // all wild
  let count = 0;
  for (let i = 0; i < 5; i++) {
    if (syms[i] === target || syms[i] === WILD) count++;
    else break;
  }
  return { count, symbol: target };
}

const spins = Number(process.argv[2]) || 5_000_000;

let totalBet = 0, totalPay = 0, winningSpins = 0;
const tierCount = {}; // `${sym}-${tier}` -> occurrences across lines
const BET = 100, betPerLine = BET / 5;

for (let n = 0; n < spins; n++) {
  // grid[reel][row]
  const grid = REELS.map((reel) => {
    const stop = Math.floor(Math.random() * STRIP_LEN);
    return [reel[stop], reel[(stop + 1) % STRIP_LEN], reel[(stop + 2) % STRIP_LEN]];
  });

  let spinPay = 0;
  for (const line of PAYLINES) {
    const syms = line.map((row, reel) => grid[reel][row]);
    const { count, symbol } = evalLine(syms);
    if (symbol && count >= 3) {
      const m = PAYTABLE[symbol]?.[count] || 0;
      if (m > 0) {
        spinPay += betPerLine * m;
        tierCount[`${symbol}-${count}`] = (tierCount[`${symbol}-${count}`] || 0) + 1;
      }
    }
  }
  totalBet += BET;
  totalPay += spinPay;
  if (spinPay > 0) winningSpins++;
}

console.log(`spins:        ${spins.toLocaleString()}`);
console.log(`RTP:          ${((totalPay / totalBet) * 100).toFixed(2)}%`);
console.log(`hit freq:     ${((winningSpins / spins) * 100).toFixed(2)}%  (>=1 winning line)`);
console.log(`avg lines/win contribution per spin (RTP = E[line mult]):`);
console.log('\nTier hit rate per 5-line spin (×10^-4):');
for (const sym of SYMBOLS) {
  const row = [3, 4, 5].map((t) => {
    const c = tierCount[`${sym}-${t}`] || 0;
    return `${t}:${((c / spins) * 1e4).toFixed(1)}`;
  });
  console.log(`  ${sym.padEnd(8)} ${row.join('  ')}`);
}
