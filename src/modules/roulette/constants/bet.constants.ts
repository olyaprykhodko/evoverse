import { BetType } from '../entities/bet-entities.js';

export const PAYOUT_MULTIPLIERS: Record<BetType, number> = {
  [BetType.STRAIGHT]: 36,
  [BetType.RED]: 2,
  [BetType.BLACK]: 2,
  [BetType.EVEN]: 2,
  [BetType.ODD]: 2,
  [BetType.DOZEN]: 3,
};

export const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);
