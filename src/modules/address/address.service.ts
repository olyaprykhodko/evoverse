import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { CreateAddressDto } from './dto/create-address.dto.js';
import { UpdateAddressDto } from './dto/update-address.dto.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { sendResponse } from '../../common/utils/response.js';

@Injectable()
export class AddressService {
  private readonly logger = new Logger(AddressService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, createAddressDto: CreateAddressDto) {
    const {
      firstName,
      lastName,
      phoneNumber,
      address,
      address2,
      country,
      city,
      postalCode,
    } = createAddressDto;

    const userExists = await this.prisma.users.findFirst({
      where: { id: userId },
      select: { id: true },
    });
    if (!userExists) throw new NotFoundException('User not found');

    const addressExists = await this.prisma.addresses.findFirst({
      where: { userId },
      select: { userId: true },
    });
    if (addressExists)
      throw new ConflictException('Address already exists for this user');

    try {
      await this.prisma.addresses.create({
        data: {
          userId,
          firstName,
          lastName,
          phoneNumber,
          address,
          address2: address2 ?? null,
          country: country ?? null,
          city,
          postalCode,
        },
      });
    } catch (err) {
      this.logger.error('Failed to create user', err);
      throw new InternalServerErrorException();
    }

    return sendResponse('Address successfully added', 200);
  }

  async update(userId: number, updateAddressDto: UpdateAddressDto) {
    const {
      firstName,
      lastName,
      phoneNumber,
      address,
      address2,
      country,
      city,
      postalCode,
    } = updateAddressDto;

    const addressExists = await this.prisma.addresses.findFirst({
      where: { userId },
      select: { userId: true },
    });
    if (!addressExists) throw new NotFoundException('Address not found');

    try {
      await this.prisma.addresses.update({
        where: { userId },
        data: {
          ...(firstName !== undefined && { firstName }),
          ...(lastName !== undefined && { lastName }),
          ...(phoneNumber !== undefined && { phoneNumber }),
          ...(address !== undefined && { address }),
          ...(address2 !== undefined && { address2 }),
          ...(country !== undefined && { country }),
          ...(city !== undefined && { city }),
          ...(postalCode !== undefined && { postalCode }),
        },
      });
    } catch (err) {
      this.logger.error('Failed to update address', err);
      throw new InternalServerErrorException();
    }

    return sendResponse('Address successfully updated', 200);
  }
}
