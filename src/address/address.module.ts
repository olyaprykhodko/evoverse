import { Module } from '@nestjs/common';
import { AddressService } from './address.service.js';
import { AddressController } from './address.controller.js';

@Module({
  controllers: [AddressController],
  providers: [AddressService],
})
export class AddressModule {}
