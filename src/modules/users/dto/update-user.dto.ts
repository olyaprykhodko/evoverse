import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'user_1', minLength: 3, maxLength: 32 })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  username?: string;

  @ApiPropertyOptional({ example: 'user@evoverse.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'NewPass1234', minLength: 8, maxLength: 64 })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'Password must contain uppercase, lowercase letters, and numbers',
  })
  password?: string;

  @ApiPropertyOptional({ example: 'hero_1.png' })
  @IsOptional()
  @IsString()
  avatar?: string;
}
