import { BadRequestException } from '@nestjs/common';

import * as crypto from 'node:crypto';

import { type Weapon, ZoneMove } from '../entities/battle.entity.js';
import {
  BLOCKED_DAMAGE_MULTIPLIER,
  ATTACK_ZONES,
} from '../constants/battle.constants.js';

export function computeDamage(
  weapon: Weapon,
  attackZone: ZoneMove['attackZone'],
  defenseZone: ZoneMove['defenseZone'],
): number {
  if (!attackZone) return 0;
  const damage = crypto.randomInt(
    Number(weapon.minDamage),
    Number(weapon.maxDamage) + 1,
  );
  return defenseZone === attackZone
    ? Math.round(damage * BLOCKED_DAMAGE_MULTIPLIER)
    : damage;
}

export function validateMove(move: ZoneMove): void {
  const zones = ATTACK_ZONES as readonly string[];
  if (
    !move ||
    !zones.includes(move.attackZone as string) ||
    !zones.includes(move.defenseZone as string)
  ) {
    throw new BadRequestException(
      'Invalid move: attackZone and defenseZone must be head, body or legs',
    );
  }
}
