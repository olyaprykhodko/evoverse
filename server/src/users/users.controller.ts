import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { AuthUser } from '../common/decorators/auth-user.decorator';
import type { UserRecord } from '../common/types';
import { UpdateUserDto } from './dto/update.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(AuthGuard)
  getMe(@AuthUser() user: UserRecord) {
    return this.usersService.findById(user.id);
  }

  @Patch('me')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  updateProfile(@AuthUser() user: UserRecord, @Body() data: UpdateUserDto) {
    return this.usersService.updateProfile(user.id, data);
  }

  @Delete('me')
  @UseGuards(AuthGuard)
  deleteMe(@AuthUser() user: UserRecord) {
    this.usersService.delete(user.id);
    return { message: 'User deleted' };
  }
}
