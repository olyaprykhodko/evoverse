import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class CreateAddressDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  firstName: string;

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  lastName: string;

  @IsString()
  @Matches(/^\+?[1-9]\d{6,14}$/, { message: 'Invalid phone number' })
  phoneNumber: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  address: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  address2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  country?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  city: string;

  @IsString()
  @MinLength(1)
  @MaxLength(16)
  postalCode: string;
}
