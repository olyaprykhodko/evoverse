import type { Auth } from '../types/users';

export function basicAuth(auth: Auth): string {
  return 'Basic ' + btoa(`${auth.email}:${auth.password}`);
}
