import path from 'node:path';

export const normilizeFileName = (
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
