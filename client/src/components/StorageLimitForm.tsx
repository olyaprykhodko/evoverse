import { useState } from 'react';
import handleSetStorageLimit from '../api/handleSetStorageLimit';

interface StorageLimitFormProps {
  api: string;
  currentLimit: number;
  onUpdated: () => void;
  formatSize: (bytes: number) => string;
}

const PRESETS = [
  { label: '3 MB', bytes: 3 * 1024 * 1024 },
  { label: '10 MB', bytes: 10 * 1024 * 1024 },
  { label: '50 MB', bytes: 50 * 1024 * 1024 },
  { label: '100 MB', bytes: 100 * 1024 * 1024 },
  { label: '500 MB', bytes: 500 * 1024 * 1024 },
  { label: '1 GB', bytes: 1024 * 1024 * 1024 },
];

export default function StorageLimitForm({
  api,
  currentLimit,
  onUpdated,
  formatSize,
}: StorageLimitFormProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const apply = async (bytes: number) => {
    setLoading(true);
    await handleSetStorageLimit(api, bytes, setError, () => {
      onUpdated();
      setOpen(false);
    });
    setLoading(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs px-2 py-1 rounded border border-background-600 text-background-700 hover:text-background-900 transition"
      >
        Змінити ліміт
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white border border-[#30363d] rounded-lg p-6 max-w-sm w-full shadow-xl">
            <h2 className="text-background-700 font-semibold text-base mb-1">
              Ліміт сховища
            </h2>
            <p className="text-background-600 text-xs mb-4">
              Поточний ліміт:{' '}
              <span className="font-medium">{formatSize(currentLimit)}</span>
            </p>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {PRESETS.map((p) => (
                <button
                  key={p.bytes}
                  disabled={loading}
                  onClick={() => apply(p.bytes)}
                  className={`text-sm px-2 py-1.5 border rounded transition
                    ${
                      currentLimit === p.bytes
                        ? 'border-moss-500 bg-moss-300 text-stack-800'
                        : 'border-background-600 bg-transparent text-background-700 hover:bg-moss-200'
                    }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {error && <p className="text-warning-600 text-xs mb-3">{error}</p>}

            <div className="flex justify-end">
              <button
                onClick={() => {
                  setOpen(false);
                  setError(null);
                }}
                className="text-sm px-4 py-1.5 border border-[#30363d] rounded bg-transparent text-background-500 hover:text-background-800 transition"
              >
                Закрити
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
