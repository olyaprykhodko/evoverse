import type { SafeUser } from '../types/users';
import type { Auth, AdminUser } from '../types/users';
import { basicAuth } from './basicAuth';

// реєстрація юзера
export async function signup(
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

// логін
export async function login(
  api: string,
  auth: Auth,
): Promise<{ user?: SafeUser; error?: string }> {
  try {
    const res = await fetch(`${api}/users/me`, {
      headers: { Authorization: basicAuth(auth) },
    });
    const json = await res.json();
    if (!res.ok) return { error: json.message ?? 'Невірний email або пароль' };
    return { user: json };
  } catch {
    return { error: 'Помилка зʼєднання з сервером' };
  }
}

// оновлення профілю
export async function updateProfile(
  api: string,
  auth: Auth,
  data: { name?: string; currentPassword?: string; newPassword?: string },
): Promise<{ user?: SafeUser; error?: string }> {
  try {
    const res = await fetch(`${api}/users/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: basicAuth(auth),
      },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) return { error: json.message ?? 'Помилка оновлення профілю' };
    return { user: json };
  } catch {
    return { error: 'Помилка зʼєднання з сервером' };
  }
}

// видалення акаунту
export async function deleteAccount(
  api: string,
  auth: Auth,
): Promise<{ error?: string }> {
  try {
    const res = await fetch(`${api}/users/me`, {
      method: 'DELETE',
      headers: { Authorization: basicAuth(auth) },
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

// отримання списку всіх юзерів (адмін)
export async function adminGetUsers(
  api: string,
  auth: Auth,
): Promise<{ users?: AdminUser[]; error?: string }> {
  try {
    const res = await fetch(`${api}/users/admin/users`, {
      headers: { Authorization: basicAuth(auth) },
    });
    const json = await res.json();
    if (!res.ok) return { error: json.message ?? 'Помилка завантаження' };
    return { users: json };
  } catch {
    return { error: 'Помилка зʼєднання з сервером' };
  }
}

// зміна ліміту сховища юзера (адмін)
export async function adminUpdateStorageLimit(
  api: string,
  auth: Auth,
  userId: string,
  storageLimitMb: number,
): Promise<{ user?: SafeUser; error?: string }> {
  try {
    const res = await fetch(`${api}/users/admin/users/${userId}/storage`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: basicAuth(auth),
      },
      body: JSON.stringify({ storageLimitMb }),
    });
    const json = await res.json();
    if (!res.ok) return { error: json.message ?? 'Помилка' };
    return { user: json };
  } catch {
    return { error: 'Помилка зʼєднання з сервером' };
  }
}

// блокування/розблокування юзера (адмін)
export async function adminToggleBlock(
  api: string,
  auth: Auth,
  userId: string,
): Promise<{ user?: SafeUser; error?: string }> {
  try {
    const res = await fetch(`${api}/users/admin/users/${userId}/block`, {
      method: 'PATCH',
      headers: { Authorization: basicAuth(auth) },
    });
    const json = await res.json();
    if (!res.ok) return { error: json.message ?? 'Помилка' };
    return { user: json };
  } catch {
    return { error: 'Помилка зʼєднання з сервером' };
  }
}

// видалення файлів юзера (адмін)
export async function adminDeleteFile(
  api: string,
  auth: Auth,
  userId: string,
  fileId: string,
): Promise<{ error?: string }> {
  try {
    const res = await fetch(`${api}/files/admin/${userId}/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: basicAuth(auth) },
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      return { error: json.message ?? 'Помилка видалення файлу' };
    }
    return {};
  } catch {
    return { error: 'Помилка зʼєднання з сервером' };
  }
}

// видалення юзера (адмін)
export async function adminDeleteUser(
  api: string,
  auth: Auth,
  userId: string,
): Promise<{ error?: string }> {
  try {
    const res = await fetch(`${api}/users/admin/users/${userId}`, {
      method: 'DELETE',
      headers: { Authorization: basicAuth(auth) },
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      return { error: json.message ?? 'Помилка видалення' };
    }
    return {};
  } catch {
    return { error: 'Помилка зʼєднання з сервером' };
  }
}
