import { basicAuth } from './basicAuth';

import type {
  AppFile,
  StorageInfo,
  UploadStatusResponse,
} from '../types/files';
import type { Auth } from '../types/users';

import { ChangeEvent, RefObject, Dispatch, SetStateAction } from 'react';
import { translateMessage } from '../utils/translateMessage';

// завантажити список всіх файлів
export async function fetchFiles(
  auth: Auth,
  setFiles: (file: AppFile[]) => void,
  setError: (err: string | null) => void,
  api: string,
  setStorage?: (info: StorageInfo) => void,
) {
  try {
    const response = await fetch(`${api}/files`, {
      headers: { Authorization: basicAuth(auth) },
    });
    if (!response.ok) throw new Error();
    const data = await response.json();
    setFiles(Array.isArray(data.data?.files) ? data.data.files : []);
    if (setStorage && data.data?.storage) setStorage(data.data.storage);
  } catch {
    setError('Не вдалось завантажити список файлів');
  }
}

const ALLOWED_EXTENSIONS = [
  '.pdf',
  '.png',
  '.jpeg',
  '.jpg',
  '.gif',
  '.webp',
  '.txt',
  '.csv',
  '.json',
  '.mp3',
  '.mp4',
  '.zip',
];

// функція завантаження файлу
export async function handleUploadFile(
  e: ChangeEvent<HTMLInputElement>,
  auth: Auth,
  setError: Dispatch<SetStateAction<string | null>>,
  setSuccess: Dispatch<SetStateAction<string | null>>,
  setUploading: Dispatch<SetStateAction<boolean>>,
  fileInputRef: RefObject<HTMLInputElement | null>,
  api: string,
  onDone: () => void,
  setProgress?: Dispatch<SetStateAction<number>>,
  setUploadingFileId?: Dispatch<SetStateAction<string | null>>,
) {
  const input = e.target as HTMLInputElement;
  const file = input.files && input.files[0];
  if (!file) return;

  const reset = () => {
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  setError(null);
  setSuccess(null);

  // валідація файлу на стороні клієнта
  const ext = '.' + (file.name.split('.').pop()?.toLowerCase() ?? '');
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    setError(`Тип файлу "${ext}" не дозволений`);
    reset();
    return;
  }

  // preflight перевірка на сервері (розширення файлу + ліміт сховища)
  setUploading(true);
  setProgress?.(0);

  try {
    const res = await fetch(`${api}/files/preflight`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: basicAuth(auth),
      },
      body: JSON.stringify({ fileName: file.name, fileSize: file.size }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(
        translateMessage(data.message ?? '') ?? 'Завантаження заборонено',
      );
      setUploading(false);
      reset();
      return;
    }
  } catch {
    setError('Помилка зʼєднання з сервером');
    setUploading(false);
    reset();
    return;
  }

  const formData = new FormData();
  formData.append('file', file);

  const xhr = new XMLHttpRequest();

  xhr.upload.addEventListener('progress', (ev) => {
    if (ev.lengthComputable) {
      setProgress?.(Math.round((ev.loaded / ev.total) * 100));
    }
  });

  xhr.addEventListener('load', () => {
    let data: { message?: string; status?: string; data?: { id?: string } } =
      {};
    try {
      data = JSON.parse(xhr.responseText);
    } catch {}

    if (xhr.status < 200 || xhr.status >= 300) {
      setError(translateMessage(data.message ?? '') ?? 'Помилка завантаження');
      setUploading(false);
      setProgress?.(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setProgress?.(100);
    if (fileInputRef.current) fileInputRef.current.value = '';

    if (data.data?.id && setUploadingFileId) {
      setUploadingFileId(data.data.id);
    } else {
      setSuccess('Файл успішно завантажено!');
      setUploading(false);
      setProgress?.(0);
      onDone();
    }
  });

  xhr.addEventListener('error', () => {
    setError('Помилка зʼєднання з сервером');
    setUploading(false);
    setProgress?.(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  });

  xhr.open('POST', `${api}/files`);
  xhr.setRequestHeader('Authorization', basicAuth(auth));
  xhr.send(formData);
}

// функція статусу завантаження файлу
export async function getUploadStatus(
  uploadId: string,
  auth: Auth,
  api: string,
): Promise<UploadStatusResponse | null> {
  try {
    const res = await fetch(`${api}/files/status/${uploadId}`, {
      headers: { Authorization: basicAuth(auth) },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
  } catch {
    return null;
  }
}

// функція видалення файлу
export async function handleDeleteFile(
  id: string,
  auth: Auth,
  setError: (msg: string | null) => void,
  setSuccess: (msg: string | null) => void,
  onDone: () => void,
  api: string,
) {
  setError(null);
  try {
    const res = await fetch(`${api}/files/${id}`, {
      method: 'DELETE',
      headers: { Authorization: basicAuth(auth) },
    });
    if (!res.ok) throw new Error();
    setSuccess('Файл видалено');
    onDone();
  } catch {
    setError('Не вдалось видалити файл');
  }
}

// функція очищення сховища
export async function handleDeleteAllFiles(
  auth: Auth,
  setError: (msg: string | null) => void,
  setSuccess: (msg: string | null) => void,
  setFiles: (files: any[]) => void,
  onDone: () => void,
  api: string,
) {
  setError(null);
  try {
    const response = await fetch(`${api}/files`, {
      method: 'DELETE',
      headers: { Authorization: basicAuth(auth) },
    });
    if (!response.ok) throw new Error();
    setFiles([]);
    setSuccess('Сховище повністю очищено');
    onDone();
  } catch {
    setError('Не вдалось очистити сховище');
  }
}
