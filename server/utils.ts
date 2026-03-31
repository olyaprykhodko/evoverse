import path from 'node:path';

interface SendResponseBody {
  message?: string;
  data?: unknown;
}

interface SendResponse {
  (
    res: import('http').ServerResponse,
    status: number,
    body: SendResponseBody,
  ): void;
}

export const sendResponse: SendResponse = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  const response = {
    ...body,
    timestamp: new Date().toISOString(),
  };
  res.end(JSON.stringify(response));
};

export const normalizeFileName = (
  fileName: string | string[] | undefined,
): string | undefined => {
  if (fileName) {
    if (Array.isArray(fileName)) fileName = fileName[0];
    fileName = String(fileName || '').trim();
    fileName = path.basename(fileName);
    fileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    return fileName;
  }
  return undefined;
};
