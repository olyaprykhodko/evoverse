import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class DepositDto {
  @ApiProperty({
    description: 'Amount to deposit (integer coins). Minimum 1.',
    example: 500,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  amount: number;

  @ApiProperty({
    description:
      'Client-generated UUID v4 for idempotency. Reuse on retries to avoid double deposits.',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    format: 'uuid',
  })
  @IsUUID('4')
  idempotencyKey: string;

  @ApiPropertyOptional({
    description: 'Human-readable reason for the deposit.',
    example: 'Top-up via credit card',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
