import http from 'node:http';
import handleFileDelete from './handlers/handleDeleteFile.ts';
import handleGetFile from './handlers/handleGetFile.ts';
import handleGetFilesList from './handlers/handleGetFilesList.ts';
import handleGetUploadStatus from './handlers/handleGetUploadStatus.ts';
import handleUploadFile from './handlers/handleUploadFile.ts';
import { sendResponse } from './utils.ts';
import handleRemoveAllFiles from './handlers/handleRemoveAllFiles.ts';

const client = process.env.ORIGIN || 'http://localhost:3000';

const app = http.createServer((req, res) => {
  const { url, method, headers } = req;
  const origin = headers.origin;

  res.setHeader('Access-Control-Allow-Origin', client);

  if (origin === client) {
    res.setHeader('Access-Control-Allow-Origin', client);
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS',
    );
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }

  if (origin && origin !== client) {
    sendResponse(res, 403, { error: 'CORS error: Origin not allowed' });
    return;
  }

  if (method === 'OPTIONS') {
    sendResponse(res, 200, undefined, {
      'Access-Control-Allow-Origin': client,
      'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
      'Access-Control-Allow-Headers':
        headers['access-control-request-headers'] || 'Content-Type',
    });
    return;
  }

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
  } else if (url === '/files/remove' && method === 'DELETE') {
    handleRemoveAllFiles(req, res);
  } else if (url?.startsWith('/files/') && req.method === 'DELETE') {
    handleFileDelete(req, res);
  } else {
    sendResponse(res, 404, { message: 'Not found' });
  }
});

app.listen(3500, () => console.log('Server is running on port 3500'));

app.on('error', (err) => console.error('Server error:', err));
