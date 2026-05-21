import {
  ConflictException,
  GoneException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { Role } from '../../generated/prisma/enums.js';
import { sendResponse } from '../../utils/response.js';
import * as argon2 from 'argon2';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const { username, password, email } = createUserDto;

    const userExists = await this.prisma.users.findFirst({
      where: { email },
      select: { id: true },
    });
    if (userExists) throw new ConflictException('Email already exists');

    const hashedPassword = await argon2.hash(password);

    try {
      await this.prisma.users.create({
        data: {
          username: username ?? null,
          password: hashedPassword,
          email,
          role: Role.USER,
          profile: {
            create: { rating: 0 },
          },
          wallet: {
            create: {},
          },
        },
      });
    } catch (err) {
      this.logger.error('Failed to create user', err);
      throw new InternalServerErrorException();
    }

    return sendResponse('User successfully created', 201);
  }

  async findMe(id: number) {
    const user = await this.prisma.users.findFirst({
      where: { id, isDeleted: false },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isBanned: true,
        banEndAt: true,
        createdAt: true,
        profile: {
          select: {
            rating: true,
            balance: true,
            avatar: true,
            level: true,
            address: {
              select: {
                firstName: true,
                lastName: true,
                phoneNumber: true,
                address: true,
                address2: true,
                country: true,
                city: true,
                postalCode: true,
              },
            },
          },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    return sendResponse('User profile fetched', 200, user);
  }

  async findOne(id: number) {
    const user = await this.prisma.users.findFirst({
      where: { id, isDeleted: false },
      select: {
        username: true,
        profile: {
          select: {
            rating: true,
            level: true,
            createdAt: true,
            address: {
              select: {
                country: true,
              },
            },
          },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    return sendResponse('User fetched', 200, user);
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const { username, password, email } = updateUserDto;

    const userExists = await this.prisma.users.findFirst({
      where: { id },
      select: { id: true, isDeleted: true },
    });
    if (!userExists) throw new NotFoundException('User not found');
    if (userExists.isDeleted)
      throw new GoneException('User account has been deleted');

    if (email) {
      const emailExists = await this.prisma.users.findFirst({
        where: { email, NOT: { id } },
        select: { id: true },
      });
      if (emailExists) throw new ConflictException('Email already exists');
    }

    const hashedPassword = password ? await argon2.hash(password) : undefined;

    try {
      await this.prisma.users.update({
        where: { id },
        data: {
          ...(username !== undefined && { username }),
          ...(email !== undefined && { email }),
          ...(hashedPassword !== undefined && { password: hashedPassword }),
        },
      });
    } catch (err) {
      this.logger.error('Failed to update user', err);
      throw new InternalServerErrorException();
    }

    return sendResponse('User successfully updated', 200);
  }

  async remove(id: number) {
    const userExists = await this.prisma.users.findFirst({
      where: { id },
      select: { id: true, isDeleted: true },
    });
    if (!userExists) throw new NotFoundException('User not found');
    if (userExists.isDeleted)
      throw new GoneException('User account is already deleted');

    try {
      await this.prisma.users.update({
        where: { id },
        data: {
          isDeleted: true,
        },
      });
    } catch (err) {
      this.logger.error('Failed to delete user', err);
      throw new InternalServerErrorException();
    }

    return sendResponse('User profile successfully archived', 200);
  }
}
