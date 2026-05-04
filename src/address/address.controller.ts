import { Controller, Post, Body, Patch, Param } from '@nestjs/common';
import { AddressService } from './address.service.js';
import { CreateAddressDto } from './dto/create-address.dto.js';
import { UpdateAddressDto } from './dto/update-address.dto.js';
import { UseGuards } from '@nestjs/common';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard.js';
import { ParseIntPipe } from '@nestjs/common';

@Controller('address')
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @UseGuards(JwtAccessGuard)
  @Post(':userId')
  create(
    @Param('id', ParseIntPipe) userId: number,
    @Body() createAddressDto: CreateAddressDto,
  ) {
    return this.addressService.create(userId, createAddressDto);
  }

  @UseGuards(JwtAccessGuard)
  @Patch(':userId')
  update(
    @Param('id', ParseIntPipe) userId: number,
    @Body() updateAddressDto: UpdateAddressDto,
  ) {
    return this.addressService.update(userId, updateAddressDto);
  }
}
