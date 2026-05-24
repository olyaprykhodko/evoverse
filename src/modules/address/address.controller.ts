import { Controller, Post, Body, Patch, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';
import { AddressService } from './address.service.js';
import { CreateAddressDto } from './dto/create-address.dto.js';
import { UpdateAddressDto } from './dto/update-address.dto.js';
import { JwtAccessGuard } from '../../guards/jwt-access.guard.js';
import type { JwtPayload } from '../../strategies/jwt-access.strategy.js';

@ApiTags('Address')
@ApiBearerAuth('JWT')
@UseGuards(JwtAccessGuard)
@Controller('address')
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @ApiOperation({ summary: 'Create address for the authenticated user' })
  @ApiCreatedResponse({ description: 'Created – address saved' })
  @ApiConflictResponse({ description: 'Conflict – address already exists' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @Post()
  create(@Req() req: Request, @Body() createAddressDto: CreateAddressDto) {
    const user = req.user as JwtPayload;
    return this.addressService.create(user.sub, createAddressDto);
  }

  @ApiOperation({ summary: 'Update address of the authenticated user' })
  @ApiOkResponse({ description: 'OK – address updated' })
  @ApiNotFoundResponse({ description: 'Not Found – address not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @Patch()
  update(@Req() req: Request, @Body() updateAddressDto: UpdateAddressDto) {
    const user = req.user as JwtPayload;
    return this.addressService.update(user.sub, updateAddressDto);
  }
}
