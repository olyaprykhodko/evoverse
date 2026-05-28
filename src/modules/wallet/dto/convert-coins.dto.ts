import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class ConvertCoinsDto {
  @ApiProperty({
    example: 3,
    description: 'Number of coins to convert to USD balance (1 coin = $1)',
  })
  @IsInt()
  @Min(1)
  amount: number;
}
