import { Injectable } from '@nestjs/common';
import { LoginDto } from './dto/login.dto.js';

@Injectable()
export class AuthService {
  login(loginDto: LoginDto) {
    return 'This action adds a new auth';
  }

  refresh() {
    return `This action returns all auth`;
  }

  logout() {
    return;
  }
}
