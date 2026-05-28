import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAccessGuard } from '../../guards/jwt-access.guard.js';
import { WeaponsService } from './weapons.service.js';
import { BuyWeaponDto } from './dto/buy-weapon.dto.js';

@ApiTags('Weapons')
@ApiBearerAuth('JWT')
@UseGuards(JwtAccessGuard)
@Controller('weapons')
export class WeaponsController {
  constructor(private readonly weaponsService: WeaponsService) {}

  @Get() // get weapons catalog
  @ApiOperation({
    summary: 'List all weapons',
    description: 'Returns the full weapon catalog.',
  })
  @ApiResponse({ status: 200, description: 'Weapons fetched.' })
  listWeapons() {
    return this.weaponsService.listWeapons();
  }

  @Get('inventory') // get owned weapons
  @ApiOperation({
    summary: 'My inventory',
    description: 'Returns weapons owned by the current user.',
  })
  @ApiResponse({ status: 200, description: 'Inventory fetched.' })
  getInventory(@Req() req: Request) {
    const user = req.user as { sub: number };
    return this.weaponsService.getInventory(user.sub);
  }

  @Post('buy') // buy weapon
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Buy a weapon',
    description: 'Deducts coins from wallet and adds weapon to inventory.',
  })
  @ApiResponse({ status: 201, description: 'Weapon purchased.' })
  @ApiResponse({ status: 400, description: 'Insufficient coins.' })
  @ApiResponse({ status: 404, description: 'Weapon not found.' })
  @ApiResponse({ status: 409, description: 'Weapon already owned.' })
  buyWeapon(@Req() req: Request, @Body() dto: BuyWeaponDto) {
    const user = req.user as { sub: number };
    return this.weaponsService.buyWeapon(user.sub, dto);
  }
}
