export const chains = new Map<string, Promise<void>>();

export async function withLock<T>(
  key: string,
  fn: () => Promise<T>,
): Promise<T> {
  const prev = chains.get(key) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  const mine = prev.then(
    () => gate,
    () => gate,
  );
  chains.set(key, mine);

  await prev.catch(() => {});
  try {
    return await fn();
  } finally {
    release();
    if (chains.get(key) === mine) chains.delete(key);
  }
}
