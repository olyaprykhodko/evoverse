import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { ATTACK_ZONES } from '../constants/battle.constants.js';
import type { Zone } from '../entities/battle.entity.js';

export class MoveDto {
  @ApiProperty({
    enum: ATTACK_ZONES,
    example: 'head',
    description: 'Zone the player attacks this round',
  })
  @IsIn(ATTACK_ZONES)
  attackZone: Zone;

  @ApiProperty({
    enum: ATTACK_ZONES,
    example: 'body',
    description: 'Zone the player defends this round',
  })
  @IsIn(ATTACK_ZONES)
  defenseZone: Zone;
}
