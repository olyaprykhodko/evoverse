import fs from 'node:fs/promises';
import path from 'node:path';
import { IncomingMessage, ServerResponse } from 'node:http';
import { sendResponse } from '../utils.ts';
import { FILES_DIR, storage } from '../storage.ts';

export default async function handleRemoveAllFiles(
  req: IncomingMessage,
  res: ServerResponse,
) {
  for (const file of await fs.readdir(FILES_DIR)) {
    await fs.unlink(path.join(FILES_DIR, file));
  }

  storage.clear();

  sendResponse(res, 200, {
    message: 'Storage cleared',
  });
  return;
}
