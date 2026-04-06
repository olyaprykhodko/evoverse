export default async function handleDeleteAllFiles(
  setError: (msg: string | null) => void,
  setSuccess: (msg: string | null) => void,
  setFiles: (files: any[]) => void,
  fetchFiles: (
    setFiles: (files: any[]) => void,
    setError: (msg: string | null) => void,
    api: string,
  ) => void,
  api: string,
) {
  setError(null);
  try {
    const response = await fetch(`${api}/files/remove`, { method: 'DELETE' });
    if (!response.ok) throw new Error();
    setFiles([]);
    setSuccess('Сховище повністю очищено');
    fetchFiles(setFiles, setError, api);
  } catch {
    setError('Не вдалось очистити сховище');
  }
}
