import { Auth } from '../types/users';
import { basicAuth } from '../api/basicAuth';

export default async function handleView(api: string, id: string, auth: Auth) {
  try {
    const res = await fetch(`${api}/files/${id}`, {
      headers: { Authorization: basicAuth(auth) },
    });
    if (!res.ok) throw new Error();

    const contentType =
      res.headers.get('Content-Type') || 'application/octet-stream';
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    const viewable =
      contentType.startsWith('image/') ||
      contentType === 'application/pdf' ||
      contentType.startsWith('text/') ||
      contentType === 'application/json';

    if (viewable) {
      window.open(url, '_blank');
    } else {
      const a = document.createElement('a');
      a.href = url;
      const disposition = res.headers.get('Content-Disposition');
      const match = disposition?.match(/filename="?(.+?)"?$/);
      a.download = match?.[1] ? decodeURIComponent(match[1]) : 'download';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    setTimeout(() => URL.revokeObjectURL(url), 30000);
  } catch {}
}
