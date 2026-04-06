export type UploadStatus = {
  id: string;
  status: 'loading' | 'done' | 'error';
  receivedSize: number;
  totalSize: number;
  createdAt: string | null;
};

export default async function getUploadStatus(
  api: string,
  id: string,
): Promise<UploadStatus> {
  const res = await fetch(`${api}/files/status/${id}`);
  if (!res.ok) throw new Error('Status fetch failed');
  const data = await res.json();
  return data.data as UploadStatus;
}
