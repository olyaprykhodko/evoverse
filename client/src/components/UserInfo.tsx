import { useState } from 'react';
import { SafeUser, deleteAccount } from '../api/userApi';
import { Auth } from '../api/fetchFiles';
import formatSize from '../utils/formatSize';

interface UserInfoProps {
  user: SafeUser;
  auth: Auth;
  api: string;
  onLogout: () => void;
}

export default function UserInfo({ user, auth, api, onLogout }: UserInfoProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    const { error: err } = await deleteAccount(api, auth, user.id);
    if (err) {
      setError(err);
      return;
    }
    onLogout();
  };

  return (
    <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#21262d]">
      <div>
        <p className="text-sm font-medium text-primary-600">{user.name}</p>
        <p className="text-xs text-background-700">
          {user.email} · Ліміт: {formatSize(user.storageLimitBytes)}
        </p>
      </div>
      <div className="flex gap-2 items-center">
        {error && <span className="text-xs text-warning-600">{error}</span>}
        {confirmDelete ? (
          <>
            <span className="text-xs text-warning-600">
              Видалити акаунт і всі файли?
            </span>
            <button
              onClick={handleDelete}
              className="text-xs px-2 py-1 border border-warning-600 rounded text-red-700 hover:bg-red-700 hover:text-warning-50 transition"
            >
              Так
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-xs px-2 py-1 border border-background-600 rounded text-background-700 hover:text-background-900 transition"
            >
              Ні
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-xs px-2 py-1 border border-background-600 rounded text-warning-600 hover:text-warning-500 hover:border-warning-400 transition"
            >
              Видалити акаунт
            </button>
            <button
              onClick={onLogout}
              className="text-xs px-2 py-1 border border-background-600 rounded text-background-700 hover:text-background-900 transition"
            >
              Вийти
            </button>
          </>
        )}
      </div>
    </div>
  );
}
