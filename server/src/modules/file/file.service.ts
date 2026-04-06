import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { type Readable } from 'node:stream';
import { fileTypeFromBuffer } from 'file-type';
import { type FileRecord } from './file.types.js';
import {
  storage,
  getStorageSize,
  getStorageLimit,
  FILES_DIR,
  ALLOWED_EXT,
  TEXT_EXTS,
  reserveStorage,
  clearReserve,
  resolveUniqueFileName,
} from '#src/storage.js';
import { AppError } from '#src/middlewares/error-handler.js';

export const fileService = {
  uploadFile: (stream: Readable, meta: { fileName: string; fileExt: string; size: number }): Promise<FileRecord> => {
    return new Promise((resolve, reject) => {
      const { fileName, fileExt, size } = meta;

      if (!ALLOWED_EXT[fileExt]) {
        return reject(new AppError(`File type .${fileExt} is not allowed`, 415));
      }

      if (!reserveStorage(size)) {
        return reject(new AppError('Storage limit exceeded', 507));
      }

      const id = crypto.randomUUID();
      const uniqueName = resolveUniqueFileName(fileName);
      const filePath = path.join(FILES_DIR, id);

      const record: FileRecord = {
        id,
        fileName: uniqueName,
        mimeType: ALLOWED_EXT[fileExt],
        size,
        receivedSize: 0,
        status: 'loading',
        path: filePath,
        createdAt: null,
      };

      storage.set(id, record);

      let settled = false;

      const fail = (err: Error, statusCode = 500): void => {
        if (settled) return;
        settled = true;
        clearReserve(size);
        record.status = 'error';
        fs.unlink(filePath).catch(() => undefined);
        reject(new AppError(err.message, statusCode));
      };

      const chunks: Buffer[] = [];
      const writeStream = fsSync.createWriteStream(filePath);

      stream.on('data', (chunk: Buffer) => {
        record.receivedSize += chunk.length;
        chunks.push(chunk);
      });

      stream.on('error', fail);
      writeStream.on('error', fail);

      writeStream.on('finish', () => {
        if (settled) return;

        const buffer = Buffer.concat(chunks);

        fileTypeFromBuffer(buffer)
          .then((detected) => {
            if (settled) return;

            const expectedMime = ALLOWED_EXT[fileExt] as string;

            if (!detected) {
              if (!TEXT_EXTS.has(fileExt)) {
                fail(new Error('File content does not match declared type'), 422);
                return;
              }
            } else if (detected.mime !== expectedMime) {
              fail(new Error('File content does not match declared type'), 422);
              return;
            }

            settled = true;
            clearReserve(size);
            record.status = 'done';
            record.createdAt = new Date();
            resolve(record);
          })
          .catch((err: Error) => fail(err));
      });

      stream.pipe(writeStream);
    });
  },

  getUploadStatus: (id: string) => {
    const record = storage.get(id);
    if (!record) {
      throw new AppError('File not found', 404);
    }
    return {
      id: record.id,
      status: record.status,
      receivedSize: record.receivedSize,
      totalSize: record.size,
      createdAt: record.createdAt,
    };
  },

  getFilesList: () => {
    const files = Array.from(storage.values())
      .filter((r) => r.status === 'done')
      .map(({ id, fileName, mimeType, size, createdAt }) => ({ id, fileName, mimeType, size, createdAt }));

    return {
      files,
      storage: {
        used: getStorageSize(),
        limit: getStorageLimit(),
      },
    };
  },

  getFileRecord: (id: string): FileRecord => {
    const record = storage.get(id);
    if (!record || record.status !== 'done') {
      throw new AppError('File not found', 404);
    }
    return record;
  },

  deleteFile: async (id: string): Promise<void> => {
    const record = storage.get(id);
    if (!record) {
      throw new AppError('File not found', 404);
    }
    await fs.unlink(record.path).catch(() => undefined);
    storage.delete(id);
  },

  removeAllFiles: async (): Promise<void> => {
    const records = Array.from(storage.values());
    await Promise.all(records.map((r) => fs.unlink(r.path).catch(() => undefined)));
    storage.clear();
  },
};
