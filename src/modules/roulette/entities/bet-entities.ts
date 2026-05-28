export enum BetType {
  STRAIGHT = 'STRAIGHT',
  RED = 'RED',
  BLACK = 'BLACK',
  EVEN = 'EVEN',
  ODD = 'ODD',
  DOZEN = 'DOZEN',
}

export interface Bet {
  userId: number;
  username: string;
  clientSeed: string;
  type: BetType;
  targetNumber?: number;
  amount: number;
  placedAt: number;
}
