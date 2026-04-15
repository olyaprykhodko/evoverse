import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

export class SignupDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsNumber()
  @Min(3)
  @Max(1024)
  storageLimit?: number;
}
