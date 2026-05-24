import { IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PaymentDto {
  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(1)
  amount: number;
}
