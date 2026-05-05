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
import { BetType } from '../entities/bet-types.js';

export class PlaceBetDto {
  @IsUUID()
  sessionId: string;

  @IsEnum(BetType)
  type: BetType;

  @ValidateIf(
    (o: PlaceBetDto) => o.type === BetType.STRAIGHT || o.type === BetType.DOZEN,
  )
  @IsInt()
  @Min(0)
  @Max(36)
  @Type(() => Number)
  targetNumber?: number;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  amount: number;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  clientSeed: string;
}
