import {
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import { StorageService, UserRecord } from '../storage/storage.service';
import { SignupDto } from './dto/signup.dto';

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
