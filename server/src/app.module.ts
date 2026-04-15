import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { StorageModule } from './storage/storage.module';
import { UsersModule } from './users/users.module';
import { FilesModule } from './files/files.module';

@Module({
  imports: [StorageModule, UsersModule, FilesModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
