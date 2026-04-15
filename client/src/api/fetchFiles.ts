export interface AppFile {
  id: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

export interface StorageInfo {
  usedBytes: number;
  limitBytes: number;
  usedFormatted: string;
  limitFormatted: string;
  usagePercent: number;
}

export interface Auth {
  email: string;
  password: string;
}

export default async function fetchFiles(
  auth: Auth,
  setFiles: (file: AppFile[]) => void,
  setError: (err: string | null) => void,
  api: string,
  setStorage?: (info: StorageInfo) => void,
) {
  try {
    const response = await fetch(`${api}/files/list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: auth.email, password: auth.password }),
    });
    if (!response.ok) throw new Error();
    const data = await response.json();
    setFiles(Array.isArray(data.data?.files) ? data.data.files : []);
    if (setStorage && data.data?.storage) setStorage(data.data.storage);
  } catch {
    setError('Не вдалось завантажити список файлів');
  }
}
