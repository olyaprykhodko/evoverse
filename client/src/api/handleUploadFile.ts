import { ChangeEvent, RefObject, Dispatch, SetStateAction } from 'react';
import { translateMessage } from '../utils/translateMessage';

export default function handleUploadFile(
  e: ChangeEvent<HTMLInputElement>,
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

  setError(null);
  setSuccess(null);
  setUploading(true);
  setProgress?.(0);

  const xhr = new XMLHttpRequest();

  xhr.upload.addEventListener('progress', (ev) => {
    if (ev.lengthComputable) {
      setProgress?.(Math.round((ev.loaded / ev.total) * 100));
    }
  });

  xhr.addEventListener('load', () => {
    let data: { message?: string; data?: { id?: string } } = {};
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
    const fileId = data.data?.id;
    if (fileId) {
      setUploadingFileId?.(fileId);
    } else {
      setSuccess('Файл успішно завантажено!');
      setUploading(false);
      setProgress?.(0);
      onDone();
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  });

  xhr.addEventListener('error', () => {
    setError('Помилка зʼєднання з сервером');
    setUploading(false);
    setProgress?.(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  });

  xhr.open('POST', `${api}/files`);
  xhr.setRequestHeader('Content-Type', file.type);
  xhr.setRequestHeader('X-File-Name', encodeURIComponent(file.name));
  xhr.setRequestHeader('Content-Length', file.size.toString());
  xhr.send(file);
}
