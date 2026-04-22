import {
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import { StorageService } from '../storage/storage.service';
import type { UserRecord } from '../common/types';
import { SignupDto } from './dto/signup.dto';
import { UpdateUserDto } from './dto/update.dto';

const DEFAULT_STORAGE_LIMIT_MB = 100;

@Injectable()
export class UsersService {
  constructor(private readonly storage: StorageService) {}

  async create(userData: SignupDto): Promise<Partial<UserRecord>> {
    const users = this.storage.readUsers();

    if (users.some((user) => user.email === userData.email)) {
      throw new ConflictException('User already exists');
    }

    const passwordHash = await bcrypt.hash(userData.password, 10);
    const limit = userData.storageLimit ?? DEFAULT_STORAGE_LIMIT_MB;

    const user: UserRecord = {
      id: crypto.randomUUID(),
      name: userData.name,
      email: userData.email,
      passwordHash,
      storageLimitBytes: limit * 1024 * 1024,
      role: 'user',
      blocked: false,
      createdAt: new Date().toISOString(),
    };

    users.push(user);
    this.storage.writeUsers(users);

    const { passwordHash: _, ...result } = user;
    return result;
  }

  findAll() {
    return this.storage.readUsers().map(({ passwordHash: _, ...rest }) => rest);
  }

  findById(id: string) {
    const { passwordHash: _, ...rest } =
      this.storage.readUsers().find((user) => user.id === id) ??
      (() => {
        throw new NotFoundException('User not found');
      })();
    return rest;
  }

  delete(id: string): void {
    const users = this.storage.readUsers();
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) throw new NotFoundException('User not found');

    users.splice(idx, 1);
    this.storage.writeUsers(users);
    this.storage.removeUserDir(id);
  }

  toggleBlock(id: string): Partial<UserRecord> {
    const users = this.storage.readUsers();
    const user = users.find((u) => u.id === id);
    if (!user) throw new NotFoundException('User not found');
    if (user.role === 'admin') {
      throw new BadRequestException('Action is not allowed');
    }

    user.blocked = !user.blocked;
    this.storage.writeUsers(users);

    const { passwordHash: _, ...rest } = user;
    return rest;
  }

  updateStorageLimit(id: string, limitMb: number): Partial<UserRecord> {
    const users = this.storage.readUsers();
    const user = users.find((u) => u.id === id);
    if (!user) throw new NotFoundException('User not found');

    user.storageLimitBytes = limitMb * 1024 * 1024;
    this.storage.writeUsers(users);

    const { passwordHash: _, ...rest } = user;
    return rest;
  }

  getUserFiles(userId: string) {
    return this.storage.readMetadata(userId);
  }

  async updateProfile(
    id: string,
    data: UpdateUserDto,
  ): Promise<Partial<UserRecord>> {
    const users = this.storage.readUsers();
    const user = users.find((u) => u.id === id);
    if (!user) throw new NotFoundException('User not found');

    if (data.name !== undefined) {
      user.name = data.name.trim();
    }

    if (data.newPassword !== undefined) {
      if (!data.currentPassword) {
        throw new BadRequestException('Current password is required');
      }
      const valid = await bcrypt.compare(
        data.currentPassword,
        user.passwordHash,
      );
      if (!valid)
        throw new BadRequestException('Current password is incorrect');
      user.passwordHash = await bcrypt.hash(data.newPassword, 10);
    }

    this.storage.writeUsers(users);
    const { passwordHash: _, ...rest } = user;
    return rest;
  }

  async validateCredentials(
    email: string,
    password: string,
  ): Promise<UserRecord> {
    const users = this.storage.readUsers();
    const user = users.find((user) => user.email === email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return user;
  }
}
