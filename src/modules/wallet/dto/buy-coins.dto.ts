import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class BuyCoinsDto {
  @ApiProperty({
    description: 'Amount of USD to convert into in-game coins. Minimum 1.',
    example: 50,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  amount: number;
}
