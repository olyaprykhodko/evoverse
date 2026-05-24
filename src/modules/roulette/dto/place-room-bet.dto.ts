import {
  IsEnum,
  IsInt,
  IsString,
  Max,
  Min,
  MinLength,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BetType } from '../entities/bet-types.js';

export class PlaceRoomBetDto {
  @ApiProperty({
    example: 'my-lucky-seed-2026',
    minLength: 8,
    maxLength: 64,
    description:
      "Player's own client seed — stored with the bet for personal provably-fair verification after the round. Does not affect the winning number.",
  })
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  clientSeed: string;

  @ApiProperty({
    enum: BetType,
    example: BetType.RED,
    description: 'Bet type: STRAIGHT, RED, BLACK, EVEN, ODD, DOZEN',
  })
  @IsEnum(BetType)
  type: BetType;

  @ApiPropertyOptional({
    example: 7,
    minimum: 0,
    maximum: 36,
    description:
      'Required for STRAIGHT (0–36) and DOZEN (1 = 1–12, 2 = 13–24, 3 = 25–36)',
  })
  @ValidateIf(
    (o: PlaceRoomBetDto) =>
      o.type === BetType.STRAIGHT || o.type === BetType.DOZEN,
  )
  @IsInt()
  @Min(0)
  @Max(36)
  @Type(() => Number)
  targetNumber?: number;

  @ApiProperty({
    example: 100,
    minimum: 1,
    description: 'Bet amount in game coins',
  })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  amount: number;
}
