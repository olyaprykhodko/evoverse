import { ChangeEvent, RefObject, Dispatch, SetStateAction } from 'react';
import { translateMessage } from '../utils/translateMessage';
import { Auth } from './fetchFiles';

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

export default async function handleUploadFile(
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

  // --- Client-side validation ---
  const ext = '.' + (file.name.split('.').pop()?.toLowerCase() ?? '');
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    setError(`Тип файлу "${ext}" не дозволений`);
    reset();
    return;
  }

  // --- Server preflight check (extension + storage limit) ---
  setUploading(true);
  setProgress?.(0);

  try {
    const res = await fetch(`${api}/files/preflight`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: auth.email,
        password: auth.password,
        fileName: file.name,
        fileSize: file.size,
      }),
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

  // --- Upload ---

  const formData = new FormData();
  formData.append('email', auth.email);
  formData.append('password', auth.password);
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
      // Server is processing the file asynchronously — start polling
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

  xhr.open('POST', `${api}/files/upload`);
  xhr.send(formData);
}
