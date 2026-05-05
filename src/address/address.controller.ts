import { Controller, Post, Body, Patch, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AddressService } from './address.service.js';
import { CreateAddressDto } from './dto/create-address.dto.js';
import { UpdateAddressDto } from './dto/update-address.dto.js';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard.js';
import type { JwtPayload } from '../auth/strategies/jwt-access.strategy.js';

@Controller('address')
@UseGuards(JwtAccessGuard)
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Post()
  create(@Req() req: Request, @Body() createAddressDto: CreateAddressDto) {
    const user = req.user as JwtPayload;
    return this.addressService.create(user.sub, createAddressDto);
  }

  @Patch()
  update(@Req() req: Request, @Body() updateAddressDto: UpdateAddressDto) {
    const user = req.user as JwtPayload;
    return this.addressService.update(user.sub, updateAddressDto);
  }
}
