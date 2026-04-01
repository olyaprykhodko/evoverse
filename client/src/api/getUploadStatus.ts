export type Progress = { id: string; received: number; total: number };

export default function getUploadStatus(
  id: string,
  total: number,
  uploadRef: React.RefObject<NodeJS.Timeout | null>,
  setProgress: (progress: Progress | null) => void,
  setUploading: (uploading: boolean) => void,
  setSuccess: (message: string | null) => void,
  setError: (err: string | null) => void,
  setFiles: (files: any[]) => void,
  fetchFiles: (
    setFiles: (files: any[]) => void,
    setError: (err: string | null) => void,
    api: string,
  ) => void,
  api: string,
) {
  uploadRef.current = setInterval(async () => {
    try {
      const response = await fetch(`${api}/files/${id}/status`);
      const data = await response.json();
      const { receivedSize, status } = data.data;

      setProgress({ id, received: receivedSize, total });

      if (status === 'done' || status === 'error') {
        if (uploadRef.current) clearInterval(uploadRef.current);
        setUploading(false);
        setProgress(null);
        if (status === 'done') {
          setSuccess('Файл успішно завантажено!');
          fetchFiles(setFiles, setError, api);
        } else {
          setError('Помилка при завантаженні файлу');
        }
      }
    } catch {
      if (uploadRef.current) clearInterval(uploadRef.current);
      setUploading(false);
      setProgress(null);
    }
  }, 300);
}
