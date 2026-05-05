import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'user@evoverse.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'dbJQxDhn3ao9' })
  @IsString()
  @MinLength(8)
  password: string;
}
