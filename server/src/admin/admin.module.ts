import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { UsersModule } from '../users/users.module';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [UsersModule, FilesModule],
  controllers: [AdminController],
})
export class AdminModule {}
