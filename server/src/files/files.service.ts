import {
  Injectable,
  BadRequestException,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { StorageService } from '../storage/storage.service';
import type { UserRecord, FileRecord } from '../common/types';

export interface UploadStatus {
  id: string;
  status: 'processing' | 'done' | 'error';
  fileName: string;
  fileSize: number;
  createdAt: string;
  fileId?: string;
  error?: string;
}

const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.png',
  '.jpeg',
  '.jpg',
  '.gif',
  '.webp',
  '.txt',
  '.csv',
  '.json',
  '.mp3',
  '.mp4',
  '.zip',
]);

const TEXT_EXTENSIONS = new Set(['.txt', '.csv', '.json']);

const MIME_MAP: Record<string, string[]> = {
  '.pdf': ['application/pdf'],
  '.png': ['image/png'],
  '.jpeg': ['image/jpeg'],
  '.jpg': ['image/jpeg'],
  '.gif': ['image/gif'],
  '.webp': ['image/webp'],
  '.mp3': ['audio/mpeg'],
  '.mp4': ['video/mp4'],
  '.zip': ['application/zip'],
};

@Injectable()
export class FilesService {
  private uploadStatuses = new Map<string, UploadStatus>();
  private static STATUS_TTL = 10 * 60 * 1000;

  constructor(private readonly storage: StorageService) {}

  preflight(user: UserRecord, fileName: string, fileSize: number): void {
    const ext = path.extname(fileName).toLowerCase();

    if (!ALLOWED_EXTENSIONS.has(ext)) {
      throw new BadRequestException(
        `File type "${ext}" is not allowed. Allowed: ${[...ALLOWED_EXTENSIONS].join(', ')}`,
      );
    }

    const used = this.storage.getUserStorageUsed(user.id);
    if (used + fileSize > user.storageLimitBytes) {
      throw new PayloadTooLargeException(
        `Storage limit exceeded. Used: ${this.formatBytes(used)}, ` +
          `limit: ${this.formatBytes(user.storageLimitBytes)}, ` +
          `file: ${this.formatBytes(fileSize)}`,
      );
    }
  }

  startUpload(user: UserRecord, file: Express.Multer.File): string {
    const statusId = crypto.randomUUID();
    this.uploadStatuses.set(statusId, {
      id: statusId,
      status: 'processing',
      fileName: file.originalname,
      fileSize: file.size,
      createdAt: new Date().toISOString(),
    });

    this.upload(user, file)
      .then((record) => {
        const status = this.uploadStatuses.get(statusId);
        if (status) {
          status.status = 'done';
          status.fileId = record.id;
        }
      })
      .catch((err) => {
        const status = this.uploadStatuses.get(statusId);
        if (status) {
          status.status = 'error';
          status.error = err.message ?? 'Upload failed';
        }
      });

    return statusId;
  }

  getUploadStatus(statusId: string): UploadStatus | null {
    this.cleanupStatuses();
    return this.uploadStatuses.get(statusId) ?? null;
  }

  private cleanupStatuses(): void {
    const now = Date.now();
    for (const [id, status] of this.uploadStatuses) {
      if (
        now - new Date(status.createdAt).getTime() >
        FilesService.STATUS_TTL
      ) {
        this.uploadStatuses.delete(id);
      }
    }
  }

  async upload(
    user: UserRecord,
    file: Express.Multer.File,
  ): Promise<FileRecord> {
    const ext = path.extname(file.originalname).toLowerCase();

    if (!ALLOWED_EXTENSIONS.has(ext)) {
      this.cleanupTemp(file.path);
      throw new BadRequestException(
        `File type "${ext}" is not allowed. Allowed: ${[...ALLOWED_EXTENSIONS].join(', ')}`,
      );
    }

    if (!TEXT_EXTENSIONS.has(ext)) {
      const valid = await this.validateMime(file.path, ext);
      if (!valid) {
        this.cleanupTemp(file.path);
        throw new BadRequestException(
          `File content does not match the "${ext}" format`,
        );
      }
    }

    const used = this.storage.getUserStorageUsed(user.id);
    if (used + file.size > user.storageLimitBytes) {
      this.cleanupTemp(file.path);
      throw new PayloadTooLargeException(`Storage limit exceeded`);
    }

    const userDir = this.storage.getUserDir(user.id);
    const safeName = this.storage.normalizeFileName(file.originalname);
    const storedName = this.storage.resolveUniqueFileName(userDir, safeName);

    fs.renameSync(file.path, path.join(userDir, storedName));

    const record: FileRecord = {
      id: crypto.randomUUID(),
      originalName: file.originalname,
      storedName,
      size: file.size,
      mimeType: file.mimetype,
      uploadedAt: new Date().toISOString(),
    };

    const records = this.storage.readMetadata(user.id);
    records.push(record);
    this.storage.writeMetadata(user.id, records);

    return record;
  }

  findAll(userId: string): FileRecord[] {
    return this.storage.readMetadata(userId);
  }

  findOne(userId: string, fileId: string): FileRecord & { filePath: string } {
    const records = this.storage.readMetadata(userId);
    const record = records.find((r) => r.id === fileId);
    if (!record) throw new NotFoundException('File not found');

    const filePath = path.join(
      this.storage.getUserDir(userId),
      record.storedName,
    );
    if (!fs.existsSync(filePath))
      throw new NotFoundException('File not found on disk');

    return { ...record, filePath };
  }

  delete(userId: string, fileId: string): void {
    const records = this.storage.readMetadata(userId);
    const idx = records.findIndex((r) => r.id === fileId);
    if (idx === -1) throw new NotFoundException('File not found');

    const record = records[idx];
    const filePath = path.join(
      this.storage.getUserDir(userId),
      record.storedName,
    );
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    records.splice(idx, 1);
    this.storage.writeMetadata(userId, records);
  }

  clearAll(userId: string): { deleted: number } {
    const records = this.storage.readMetadata(userId);
    const count = records.length;
    const userDir = this.storage.getUserDir(userId);

    for (const record of records) {
      const filePath = path.join(userDir, record.storedName);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    this.storage.writeMetadata(userId, []);
    return { deleted: count };
  }

  getStorageInfo(user: UserRecord) {
    const used = this.storage.getUserStorageUsed(user.id);
    return {
      usedBytes: used,
      limitBytes: user.storageLimitBytes,
      usedFormatted: this.formatBytes(used),
      limitFormatted: this.formatBytes(user.storageLimitBytes),
      usagePercent: Math.round((used / user.storageLimitBytes) * 100),
    };
  }

  private async validateMime(
    filePath: string,
    expectedExt: string,
  ): Promise<boolean> {
    try {
      const fileType = await import('file-type');
      const ft = fileType.default ?? fileType;
      const result = await ft.fromFile(filePath);
      if (!result) return false;
      const allowedMimes = MIME_MAP[expectedExt];
      if (!allowedMimes) return false;
      return allowedMimes.includes(result.mime);
    } catch {
      return false;
    }
  }

  private cleanupTemp(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {
      console.error('Cleanup error');
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
  }
}
