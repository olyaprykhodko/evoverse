import fs from 'node:fs';
import { IncomingMessage, ServerResponse } from 'node:http';
import { storage } from '../storage.ts';
import { sendResponse } from '../utils.ts';

export default function handleDeleteFile(
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

  fs.unlink(record.path, (err) => {
    if (err) {
      sendResponse(res, 500, {
        message: 'Failed to delete',
      });
    } else {
      storage.delete(id!);

      sendResponse(res, 200, {
        message: 'File successfully deleted',
        data: id,
      });
      return;
    }
  });
}
