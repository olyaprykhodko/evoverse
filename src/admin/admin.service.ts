import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { sendResponse } from '../../utils/response.js';
import { BanUserDto } from './dto/ban-user.dto.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAllUsers() {
    try {
      const users = await this.prisma.users.findMany({
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          isBanned: true,
          isDeleted: true,
          banEndAt: true,
          lastLoginIP: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
          profile: {
            select: { rating: true, avatar: true, level: true },
          },
        },
      });

      return sendResponse('Users fetched', 200, users);
    } catch (err) {
      this.logger.error('Failed to fetch users', err);
      throw new InternalServerErrorException();
    }
  }

  async findOneUser(id: number) {
    const user = await this.prisma.users.findFirst({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isBanned: true,
        isDeleted: true,
        banEndAt: true,
        lastLoginIP: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
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
                country: true,
                city: true,
              },
            },
          },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    return sendResponse('User fetched', 200, user);
  }

  async banUser(id: number, dto: BanUserDto) {
    await this.ensureUserExists(id);

    try {
      await this.prisma.users.update({
        where: { id },
        data: {
          isBanned: true,
          banEndAt: dto.banEndAt ? new Date(dto.banEndAt) : null,
        },
      });
    } catch (err) {
      this.logger.error('Failed to ban user', err);
      throw new InternalServerErrorException();
    }

    return sendResponse('User banned', 200);
  }

  async unbanUser(id: number) {
    await this.ensureUserExists(id);

    try {
      await this.prisma.users.update({
        where: { id },
        data: { isBanned: false, banEndAt: null },
      });
    } catch (err) {
      this.logger.error('Failed to unban user', err);
      throw new InternalServerErrorException();
    }

    return sendResponse('User unbanned', 200);
  }

  async softDeleteUser(id: number) {
    await this.ensureUserExists(id);

    try {
      await this.prisma.users.update({
        where: { id },
        data: { isDeleted: true, deletedAt: new Date() },
      });
    } catch (err) {
      this.logger.error('Failed to delete user', err);
      throw new InternalServerErrorException();
    }

    return sendResponse('User deleted', 200);
  }

  async updateUserRole(id: number, dto: UpdateRoleDto) {
    await this.ensureUserExists(id);

    try {
      await this.prisma.users.update({
        where: { id },
        data: { role: dto.role },
      });
    } catch (err) {
      this.logger.error('Failed to update role', err);
      throw new InternalServerErrorException();
    }

    return sendResponse('Role updated', 200);
  }

  async updateUserProfile(id: number, dto: UpdateProfileDto) {
    const { rating, balance, level } = dto;

    const profile = await this.prisma.profiles.findFirst({
      where: { userId: id },
      select: { userId: true },
    });
    if (!profile) throw new NotFoundException('Profile not found');

    try {
      await this.prisma.profiles.update({
        where: { userId: id },
        data: {
          ...(rating !== undefined && { rating }),
          ...(balance !== undefined && { balance }),
          ...(level !== undefined && { level }),
        },
      });
    } catch (err) {
      this.logger.error('Failed to update profile', err);
      throw new InternalServerErrorException();
    }

    return sendResponse('Profile updated', 200);
  }

  async getStats() {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [total, banned, deleted, newThisWeek, newThisMonth] =
      await Promise.all([
        this.prisma.users.count(),
        this.prisma.users.count({ where: { isBanned: true } }),
        this.prisma.users.count({ where: { isDeleted: true } }),
        this.prisma.users.count({ where: { createdAt: { gte: weekAgo } } }),
        this.prisma.users.count({ where: { createdAt: { gte: monthAgo } } }),
      ]);

    return sendResponse('Stats fetched', 200, {
      total,
      banned,
      deleted,
      newThisWeek,
      newThisMonth,
    });
  }

  private async ensureUserExists(id: number) {
    const user = await this.prisma.users.findFirst({
      where: { id },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('User not found');
  }
}
