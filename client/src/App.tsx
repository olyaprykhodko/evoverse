import { useState, useEffect, useRef } from 'react';
import fetchFiles from './api/fetchFiles';
import formatSize from './utils/formatSize';
import formatDate from './utils/formatDate';

const api = process.env.API_URL || 'http://localhost:3500';

const ICONS = {
  'image/png': '🖼',
  'image/jpeg': '🖼',
  'application/pdf': '📄',
  'text/plain': '📝',
  'application/json': '📦',
};

export default function App() {
  const [files, setFiles] = useState<File[] | []>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(null);
  const fileInputRef = useRef(null);
  const uploadRef = useRef(null);

  useEffect(() => {
    fetchFiles(setFiles, setError, api);
  }, []);

  function handleView(id) {
    window.open(`${API}/files/${id}`, '_blank');
  }

  const progressPct = progress
    ? Math.min(100, Math.round((progress.received / progress.total) * 100))
    : 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-mono p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            file<span className="text-amber-400">vault</span>
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            сховище файлів · ліміт 3 MB
          </p>
        </div>

        {/* Upload zone */}
        <div
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`
            relative border-2 border-dashed rounded-xl p-8 mb-6 text-center cursor-pointer
            transition-all duration-200
            ${
              uploading
                ? 'border-amber-400/50 bg-amber-400/5 cursor-not-allowed'
                : 'border-zinc-700 hover:border-amber-400/60 hover:bg-zinc-900'
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.png,.jpeg,.jpg,.txt,.json"
            onChange={handleUpload}
            disabled={uploading}
          />

          {uploading && progress ? (
            <div className="space-y-3">
              <p className="text-amber-400 text-sm">Завантаження...</p>
              <div className="w-full bg-zinc-800 rounded-full h-2">
                <div
                  className="bg-amber-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="text-zinc-400 text-xs">
                {formatSize(progress.received)} / {formatSize(progress.total)} ·{' '}
                {progressPct}%
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-3xl">⬆</div>
              <p className="text-zinc-300 text-sm">Натисни щоб обрати файл</p>
              <p className="text-zinc-600 text-xs">
                pdf · png · jpeg · txt · json
              </p>
            </div>
          )}
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-900/40 border border-red-700/50 rounded-lg text-red-300 text-sm flex justify-between">
            <span>⚠ {error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-300"
            >
              ✕
            </button>
          </div>
        )}
        {success && (
          <div className="mb-4 px-4 py-3 bg-green-900/40 border border-green-700/50 rounded-lg text-green-300 text-sm flex justify-between">
            <span>✓ {success}</span>
            <button
              onClick={() => setSuccess(null)}
              className="text-green-500 hover:text-green-300"
            >
              ✕
            </button>
          </div>
        )}

        {/* File list */}
        <div className="space-y-2">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xs text-zinc-500 uppercase tracking-widest">
              Файли
            </h2>
            <button
              onClick={fetchFiles}
              className="text-xs text-zinc-600 hover:text-amber-400 transition-colors"
            >
              ↺ оновити
            </button>
          </div>

          {files.length === 0 ? (
            <div className="text-center py-12 text-zinc-700 text-sm">
              Файлів поки немає
            </div>
          ) : (
            files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors group"
              >
                <span className="text-xl shrink-0">
                  {ICONS[file.mimeType] ?? '📁'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-200 truncate">
                    {file.fileName}
                  </p>
                  <p className="text-xs text-zinc-600">
                    {formatSize(file.size)} · {formatDate(file.createdAt)}
                  </p>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleView(file.id)}
                    className="text-xs px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                  >
                    перегляд
                  </button>
                  <button
                    onClick={() => handleDelete(file.id)}
                    className="text-xs px-2 py-1 rounded bg-zinc-800 hover:bg-red-900/60 text-zinc-400 hover:text-red-400 transition-colors"
                  >
                    видалити
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
