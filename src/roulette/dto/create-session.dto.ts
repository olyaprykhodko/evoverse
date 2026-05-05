import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSessionDto {
  @ApiPropertyOptional({
    example: 'my-lucky-seed-42',
    description: 'Optional client seed; server generates one if omitted',
    minLength: 1,
    maxLength: 128,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  clientSeed?: string;
}
