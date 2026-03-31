import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'crypto';
import { ALLOWED_EXT } from './mime.ts';
import { buildSuccessResponse, buildErrorResponse } from './response.ts';
import { getStorageSize, STORAGE_LIMIT, FILE_DIR, storage } from './storage.ts';
import { normilizeFileName } from './utils.ts';

// ДЗ: написати веб-сервер (на модулі http) для завантаження великих файлів частками.
// передбачити інтерфейс списку завантажених файлів,
// просмотр файлу, видалення файлу,
// статус виконання завантаження.
// Додати ліміт (квоту) на файлове сховище, тобто сумарно можна завантажити не більш ніж 3Мб файлів

const app = http.createServer((req, res) => {
  const { url, method } = req;

  if (url === '/upload' && method === 'POST') {
    const fileName = normilizeFileName(req.headers['x-file-name']);
    const fileExt = req.headers['content-type'];
    const fileSize = req.headers['content-length'];

    if (!fileName) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(buildErrorResponse('Invalid file name')));
      return;
    }
    if (!fileExt || !Object.values(ALLOWED_EXT).includes(fileExt)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify(
          buildErrorResponse(
            'Invalid file format. Please choose .pdf, .png, .jpeg, .txt, or .json extension',
          ),
        ),
      );
      return;
    }
    if (!fileSize || isNaN(parseInt(fileSize))) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(buildErrorResponse('Invalid file size')));
      return;
    }

    if (getStorageSize() + parseInt(fileSize) > STORAGE_LIMIT) {
      res.writeHead(507, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(buildErrorResponse('Insufficient Storage')));
      return;
    }

    const id = crypto.randomUUID();
    const filePath = path.join(FILE_DIR, id);
    const stream = fs.createWriteStream(filePath);

    storage.set(id, {
      id,
      fileName: fileName,
      mimeType: fileExt,
      size: parseInt(fileSize),
      receivedSize: 0,
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
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify(
          buildSuccessResponse(storage.get(id), 'File successfully uploaded'),
        ),
      );
    });

    stream.on('error', () => {
      const record = storage.get(id);
      if (record) record.status = 'error';
      fs.unlink(filePath, () => {
        res.writeHead(500, {
          'Content-Type': 'application/json',
        });
        res.end(JSON.stringify(buildErrorResponse('Upload failed')));
      });
    });

    req.pipe(stream);
    return;
  } else if (url === '/files' && method === 'GET') {
    const files = Array.from(storage.values()).map((item) => ({
      fileName: item.fileName,
      size: item.size,
      createdAt: item.createdAt,
    }));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(buildSuccessResponse({ files }, 'Files list')));
  }
});

app.listen(3500);
