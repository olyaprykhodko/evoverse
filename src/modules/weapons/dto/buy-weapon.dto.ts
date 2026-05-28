import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class BuyWeaponDto {
  @ApiProperty({ example: 2, description: 'ID of the weapon to purchase' })
  @IsInt()
  @Min(1)
  weaponId: number;
}
