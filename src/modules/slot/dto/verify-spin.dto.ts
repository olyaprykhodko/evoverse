import { IsInt, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifySpinDto {
  @ApiProperty({
    example: 'a3f...',
    description: 'Server seed revealed after the spin',
  })
  @IsString()
  serverSeed: string;

  @ApiProperty({ example: 'my-lucky-seed-42' })
  @IsString()
  clientSeed: string;

  @ApiProperty({ example: 0, description: 'Nonce value used during the spin' })
  @IsInt()
  @Min(0)
  nonce: number;
}
