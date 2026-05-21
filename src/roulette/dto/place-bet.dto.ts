import {
  IsEnum,
  IsInt,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BetType } from '../entities/bet-types.js';

export class PlaceBetDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  sessionId: string;

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
      'Required for STRAIGHT (0–36) and DOZEN (1 = 1–12, 2 = 13–24, 3 = 25–36)',
  })
  @ValidateIf(
    (o: PlaceBetDto) => o.type === BetType.STRAIGHT || o.type === BetType.DOZEN,
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

  @ApiProperty({ example: 'my-lucky-seed-42', minLength: 1, maxLength: 128 })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  clientSeed: string;
}
