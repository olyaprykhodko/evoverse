import {
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SpinDto {
  @ApiProperty({
    example: 10,
    description: 'Bet amount in Glow Coins',
    minimum: 1,
    maximum: 10000,
  })
  @IsInt()
  @Min(1)
  @Max(10000)
  bet: number;

  @ApiProperty({
    example: 'my-lucky-seed-42',
    description: 'Client-provided seed for provably fair RNG',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  clientSeed: string;
}
