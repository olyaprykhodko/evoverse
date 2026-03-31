import http from 'node:http';
import handleFileDelete from './handlers/handleDeleteFile.ts';
import handleGetFile from './handlers/handleGetFile.ts';
import handleGetFilesList from './handlers/handleGetFilesList.ts';
import handleGetUploadStatus from './handlers/handleGetUploadStatus.ts';
import handleUploadFile from './handlers/handleUploadFile.ts';

// ДЗ: написати веб-сервер (на модулі http) для завантаження великих файлів частками.
// передбачити інтерфейс списку завантажених файлів,
// просмотр файлу, видалення файлу,
// статус виконання завантаження.
// Додати ліміт (квоту) на файлове сховище, тобто сумарно можна завантажити не більш ніж 3Мб файлів

const app = http.createServer((req, res) => {
  const { url, method } = req;

  if (url === '/upload' && method === 'POST') {
    handleUploadFile(req, res);
  } else if (
    url?.startsWith('/files/') &&
    url.endsWith('/status') &&
    method === 'GET'
  ) {
    handleGetUploadStatus(req, res);
  } else if (url === '/files' && method === 'GET') {
    handleGetFilesList(res);
  } else if (url?.startsWith('/files/') && method === 'GET') {
    handleGetFile(req, res);
  } else if (req.url?.startsWith('/files/') && req.method === 'DELETE') {
    handleFileDelete(req, res);
  }
});

app.listen(3500, () => console.log('Server is running on port 3500'));
