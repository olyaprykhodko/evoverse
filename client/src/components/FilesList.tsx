import { AppFile, StorageInfo } from '../api/fetchFiles';

interface FilesListProps {
  files: AppFile[];
  setFiles: (files: AppFile[]) => void;
  setError: (err: string | null) => void;
  storageInfo: StorageInfo | null;
  setStorageInfo: (info: StorageInfo) => void;
  api: string;
  handleView: (id: string) => void;
  handleDelete: (id: string) => void;
  formatSize: (bytes: number) => string;
  formatDate: (date: string) => string;
  fetchFiles: (
    setFiles: (files: AppFile[]) => void,
    setError: (err: string | null) => void,
    api: string,
    setStorage?: (info: StorageInfo) => void,
  ) => void;
}

export default function FilesList({
  files,
  setFiles,
  setError,
  storageInfo,
  setStorageInfo,
  api,
  handleView,
  handleDelete,
  formatSize,
  formatDate,
  fetchFiles,
}: FilesListProps) {
  const usedPct = storageInfo
    ? Math.min(100, Math.round((storageInfo.used / storageInfo.limit) * 100))
    : 0;

  return (
    <section className="mt-8">
      {storageInfo && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-[#8b949e] mb-1">
            <span>Сховище</span>
            <span>
              {formatSize(storageInfo.used)} із {formatSize(storageInfo.limit)}{' '}
              використано
            </span>
          </div>
          <div className="w-full h-2 rounded bg-[#21262d] overflow-hidden">
            <div
              className="h-full rounded transition-all duration-300"
              style={{
                width: `${usedPct}%`,
                backgroundColor:
                  usedPct >= 90
                    ? '#f85149'
                    : usedPct >= 70
                      ? '#d29922'
                      : '#238636',
              }}
            />
          </div>
        </div>
      )}
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-xs font-semibold text-background-700 tracking-widest uppercase">
          Файли
        </h2>
        <button
          onClick={() => fetchFiles(setFiles, setError, api, setStorageInfo)}
          className="text-sm px-2 py-1 rounded text-background-700 hover:text-background-900 hover:border-blue-500 transition"
        >
          ↺ Оновити
        </button>
      </div>

      {files.length === 0 ? (
        <div className="text-center py-12 text-background-700 text-sm border border-[#21262d] rounded">
          Файлів поки немає
        </div>
      ) : (
        <ul className="divide-y divide-primary-800  border border-primary-800 rounded ">
          {files.map((file) => (
            <li
              key={file.id}
              className="flex items-center gap-4 px-4 py-3 group transition"
            >
              <span className="text-xl shrink-0 select-none">📁</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-primary-600 hover:text-primary-700 cursor:pointer truncate">
                  {file.fileName}
                </p>
                <p className="text-xs text-[#8b949e]">
                  {formatSize(file.size)} · {formatDate(file.createdAt)}
                </p>
              </div>
              <div className="flex gap-2 opacity-100 group-hover:opacity-100 transition">
                <button
                  onClick={() => handleView(file.id)}
                  className="text-sm px-3 py-1 border border-background-600 rounded bg-moss-400 text-white hover:text-white hover:bg-moss-300 transition"
                >
                  Перегляд
                </button>
                <button
                  onClick={() => handleDelete(file.id)}
                  className="text-sm font-medium px-3 py-1 border border-background-600 rounded bg-transparent text-warning-600 hover:text-warning-500 hover:border-warning-400 transition"
                >
                  Видалити
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
