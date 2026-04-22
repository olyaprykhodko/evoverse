import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ForbiddenException,
  HttpCode,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { FilesService } from '../files/files.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { AuthUser } from '../common/decorators/auth-user.decorator';
import type { UserRecord } from '../common/types';

@Controller('admin')
@UseGuards(AuthGuard, AdminGuard)
export class AdminController {
  constructor(
    private readonly usersService: UsersService,
    private readonly filesService: FilesService,
  ) {}

  @Get('users')
  listUsers() {
    const users = this.usersService.findAll();
    return users.map((u) => ({
      ...u,
      files: this.usersService.getUserFiles(u.id),
    }));
  }

  @Get('users/:id/files')
  getUserFiles(@Param('id') id: string) {
    return this.filesService.findAll(id);
  }

  @Patch('users/:id/block')
  @HttpCode(200)
  toggleBlock(@Param('id') id: string) {
    return this.usersService.toggleBlock(id);
  }

  @Patch('users/:id/quota')
  @HttpCode(200)
  updateQuota(
    @Param('id') id: string,
    @Body() body: { storageLimitMb: number },
  ) {
    return this.usersService.updateStorageLimit(id, body.storageLimitMb);
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string, @AuthUser() admin: UserRecord) {
    if (admin.id === id) {
      throw new ForbiddenException('Cannot delete yourself');
    }
    this.usersService.delete(id);
    return { message: 'User deleted by admin' };
  }

  @Delete('users/:userId/files/:fileId')
  deleteFile(@Param('userId') userId: string, @Param('fileId') fileId: string) {
    this.filesService.delete(userId, fileId);
    return { status: 'success', message: 'File deleted by admin' };
  }
}
