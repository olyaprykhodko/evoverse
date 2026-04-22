import { useState } from 'react';
import { deleteAccount, updateProfile } from '../api/user-api';
import { Auth, SafeUser } from '../types/users';
import formatSize from '../utils/formatSize';
import formatDate from '../utils/formatDate';

interface UserProfileProps {
  user: SafeUser;
  auth: Auth;
  api: string;
  onLogout: () => void;
  onUserUpdate: (user: SafeUser, auth: Auth) => void;
}

export default function UserProfile({
  user,
  auth,
  api,
  onLogout,
  onUserUpdate,
}: UserProfileProps) {
  const [name, setName] = useState(user.name);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSaveName = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    const { user: updated, error: err } = await updateProfile(api, auth, {
      name: name.trim(),
    });
    setLoading(false);
    if (err) {
      setError(err);
    } else if (updated) {
      setSuccess("Ім'я оновлено");
      onUserUpdate(updated as SafeUser, auth);
    }
  };

  const handleSavePassword = async () => {
    if (!currentPassword || !newPassword) {
      setError('Введіть поточний та новий пароль');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Паролі не збігаються');
      return;
    }
    if (newPassword.length < 6) {
      setError('Новий пароль має бути не менше 6 символів');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    const { error: err } = await updateProfile(api, auth, {
      currentPassword,
      newPassword,
    });
    setLoading(false);
    if (err) {
      setError(err);
    } else {
      setSuccess('Пароль змінено. Будь ласка, увійдіть знову.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => onLogout(), 2000);
    }
  };

  const handleDelete = async () => {
    const { error: err } = await deleteAccount(api, auth);
    if (err) {
      setError(err);
    } else {
      onLogout();
    }
  };

  return (
    <div className="space-y-6">
      {/* User info */}
      <div className="border border-background-200 rounded-md p-4 bg-background-50">
        <h2 className="text-sm font-semibold text-primary-600 mb-3">
          Інформація
        </h2>
        <div className="space-y-1 text-sm text-background-700">
          <p>
            <span className="text-background-500">Email:</span> {user.email}
          </p>
          <p>
            <span className="text-background-500">Роль:</span>{' '}
            {user.role === 'admin' ? 'Адміністратор' : 'Користувач'}
          </p>
          <p>
            <span className="text-background-500">Ліміт:</span>{' '}
            {formatSize(user.storageLimitBytes)}
          </p>
          <p>
            <span className="text-background-500">Акаунт створено:</span>{' '}
            {formatDate(user.createdAt)}
          </p>
        </div>
      </div>

      {/* Change name */}
      <div className="border border-background-200 rounded-md p-4">
        <h2 className="text-sm font-semibold text-primary-600 mb-3">
          Змінити ім'я
        </h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 text-sm border border-background-300 rounded px-3 py-1.5 focus:outline-none focus:border-primary-500"
          />
          <button
            onClick={handleSaveName}
            disabled={loading || name.trim() === user.name}
            className="text-sm px-3 py-1.5 border border-primary-500 rounded text-primary-600 hover:bg-primary-500 hover:text-white transition disabled:opacity-40"
          >
            Зберегти
          </button>
        </div>
      </div>

      {/* Change password */}
      <div className="border border-background-200 rounded-md p-4">
        <h2 className="text-sm font-semibold text-primary-600 mb-3">
          Змінити пароль
        </h2>
        <div className="space-y-2">
          <input
            type="password"
            placeholder="Поточний пароль"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full text-sm border border-background-300 rounded px-3 py-1.5 focus:outline-none focus:border-primary-500"
          />
          <input
            type="password"
            placeholder="Новий пароль"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full text-sm border border-background-300 rounded px-3 py-1.5 focus:outline-none focus:border-primary-500"
          />
          <input
            type="password"
            placeholder="Повторіть новий пароль"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full text-sm border border-background-300 rounded px-3 py-1.5 focus:outline-none focus:border-primary-500"
          />
          <button
            onClick={handleSavePassword}
            disabled={loading}
            className="text-sm px-3 py-1.5 border border-primary-500 rounded text-primary-600 hover:bg-primary-500 hover:text-white transition disabled:opacity-40"
          >
            Змінити пароль
          </button>
        </div>
      </div>

      {/* Feedback */}
      {error && (
        <p className="text-sm text-warning-600 border border-warning-300 rounded px-3 py-2 bg-red-50">
          {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-green-700 border border-green-300 rounded px-3 py-2 bg-green-50">
          {success}
        </p>
      )}

      {/* Logout & Delete */}
      <div className="flex gap-3 pt-2 border-t border-background-200">
        <button
          onClick={onLogout}
          className="text-sm px-3 py-1.5 border border-background-400 rounded text-background-700 hover:text-background-900 hover:border-background-600 transition"
        >
          Вийти
        </button>
        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-warning-600">
              Видалити акаунт і всі файли?
            </span>
            <button
              onClick={handleDelete}
              className="text-xs px-2 py-1 border border-warning-600 rounded text-red-700 hover:bg-red-700 hover:text-white transition"
            >
              Так
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-xs px-2 py-1 border border-background-400 rounded text-background-700 transition"
            >
              Ні
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-sm px-3 py-1.5 border border-background-400 rounded text-warning-600 hover:border-warning-400 transition"
          >
            Видалити акаунт
          </button>
        )}
      </div>
    </div>
  );
}
