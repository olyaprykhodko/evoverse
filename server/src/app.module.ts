import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'node:path';
import { StorageModule } from './storage/storage.module';
import { UsersModule } from './users/users.module';
import { FilesModule } from './files/files.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'client', 'build'),
      exclude: [
        '/users/{*path}',
        '/files/{*path}',
        '/auth/{*path}',
        '/admin/{*path}',
      ],
    }),
    StorageModule,
    UsersModule,
    FilesModule,
    AuthModule,
    AdminModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
