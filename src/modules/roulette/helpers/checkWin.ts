import { BetType } from '../entities/bet-entities.js';
import { RED_NUMBERS } from '../constants/bet.constants.js';

export function checkWin(
  type: BetType,
  winningNumber: number,
  targetNumber?: number,
): boolean {
  if (winningNumber === 0) {
    return type === BetType.STRAIGHT && targetNumber === 0;
  }
  switch (type) {
    case BetType.STRAIGHT:
      return winningNumber === targetNumber;
    case BetType.RED:
      return RED_NUMBERS.has(winningNumber);
    case BetType.BLACK:
      return !RED_NUMBERS.has(winningNumber);
    case BetType.EVEN:
      return winningNumber % 2 === 0;
    case BetType.ODD:
      return winningNumber % 2 !== 0;
    case BetType.DOZEN:
      if (targetNumber === 1) return winningNumber >= 1 && winningNumber <= 12;
      if (targetNumber === 2) return winningNumber >= 13 && winningNumber <= 24;
      if (targetNumber === 3) return winningNumber >= 25 && winningNumber <= 36;
      return false;
  }
}
