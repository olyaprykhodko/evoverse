import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type LoadingStatus = 'loading' | 'done' | 'error';

export type FileRecord = {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  receivedSize: number;
  status: LoadingStatus;
  path: string;
  createdAt: Date | null;
};

const ALLOWED_EXT: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpeg: 'image/jpeg',
  txt: 'text/plain',
  json: 'application/json',
};

const STORAGE_LIMIT = 3 * 1024 * 1024;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILES_DIR = path.join(__dirname, 'files');

const storage = new Map<string, FileRecord>();

const getStorageSize = (): number => {
  let totalSize = 0;

  for (const record of storage.values()) {
    if (record.status === 'done') totalSize += record.size;
  }

  return totalSize;
};

let reservedBytes = 0;

const reserveStorage = (fileSize: number): boolean => {
  if (getStorageSize() + reservedBytes + fileSize > STORAGE_LIMIT) return false;
  reservedBytes += fileSize;
  return true;
};

const clearReserve = (fileSize: number): void => {
  reservedBytes -= fileSize;
};

const resolveUniqueFileName = (fileName: string): string => {
  const existingNames = new Set([...storage.values()].map((r) => r.fileName));

  if (!existingNames.has(fileName)) return fileName;

  const ext = path.extname(fileName);
  const base = path.basename(fileName, ext);

  let counter = 1;
  let freeName = `${base}-${counter}${ext}`;
  while (existingNames.has(freeName)) {
    counter++;
    freeName = `${base}-${counter}${ext}`;
  }
  return freeName;
};

export {
  STORAGE_LIMIT,
  ALLOWED_EXT,
  FILES_DIR,
  storage,
  getStorageSize,
  reserveStorage,
  clearReserve,
  resolveUniqueFileName,
};
