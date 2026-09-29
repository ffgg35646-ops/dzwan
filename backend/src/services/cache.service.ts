type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry<unknown>>();

export function cacheGet<T>(key: string): T | null {
  const entry = cache.get(key);

  if (!entry) return null;

  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }

  return entry.value as T;
}

export function cacheSet<T>(
  key: string,
  value: T,
  ttlMs = 30_000,
): T {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });

  return value;
}

export function cacheDelete(key: string): void {
  cache.delete(key);
}

export function cacheDeletePrefix(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

export function cacheClear(): void {
  cache.clear();
}
