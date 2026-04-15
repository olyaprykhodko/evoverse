import { Auth } from './fetchFiles';

export interface UploadStatusResponse {
  id: string;
  status: 'processing' | 'done' | 'error';
  fileName: string;
  fileSize: number;
  createdAt: string;
  fileId?: string;
  error?: string;
}

export default async function getUploadStatus(
  uploadId: string,
  auth: Auth,
  api: string,
): Promise<UploadStatusResponse | null> {
  try {
    const res = await fetch(`${api}/files/status/${uploadId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: auth.email, password: auth.password }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
  } catch {
    return null;
  }
}
