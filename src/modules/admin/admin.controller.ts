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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { AdminService } from './admin.service.js';
import { AdminGuard } from '../../guards/admin.guard.js';
import { BanUserDto } from './dto/ban-user.dto.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';

@ApiTags('Admin')
@ApiBearerAuth('JWT')
@UseGuards(AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats') // statistics
  @ApiOperation({ summary: 'Get platform statistics' })
  @ApiOkResponse({ description: 'OK – user counts and activity stats' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden – admin role required' })
  getStats() {
    return this.adminService.getStats();
  }

  @Get('users') // get all users
  @ApiOperation({ summary: 'List all users (admin view)' })
  @ApiOkResponse({ description: 'OK – full user list with profiles' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden – admin role required' })
  findAllUsers() {
    return this.adminService.findAllUsers();
  }

  @Get('users/:id') // find user by id
  @ApiOperation({ summary: 'Get full user details by ID' })
  @ApiOkResponse({ description: 'OK – user with profile and address' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden – admin role required' })
  @ApiNotFoundResponse({ description: 'Not Found' })
  findOneUser(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.findOneUser(id);
  }

  @Patch('users/:id/ban') // ban
  @ApiOperation({ summary: 'Ban a user (optionally set ban end date)' })
  @ApiOkResponse({ description: 'OK – user banned' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden – admin role required' })
  @ApiNotFoundResponse({ description: 'Not Found' })
  banUser(@Param('id', ParseIntPipe) id: number, @Body() dto: BanUserDto) {
    return this.adminService.banUser(id, dto);
  }

  @Patch('users/:id/unban') // cancel ban
  @ApiOperation({ summary: 'Unban a user' })
  @ApiOkResponse({ description: 'OK – user unbanned' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden – admin role required' })
  @ApiNotFoundResponse({ description: 'Not Found' })
  unbanUser(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.unbanUser(id);
  }

  @Patch('users/:id/role') // update user/admin role
  @ApiOperation({ summary: 'Change user role (USER / ADMIN)' })
  @ApiOkResponse({ description: 'OK – role updated' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden – admin role required' })
  @ApiNotFoundResponse({ description: 'Not Found' })
  updateUserRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.adminService.updateUserRole(id, dto);
  }

  @Patch('users/:id/profile') // update user rating
  @ApiOperation({
    summary: 'Update user profile stats (rating / balance / level)',
  })
  @ApiOkResponse({ description: 'OK – profile updated' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden – admin role required' })
  @ApiNotFoundResponse({ description: 'Not Found' })
  updateUserProfile(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.adminService.updateUserProfile(id, dto);
  }

  @Delete('users/:id') // deactivate user profile
  @ApiOperation({ summary: 'Soft-delete a user account' })
  @ApiOkResponse({ description: 'OK – user archived' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden – admin role required' })
  @ApiNotFoundResponse({ description: 'Not Found' })
  softDeleteUser(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.softDeleteUser(id);
  }
}
