export interface AppFile {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  receivedSize: number;
  status: 'loading' | 'done' | 'error';
  path: string;
  createdAt: string;
}

export interface StorageInfo {
  used: number;
  limit: number;
}

export default async function fetchFiles(
  setFiles: (file: AppFile[] | []) => void,
  setError: (err: string | null) => void,
  api: string,
  setStorage?: (info: StorageInfo) => void,
) {
  try {
    const response = await fetch(`${api}/files`);
    const data = await response.json();
    setFiles(Array.isArray(data.data?.files) ? data.data.files : []);
    if (setStorage && data.data?.storage) setStorage(data.data.storage);
  } catch {
    setError('Не вдалось завантажити список файлів');
  }
}
