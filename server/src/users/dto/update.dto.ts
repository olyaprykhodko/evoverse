import { IsString, MinLength } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @MinLength(2)
  name?: string;

  @IsString()
  @MinLength(6)
  currentPassword?: string;

  @IsString()
  @MinLength(6)
  newPassword?: string;
}
