import { IncomingMessage, ServerResponse } from 'node:http';
import { storage } from '../storage.ts';
import { sendResponse } from '../utils.ts';

export default function handleGetUploadStatus(
  req: IncomingMessage,
  res: ServerResponse,
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
}
