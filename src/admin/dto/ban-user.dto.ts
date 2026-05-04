import { IsDateString, IsOptional } from 'class-validator';

export class BanUserDto {
  @IsOptional()
  @IsDateString()
  banEndAt?: string;
}
