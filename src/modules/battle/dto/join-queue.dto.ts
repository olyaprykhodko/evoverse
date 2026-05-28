import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class JoinQueueDto {
  @ApiProperty({
    example: 2,
    description: 'ID of the weapon to use in battle (must be owned)',
  })
  @IsInt()
  @Min(1)
  weaponId: number;
}
