import path from 'node:path';

interface SendResponseBody {
  message?: string;
  error?: string;
  data?: unknown;
}

type OutgoingHeaders = Record<string, string | string[] | undefined>;

export const sendResponse = (
  res: import('http').ServerResponse,
  status: number,
  body?: SendResponseBody,
  headers?: OutgoingHeaders,
): void => {
  if (body === undefined) {
    res.writeHead(status, headers);
    res.end();
    return;
  }
  res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
  res.end(JSON.stringify({ ...body, timestamp: new Date().toISOString() }));
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
