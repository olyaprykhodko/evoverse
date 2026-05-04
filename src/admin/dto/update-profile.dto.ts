import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  rating?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  balance?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  level?: number;
}
