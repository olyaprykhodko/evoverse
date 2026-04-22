import { Auth, SafeUser } from '../types/users';
import formatSize from '../utils/formatSize';

interface UserInfoProps {
  user: SafeUser;
  auth: Auth;
  api: string;
  blocked: boolean;
  onLogout: () => void;
  adminView?: boolean;
  onToggleAdmin?: () => void;
  profileView?: boolean;
  onToggleProfile?: () => void;
}

export default function UserInfo({
  user,
  blocked,
  onLogout,
  adminView,
  onToggleAdmin,
  profileView,
  onToggleProfile,
}: UserInfoProps) {
  return (
    <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#21262d]">
      <div>
        <p className="text-sm font-medium text-primary-600">{user.name}</p>
        <p className="text-xs text-background-700">
          {user.email}{' '}
          {blocked ? '' : `Ліміт: ${formatSize(user.storageLimitBytes)}`}
        </p>
      </div>
      <div className="flex gap-2 items-center">
        {user.role === 'admin' && onToggleAdmin && (
          <button
            onClick={onToggleAdmin}
            className={`text-xs px-2 py-1 border rounded transition ${
              adminView
                ? 'border-primary-500 bg-primary-500 text-white'
                : 'border-background-600 text-primary-500 hover:border-primary-500'
            }`}
          >
            Панель керування
          </button>
        )}
        {onToggleProfile && !blocked && (
          <button
            onClick={onToggleProfile}
            className={`text-xs px-2 py-1 border rounded transition ${
              profileView
                ? 'border-primary-500 bg-primary-500 text-white'
                : 'border-background-600 text-background-700 hover:text-background-900'
            }`}
          >
            Профіль
          </button>
        )}
        <button
          onClick={onLogout}
          className="text-xs px-2 py-1 border border-background-600 rounded text-background-700 hover:text-background-900 transition"
        >
          Вийти
        </button>
      </div>
    </div>
  );
}
