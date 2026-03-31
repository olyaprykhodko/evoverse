export default async function handleDeleteFile(
  id: string,
  setError: (msg: string | null) => void,
  setSuccess: (msg: string | null) => void,
  setFiles: (files: any[]) => void,
  fetchFiles: (
    setFiles: (files: any[]) => void,
    setError: (msg: string | null) => void,
  ) => void,
  api: string,
) {
  setError(null);
  try {
    const res = await fetch(`${api}/files/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error();
    setSuccess('Файл видалено');
    fetchFiles(setFiles, setError);
  } catch {
    setError('Не вдалось видалити файл');
  }
}
