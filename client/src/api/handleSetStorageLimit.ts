export default async function handleSetStorageLimit(
  api: string,
  bytes: number,
  setError: (msg: string | null) => void,
  onSuccess: () => void,
): Promise<void> {
  setError(null);
  try {
    const res = await fetch(`${api}/storage/limit`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: bytes }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.message ?? 'Помилка оновлення ліміту');
      return;
    }
    onSuccess();
  } catch {
    setError('Помилка зʼєднання з сервером');
  }
}
