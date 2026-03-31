import fs from 'node:fs';
import { IncomingMessage, ServerResponse } from 'node:http';
import { storage } from '../storage.ts';
import { sendResponse } from '../utils.ts';

export default function handleGetFile(
  req: IncomingMessage,
  res: ServerResponse,
) {
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
}
