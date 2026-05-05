import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAddressDto {
  @ApiProperty({ example: 'John', minLength: 1, maxLength: 64 })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  firstName: string;

  @ApiProperty({ example: 'Doe', minLength: 1, maxLength: 64 })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  lastName: string;

  @ApiProperty({ example: '+380991234567' })
  @IsString()
  @Matches(/^\+?[1-9]\d{6,14}$/, { message: 'Invalid phone number' })
  phoneNumber: string;

  @ApiProperty({ example: '123 Main Street', minLength: 1, maxLength: 128 })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  address: string;

  @ApiPropertyOptional({ example: 'Apt 4B', maxLength: 128 })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  address2?: string;

  @ApiPropertyOptional({ example: 'Ukraine', maxLength: 64 })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  country?: string;

  @ApiProperty({ example: 'Kyiv', minLength: 1, maxLength: 64 })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  city: string;

  @ApiProperty({ example: '01001', minLength: 1, maxLength: 16 })
  @IsString()
  @MinLength(1)
  @MaxLength(16)
  postalCode: string;
}
