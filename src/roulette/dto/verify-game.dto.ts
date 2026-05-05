import { IsInt, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class VerifyGameDto {
  @IsString()
  serverSeed: string;

  @IsString()
  clientSeed: string;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  nonce: number;
}
