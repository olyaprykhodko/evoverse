import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';

export class CreateSessionDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  clientSeed?: string;
}
