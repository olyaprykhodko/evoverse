interface File {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  receivedSize: number;
  status: 'loading' | 'done' | 'error';
  path: string;
  createdAt: Date | null;
}

export default async function fetchFiles(
  setFiles: (file: File[] | []) => void,
  setError: (err: string | null) => void,
  api: string,
) {
  try {
    const response = await fetch(`${api}/files`);
    const data = await response.json();
    setFiles(Array.isArray(data.data?.files) ? data.data.files : []);
  } catch {
    setError('Не вдалось завантажити список файлів');
  }
}
