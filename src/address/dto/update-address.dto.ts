import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class UpdateAddressDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  lastName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{6,14}$/, { message: 'Invalid phone number' })
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  address2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  country?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  city?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(16)
  postalCode?: string;
}
