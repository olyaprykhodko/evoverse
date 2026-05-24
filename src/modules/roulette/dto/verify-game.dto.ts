import { IsInt, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyGameDto {
  @ApiProperty({
    example: 'a3f2c1d4...',
    description: 'The serverSeed revealed after closing the session',
  })
  @IsString()
  serverSeed: string;

  @ApiProperty({ example: 'my-lucky-seed-42' })
  @IsString()
  clientSeed: string;

  @ApiProperty({
    example: 3,
    minimum: 0,
    description: 'Nonce value from the bet to verify',
  })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  nonce: number;
}
