import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BetType } from '../entities/bet-entities.js';

export class PlaceRoomBetDto {
  @ApiPropertyOptional({
    example: 'table-1',
    description: 'Table ID to place the bet on (default: table-1)',
  })
  @IsOptional()
  @IsString()
  tableId?: string = 'table-1';

  @ApiProperty({ example: 'my-lucky-seed-2026', minLength: 8, maxLength: 64 })
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  clientSeed: string;

  @ApiProperty({ enum: BetType, example: BetType.RED })
  @IsEnum(BetType)
  type: BetType;

  @ApiPropertyOptional({ example: 7, minimum: 0, maximum: 36 })
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
    description: 'Bet amount in Glow Coins',
  })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  amount: number;
}
