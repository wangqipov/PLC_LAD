import { deepClone } from '@/app/common/objects';

interface CacheEntry {
  value: unknown;
  at: number;
}

/**
 * In-memory cache for snapshots that should outlive a page unmount
 * (Link soft navigation). Not a disk persist.
 */
export class MemoryCache {
  private readonly map = new Map<string, CacheEntry>();

  has(key: string): boolean {
    return this.map.has(key);
  }

  get<T>(key: string): T | undefined {
    return this.map.get(key)?.value as T | undefined;
  }

  set<T>(key: string, value: T): T {
    this.map.set(key, { value, at: Date.now() });
    return value;
  }

  /** Store a deep clone so later mutations of the source do not leak unless intended. */
  snapshot<T>(key: string, value: T): T {
    return this.set(key, deepClone(value));
  }

  delete(key: string): void {
    this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
  }
}

export const appCache = new MemoryCache();
