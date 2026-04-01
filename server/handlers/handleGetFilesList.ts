import { ServerResponse } from 'node:http';
import { storage, getStorageSize, STORAGE_LIMIT } from '../storage.ts';
import { sendResponse } from '../utils.ts';

export default function handleGetFilesList(res: ServerResponse) {
  const files = Array.from(storage.values()).map((item) => ({
    id: item.id,
    fileName: item.fileName,
    size: item.size,
    createdAt: item.createdAt,
  }));

  sendResponse(res, 200, {
    message: 'Files list retreived',
    data: {
      files,
      storage: {
        used: getStorageSize(),
        limit: STORAGE_LIMIT,
      },
    },
  });
  return;
}
