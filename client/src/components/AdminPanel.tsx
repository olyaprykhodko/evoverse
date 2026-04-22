import { useState, useEffect, useCallback } from 'react';
import {
  adminGetUsers,
  adminToggleBlock,
  adminUpdateStorageLimit,
  adminDeleteUser,
  adminDeleteFile,
} from '../api/user-api';
import { Auth, AdminUser } from '../types/users';
import formatSize from '../utils/formatSize';
import formatDate from '../utils/formatDate';

interface AdminPanelProps {
  auth: Auth;
  api: string;
}

export default function AdminPanel({ auth, api }: AdminPanelProps) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editingLimit, setEditingLimit] = useState<string | null>(null);
  const [limitValue, setLimitValue] = useState<number>(100);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { users: data, error: err } = await adminGetUsers(api, auth);
    if (err) {
      setError(err);
    } else {
      setUsers(data ?? []);
      setError(null);
    }
  }, [api, auth]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleToggleBlock = async (userId: string) => {
    const { error: err } = await adminToggleBlock(api, auth, userId);
    if (err) setError(err);
    else refresh();
  };

  const handleUpdateLimit = async (userId: string) => {
    const { error: err } = await adminUpdateStorageLimit(
      api,
      auth,
      userId,
      limitValue,
    );
    if (err) {
      setError(err);
    } else {
      setEditingLimit(null);
      refresh();
    }
  };

  const handleDelete = async (userId: string) => {
    const { error: err } = await adminDeleteUser(api, auth, userId);
    if (err) {
      setError(err);
    } else {
      setConfirmDelete(null);
      refresh();
    }
  };

  const handleDeleteFile = async (userId: string, fileId: string) => {
    const { error: err } = await adminDeleteFile(api, auth, userId, fileId);
    if (err) {
      setError(err);
    } else {
      refresh();
    }
  };

  const totalFiles = users.reduce((sum, u) => sum + u.files.length, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-semibold text-background-700 tracking-widest uppercase">
          Користувачі ({users.length}) · Файлів: {totalFiles}
        </h2>
        <button
          onClick={refresh}
          className="text-sm px-2 py-1 rounded text-background-700 hover:text-background-900 transition"
        >
          ↺ Оновити
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 border border-warning-50 bg-warning-600 text-warning-50 rounded-md text-sm">
          {error}
        </div>
      )}

      {users.length === 0 ? (
        <div className="text-center py-12 text-background-700 text-sm border border-[#21262d] rounded">
          Користувачів немає
        </div>
      ) : (
        <ul className="space-y-3">
          {users.map((u) => (
            <li
              key={u.id}
              className={`border rounded p-4 ${u.blocked ? 'border-warning-600 bg-red-50' : 'border-primary-800'}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-primary-600">
                      {u.name}
                    </span>
                    {u.blocked && (
                      <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded">
                        заблоковано
                      </span>
                    )}
                    {u.role === 'admin' && (
                      <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                        адмін
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-background-700 mt-0.5">
                    {u.email} · Зареєстровано: {formatDate(u.createdAt)}
                  </p>
                  <p className="text-xs text-background-700 mt-0.5">
                    Сховище:{' '}
                    {formatSize(u.files.reduce((s, f) => s + f.size, 0))} із{' '}
                    {formatSize(u.storageLimitBytes)} · Файлів: {u.files.length}
                  </p>

                  {u.files.length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-primary-500 cursor-pointer hover:underline">
                        Показати файли ({u.files.length})
                      </summary>
                      <ul className="mt-1 space-y-1 ml-2">
                        {u.files.map((f) => (
                          <li
                            key={f.id}
                            className="text-xs text-background-700 flex items-center justify-between"
                          >
                            <span>
                              📄 {f.originalName} — {formatSize(f.size)}
                            </span>
                            <button
                              onClick={() => handleDeleteFile(u.id, f.id)}
                              className="text-xs px-1.5 py-0.5 text-warning-600 hover:text-red-500 transition ml-2"
                            >
                              ✕
                            </button>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>

                {u.role !== 'admin' && (
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      onClick={() => handleToggleBlock(u.id)}
                      className={`text-xs px-2 py-1 border rounded transition ${
                        u.blocked
                          ? 'border-moss-300 text-moss-500 hover:bg-moss-300 hover:text-white'
                          : 'border-warning-600 text-warning-600 hover:bg-red-700 hover:text-white'
                      }`}
                    >
                      {u.blocked ? 'Розблокувати' : 'Заблокувати'}
                    </button>

                    {editingLimit === u.id ? (
                      <div className="flex gap-1 items-center">
                        <select
                          value={limitValue}
                          onChange={(e) =>
                            setLimitValue(Number(e.target.value))
                          }
                          className="text-xs px-1 py-1 border border-background-600 rounded bg-white"
                        >
                          <option value={3}>3 MB</option>
                          <option value={10}>10 MB</option>
                          <option value={50}>50 MB</option>
                          <option value={100}>100 MB</option>
                          <option value={500}>500 MB</option>
                          <option value={1024}>1 GB</option>
                        </select>
                        <button
                          onClick={() => handleUpdateLimit(u.id)}
                          className="text-xs px-1.5 py-1 border border-primary-500 rounded text-primary-500 hover:bg-primary-500 hover:text-white transition"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => setEditingLimit(null)}
                          className="text-xs px-1.5 py-1 border border-background-600 rounded text-background-700 transition"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingLimit(u.id);
                          setLimitValue(
                            Math.round(u.storageLimitBytes / 1024 / 1024),
                          );
                        }}
                        className="text-xs px-2 py-1 border border-background-600 rounded text-background-700 hover:text-background-900 transition"
                      >
                        Ліміт
                      </button>
                    )}

                    {confirmDelete === u.id ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleDelete(u.id)}
                          className="text-xs px-2 py-1 border border-warning-600 rounded text-red-700 hover:bg-red-700 hover:text-white transition"
                        >
                          Так
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="text-xs px-2 py-1 border border-background-600 rounded text-background-700 transition"
                        >
                          Ні
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(u.id)}
                        className="text-xs px-2 py-1 border border-background-600 rounded text-warning-600 hover:text-warning-500 hover:border-warning-400 transition"
                      >
                        Видалити
                      </button>
                    )}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
