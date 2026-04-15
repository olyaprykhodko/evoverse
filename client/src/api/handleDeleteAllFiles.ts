import { Auth } from './fetchFiles';

export default async function handleDeleteAllFiles(
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: auth.email, password: auth.password }),
    });
    if (!response.ok) throw new Error();
    setFiles([]);
    setSuccess('Сховище повністю очищено');
    onDone();
  } catch {
    setError('Не вдалось очистити сховище');
  }
}
