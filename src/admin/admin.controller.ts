import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service.js';
import { AdminGuard } from '../auth/guards/admin.guard.js';
import { BanUserDto } from './dto/ban-user.dto.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';

@UseGuards(AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  @Get('users')
  findAllUsers() {
    return this.adminService.findAllUsers();
  }

  @Get('users/:id')
  findOneUser(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.findOneUser(id);
  }

  @Patch('users/:id/ban')
  banUser(@Param('id', ParseIntPipe) id: number, @Body() dto: BanUserDto) {
    return this.adminService.banUser(id, dto);
  }

  @Patch('users/:id/unban')
  unbanUser(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.unbanUser(id);
  }

  @Patch('users/:id/role')
  updateUserRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.adminService.updateUserRole(id, dto);
  }

  @Patch('users/:id/profile')
  updateUserProfile(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.adminService.updateUserProfile(id, dto);
  }

  @Delete('users/:id')
  softDeleteUser(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.softDeleteUser(id);
  }
}
