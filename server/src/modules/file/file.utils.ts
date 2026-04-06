import path from 'node:path';

export const normalizeFileName = (fileName: string | string[] | undefined): string | undefined => {
  if (!fileName) return undefined;
  const raw = Array.isArray(fileName) ? fileName[0] : fileName;
  if (!raw) return undefined;
  const decoded = decodeURIComponent(raw);
  const base = path.basename(decoded);
  return base.replace(/[^a-zA-Z0-9._\- ]/g, '_');
};
