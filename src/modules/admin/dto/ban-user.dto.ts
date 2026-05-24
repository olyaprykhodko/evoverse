import { IsDateString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class BanUserDto {
  @ApiPropertyOptional({
    example: '2026-12-31T23:59:59.000Z',
    description: 'ISO date string; omit for a permanent ban',
  })
  @IsOptional()
  @IsDateString()
  banEndAt?: string;
}
