import fs from 'node:fs';
import path from 'node:path';
import crypto from 'crypto';
import { IncomingMessage, ServerResponse } from 'node:http';
import {
  storage,
  clearReserve,
  reserveStorage,
  ALLOWED_EXT,
  FILES_DIR,
} from '../storage.ts';
import { sendResponse, normalizeFileName } from '../utils.ts';

export default function handleUploadFile(
  req: IncomingMessage,
  res: ServerResponse,
) {
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
  const filePath = path.join(FILES_DIR, id);
  const stream = fs.createWriteStream(filePath);
  const size = parseInt(fileSize);

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
    size: size,
    receivedSize: 0,
    status: 'loading',
    path: filePath,
    createdAt: null,
  });

  let sizeReceived = 0;

  req.on('data', (chunk) => {
    sizeReceived += chunk.length;
    const record = storage.get(id);
    if (record) record.receivedSize = sizeReceived;

    if (sizeReceived > size) {
      req.destroy();
      stream.destroy();
      fs.unlink(filePath, () => {
        storage.delete(id);
        clearReserve(size);
      });
      sendResponse(res, 413, { message: 'File exceeds storage size' });
    }
  });

  stream.on('finish', () => {
    const record = storage.get(id);

    if (record) {
      record.status = 'done';
      record.createdAt = new Date();
    }

    clearReserve(parseInt(fileSize));

    sendResponse(res, 201, {
      message: 'File successfully uploaded',
      data: storage.get(id),
    });
  });

  stream.on('error', () => {
    const record = storage.get(id);

    if (record) record.status = 'error';

    clearReserve(parseInt(fileSize));

    fs.unlink(filePath, () => {
      storage.delete(id);
      sendResponse(res, 500, {
        message: 'Upload failed',
      });
    });
  });

  req.pipe(stream);
}
