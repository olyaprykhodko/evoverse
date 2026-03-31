import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'crypto';
import {
  getStorageSize,
  STORAGE_LIMIT,
  ALLOWED_EXT,
  FILE_DIR,
  storage,
  reserveStorage,
} from './storage.ts';
import { sendResponse, normalizeFileName } from './utils.ts';

// ДЗ: написати веб-сервер (на модулі http) для завантаження великих файлів частками.
// передбачити інтерфейс списку завантажених файлів,
// просмотр файлу, видалення файлу,
// статус виконання завантаження.
// Додати ліміт (квоту) на файлове сховище, тобто сумарно можна завантажити не більш ніж 3Мб файлів

const app = http.createServer((req, res) => {
  const { url, method } = req;

  if (url === '/upload' && method === 'POST') {
    const fileName = normalizeFileName(req.headers['x-file-name']);
    const fileExt = req.headers['content-type'];
    const fileSize = req.headers['content-length'];

    if (!fileName) {
      sendResponse(res, 400, {
        message: 'Invalid file name',
      });
      return;
    }

    if (!fileExt || !Object.values(ALLOWED_EXT).includes(fileExt)) {
      sendResponse(res, 400, {
        message:
          'Invalid file format. Please choose .pdf, .png, .jpeg, .txt, or .json extension',
      });
      return;
    }
    if (!fileSize || isNaN(parseInt(fileSize))) {
      sendResponse(res, 400, {
        message: 'Invalid file size',
      });
      return;
    }

    if (!reserveStorage(parseInt(fileSize))) {
      sendResponse(res, 507, {
        message: 'Insufficient storage',
      });
      return;
    }

    const id = crypto.randomUUID();
    const filePath = path.join(FILE_DIR, id);
    const stream = fs.createWriteStream(filePath);

    const existingFile = storage.get(fileName);
    if (existingFile) {
      sendResponse(res, 409, {
        message: 'File with this name already exists',
      });
      return;
    }

    storage.set(id, {
      id,
      fileName: fileName,
      mimeType: fileExt,
      size: parseInt(fileSize),
      receivedSize: parseInt(fileSize),
      status: 'loading',
      path: filePath,
      createdAt: null,
    });

    req.on('data', (chunk) => {
      const record = storage.get(id);
      if (record) record.receivedSize += chunk.length;
    });

    stream.on('finish', () => {
      const record = storage.get(id);

      if (record) {
        record.status = 'done';
        record.createdAt = new Date();
      }

      sendResponse(res, 201, {
        message: 'File successfully uploaded',
        data: storage.get(id),
      });
    });

    stream.on('error', () => {
      const record = storage.get(id);
      if (record) record.status = 'error';
      fs.unlink(filePath, () => {
        storage.delete(id);

        sendResponse(res, 500, {
          message: 'Upload failed',
        });
      });
    });

    req.pipe(stream);

    req.on('aborted', () => {
      stream.destroy();
      fs.unlink(filePath, () => storage.delete(id));
    });
    return;
  } else if (
    url?.startsWith('/files/') &&
    url.endsWith('/status') &&
    method === 'GET'
  ) {
    const id = req.url ? req.url.split('/')[2] : undefined;
    const record = id ? storage.get(id) : undefined;

    if (!record) {
      sendResponse(res, 404, {
        message: 'File does not exist',
      });
      return;
    }
    sendResponse(res, 200, {
      message: 'Loading file',
      data: {
        id: record.id,
        status: record.status,
        receivedSize: record.receivedSize,
        totalSize: record.size,
        createdAt: record.createdAt,
      },
    });
    return;
  } else if (url === '/files' && method === 'GET') {
    const files = Array.from(storage.values()).map((item) => ({
      id: item.id,
      fileName: item.fileName,
      size: item.size,
      createdAt: item.createdAt,
    }));

    sendResponse(res, 200, {
      message: 'Files list retreived',
      data: { files },
    });
  } else if (url?.startsWith('/files/') && method === 'GET') {
    const id = req.url ? req.url.split('/')[2] : undefined;
    const record = id ? storage.get(id) : undefined;

    if (!record || record.status !== 'done') {
      sendResponse(res, 404, {
        message: 'File does not exist',
      });
      return;
    }

    res.writeHead(200, {
      'Content-Type': record.mimeType,
      'Content-Disposition': `inline; filename="${record.fileName}"`,
    });
    fs.createReadStream(record.path).pipe(res);
    return;
  } else if (req.url?.startsWith('/files/') && req.method === 'DELETE') {
    const id = req.url ? req.url.split('/')[2] : undefined;
    const record = id ? storage.get(id) : undefined;

    if (!record) {
      sendResponse(res, 404, {
        message: 'File does not exist',
      });
      return;
    }

    fs.unlink(record.path, (err) => {
      if (err) {
        sendResponse(res, 500, {
          message: 'Failed to delete',
        });
      } else {
        storage.delete(id!);

        sendResponse(res, 201, {
          message: 'File successfully deleted',
          data: id,
        });
        return;
      }
    });
  }
});

app.listen(3500, () => console.log('Server is running on port 3500'));
