import { Auth } from './fetchFiles';

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  storageLimitBytes: number;
  createdAt: string;
}

export async function registerUser(
  api: string,
  data: {
    name: string;
    email: string;
    password: string;
    storageLimitMb?: number;
  },
): Promise<{ user?: SafeUser; error?: string }> {
  try {
    const res = await fetch(`${api}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) return { error: json.message ?? 'Помилка реєстрації' };
    return { user: json };
  } catch {
    return { error: 'Помилка зʼєднання з сервером' };
  }
}

export async function loginUser(
  api: string,
  auth: Auth,
): Promise<{ user?: SafeUser; error?: string }> {
  try {
    const res = await fetch(`${api}/users/all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: auth.email, password: auth.password }),
    });
    const json = await res.json();
    if (!res.ok) return { error: json.message ?? 'Невірний email або пароль' };
    const users: SafeUser[] = json;
    const me = users.find((u) => u.email === auth.email);
    return me ? { user: me } : { error: 'Користувача не знайдено' };
  } catch {
    return { error: 'Помилка зʼєднання з сервером' };
  }
}

export async function deleteAccount(
  api: string,
  auth: Auth,
  userId: string,
): Promise<{ error?: string }> {
  try {
    const res = await fetch(`${api}/users/${userId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: auth.email, password: auth.password }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      return { error: json.message ?? 'Помилка видалення акаунта' };
    }
    return {};
  } catch {
    return { error: 'Помилка зʼєднання з сервером' };
  }
}
