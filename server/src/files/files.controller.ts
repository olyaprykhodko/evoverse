import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response, Request } from 'express';
import fs from 'node:fs';
import { diskStorage } from 'multer';
import { FilesService } from './files.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { BlockedGuard } from '../common/guards/blocked.guard';
import { AuthUser } from '../common/decorators/auth-user.decorator';
import { UsersService } from '../users/users.service';
import type { UserRecord } from '../common/types';

@Controller('files')
export class FilesController {
  constructor(
    private readonly filesService: FilesService,
    private readonly usersService: UsersService,
  ) {}

  @Post('preflight')
  @UseGuards(AuthGuard, BlockedGuard)
  preflight(
    @Body() body: { fileName: string; fileSize: number },
    @AuthUser() user: UserRecord,
  ) {
    if (!body.fileName || !body.fileSize) {
      throw new BadRequestException('fileName and fileSize are required');
    }
    this.filesService.preflight(user, body.fileName, body.fileSize);
    return { status: 'success', message: 'Upload allowed' };
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './data/tmp',
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `${unique}-${file.originalname}`);
        },
      }),
      limits: { fileSize: 1024 * 1024 * 1024 },
    }),
  )
  async upload(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    const header: string | undefined = req.headers['authorization'];
    if (!header?.startsWith('Basic ')) {
      if (file?.path) this.cleanupTemp(file.path);
      throw new BadRequestException('Authorization header is required');
    }

    const decoded = Buffer.from(header.slice(6), 'base64').toString('utf-8');
    const colonIndex = decoded.indexOf(':');
    if (colonIndex === -1) {
      if (file?.path) this.cleanupTemp(file.path);
      throw new BadRequestException('Invalid Basic auth format');
    }
    const email = decoded.slice(0, colonIndex);
    const password = decoded.slice(colonIndex + 1);

    const user = await this.usersService.validateCredentials(email, password);

    if (user.blocked) {
      if (file?.path) this.cleanupTemp(file.path);
      throw new BadRequestException('Account is blocked');
    }

    if (!file) {
      throw new BadRequestException('No file provided');
    }
    const uploadId = this.filesService.startUpload(user, file);
    return { status: 'success', data: { id: uploadId } };
  }

  @Get('status/:id')
  @UseGuards(AuthGuard)
  getUploadStatus(@Param('id') id: string) {
    const status = this.filesService.getUploadStatus(id);
    if (!status) throw new NotFoundException('Upload status not found');
    return { status: 'success', data: status };
  }

  @Get()
  @UseGuards(AuthGuard, BlockedGuard)
  list(@AuthUser() user: UserRecord) {
    const files = this.filesService.findAll(user.id);
    const storage = this.filesService.getStorageInfo(user);
    return { status: 'success', data: { files, storage } };
  }

  @Get(':id')
  @UseGuards(AuthGuard, BlockedGuard)
  download(
    @Param('id') id: string,
    @AuthUser() user: UserRecord,
    @Res() res: Response,
  ) {
    const file = this.filesService.findOne(user.id, id);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(file.originalName)}"`,
    );
    const stream = fs.createReadStream(file.filePath);
    stream.pipe(res);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, BlockedGuard)
  deleteOne(@Param('id') id: string, @AuthUser() user: UserRecord) {
    this.filesService.delete(user.id, id);
    return { status: 'success', message: 'File deleted' };
  }

  @Delete()
  @UseGuards(AuthGuard, BlockedGuard)
  clearAll(@AuthUser() user: UserRecord) {
    const result = this.filesService.clearAll(user.id);
    return { status: 'success', ...result };
  }

  private cleanupTemp(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {
      console.error('Cleanup error');
    }
  }
}
