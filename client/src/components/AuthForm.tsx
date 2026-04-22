import { useState } from 'react';
import { signup, login } from '../api/user-api';
import { Auth, SafeUser } from '../types/users';

interface AuthFormProps {
  api: string;
  onAuth: (auth: Auth, user: SafeUser) => void;
}

export default function AuthForm({ api, onAuth }: AuthFormProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [storageLimitMb, setStorageLimitMb] = useState(100);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const auth: Auth = { email, password };

    if (mode === 'register') {
      const { user, error: err } = await signup(api, {
        name,
        email,
        password,
        storageLimitMb,
      });
      if (err) {
        setError(err);
        setLoading(false);
        return;
      }
      onAuth(auth, user!);
    } else {
      const { user, error: err } = await login(api, auth);
      if (err) {
        setError(err);
        setLoading(false);
        return;
      }
      onAuth(auth, user!);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-sm w-full">
        <h1 className="text-2xl font-semibold tracking-tight mb-1 text-center">
          <span className="text-primary-500">File</span>
          <span className="text-primary-700">Storage</span>
        </h1>
        <p className="text-background-700 text-sm mb-6 text-center">
          {mode === 'login'
            ? 'Увійдіть у свій акаунт'
            : 'Створіть новий акаунт'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'register' && (
            <input
              type="text"
              placeholder="Імʼя"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              className="w-full px-3 py-2 border border-background-600 rounded text-sm bg-white text-gray-700 focus:outline-none focus:border-primary-500"
            />
          )}

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border border-background-600 rounded text-sm bg-white text-gray-700 focus:outline-none focus:border-primary-500"
          />

          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-3 py-2 border border-background-600 rounded text-sm bg-white text-gray-700 focus:outline-none focus:border-primary-500"
          />

          {mode === 'register' && (
            <div>
              <label className="text-xs text-background-700 mb-1 block">
                Ліміт сховища (MB)
              </label>
              <select
                value={storageLimitMb}
                onChange={(e) => setStorageLimitMb(Number(e.target.value))}
                className="w-full px-3 py-2 border border-background-600 rounded text-sm bg-white text-gray-700 focus:outline-none focus:border-primary-500"
              >
                <option value={3}>3 MB</option>
                <option value={10}>10 MB</option>
                <option value={50}>50 MB</option>
                <option value={100}>100 MB</option>
                <option value={500}>500 MB</option>
                <option value={1024}>1 GB</option>
              </select>
            </div>
          )}

          {error && <p className="text-warning-600 text-xs">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-moss-300 border border-background-600 rounded text-stack-800 text-sm font-medium hover:bg-moss-400 hover:border-background-700 transition disabled:opacity-50"
          >
            {loading ? '...' : mode === 'login' ? 'Увійти' : 'Зареєструватися'}
          </button>
        </form>

        <p className="text-center text-xs text-background-700 mt-4">
          {mode === 'login' ? (
            <>
              Немає акаунта?{' '}
              <button
                onClick={() => {
                  setMode('register');
                  setError(null);
                }}
                className="text-primary-500 hover:underline"
              >
                Зареєструватися
              </button>
            </>
          ) : (
            <>
              Вже є акаунт?{' '}
              <button
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                className="text-primary-500 hover:underline"
              >
                Увійти
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
