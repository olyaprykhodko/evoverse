import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import crypto from 'crypto';
import { fileTypeFromBuffer } from 'file-type';
import { IncomingMessage, ServerResponse } from 'node:http';
import {
  storage,
  clearReserve,
  reserveStorage,
  ALLOWED_EXT,
  FILES_DIR,
  resolveUniqueFileName,
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

  const resolvedName = resolveUniqueFileName(fileName);

  const id = crypto.randomUUID();
  const filePath = path.join(FILES_DIR, id);
  const stream = fs.createWriteStream(filePath);
  const size = parseInt(fileSize);

  storage.set(id, {
    id,
    fileName: resolvedName,
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

  stream.on('finish', async () => {
    const record = storage.get(id);

    const buffer = await fsPromises.readFile(filePath);
    const detected = await fileTypeFromBuffer(buffer);
    const allowedMimes = Object.values(ALLOWED_EXT);

    const realMime = detected?.mime;
    const isTextFile =
      !realMime && (fileExt === 'text/plain' || fileExt === 'application/json');

    if (
      !isTextFile &&
      (!realMime || realMime !== fileExt || !allowedMimes.includes(realMime))
    ) {
      fs.unlink(filePath, () => {
        storage.delete(id);
        clearReserve(parseInt(fileSize));
      });
      sendResponse(res, 415, {
        message: `File type does not match declared format ${fileExt}"`,
      });
      return;
    }

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

  req.on('error', () => {
    stream.destroy();
    fs.unlink(filePath, () => {
      storage.delete(id);
      clearReserve(size);
    });
    sendResponse(res, 500, { message: 'Upload failed' });
  });

  req.pipe(stream);
}
