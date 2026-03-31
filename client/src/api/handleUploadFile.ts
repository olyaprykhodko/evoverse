import { ChangeEvent, RefObject, Dispatch, SetStateAction } from 'react';

export default async function handleUploadFile(
  e: ChangeEvent<HTMLInputElement>,
  setError: Dispatch<SetStateAction<string | null>>,
  setSuccess: Dispatch<SetStateAction<string | null>>,
  setUploading: Dispatch<SetStateAction<boolean>>,
  uploadStatus: (id: string, total: number) => Promise<void>,
  fileInputRef: RefObject<HTMLInputElement | null>,
  api: string,
) {
  const input = e.target as HTMLInputElement;
  const file = input.files && input.files[0];
  if (!file) return;

  setError(null);
  setSuccess(null);
  setUploading(true);

  try {
    const res = await fetch(`${api}/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': file.type,
        'X-File-Name': encodeURIComponent(file.name),
        'Content-Length': file.size.toString(),
      },
      body: file,
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.message ?? 'Помилка завантаження');
      setUploading(false);
      return;
    }

    await uploadStatus(data.data.id, file.size);
  } catch {
    setError('Помилка зʼєднання з сервером');
    setUploading(false);
  }

  if (fileInputRef.current) fileInputRef.current.value = '';
}
