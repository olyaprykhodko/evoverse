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

const STORAGE_LIMIT = 3 * 1024 * 1024;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE_DIR = path.join(__dirname, 'files');

const storage = new Map<string, FileRecord>();

const getStorageSize = (): number => {
  let totalSize = 0;

  for (const record of storage.values()) {
    if (record.status === 'done') totalSize += record.size;
  }

  return totalSize;
};

export { STORAGE_LIMIT, FILE_DIR, storage, getStorageSize };
