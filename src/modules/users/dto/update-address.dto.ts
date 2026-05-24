import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateAddressDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  lastName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[\d\s\-().]{7,20}$/, {
    message: 'phoneNumber must be a valid phone number',
  })
  phoneNumber?: string;

  @IsOptional()
  @IsString()
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
  @MaxLength(64)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  postalCode?: string;
}
