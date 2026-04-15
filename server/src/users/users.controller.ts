import {
  Controller,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  ForbiddenException,
  HttpCode,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { SignupDto } from './dto/signup.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { AuthUser } from '../common/decorators/auth-user.decorator';
import type { UserRecord } from '../storage/storage.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async create(@Body() userData: SignupDto) {
    return this.usersService.create(userData);
  }

  @Post('all')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  findAll() {
    return this.usersService.findAll();
  }

  @Post(':id')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  delete(@Param('id') id: string, @AuthUser() user: UserRecord) {
    if (user.id !== id) {
      throw new ForbiddenException('Forbidden action');
    }
    this.usersService.delete(id);
    return { message: 'User deleted' };
  }
}
