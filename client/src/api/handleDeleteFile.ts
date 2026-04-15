import { Auth } from './fetchFiles';

export default async function handleDeleteFile(
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: auth.email, password: auth.password }),
    });
    if (!res.ok) throw new Error();
    setSuccess('Файл видалено');
    onDone();
  } catch {
    setError('Не вдалось видалити файл');
  }
}
