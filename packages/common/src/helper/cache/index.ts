interface CacheManager<T> {
  get(key: string): Promise<T | null>;
  set(key: string, val: T): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface PersistentCacheManager<T> extends CacheManager<T> {
  persistLocation: string
}

export class MemoryCacheManager<T> implements CacheManager<T> {
  private cache: Map<string, T> = new Map()

  async get(key: string): Promise<T | null> {
    return this.cache.get(key) ?? null
  }

  async set(key: string, val: T): Promise<void> {
    this.cache.set(key, val)
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key)
  }
}

export class PersistentNever<T = any> implements PersistentCacheManager<T> {
  persistLocation: string

  constructor() {
    this.persistLocation = ''
  }

  async get(key: string): Promise<T | null> {
    return null
  }

  async set(key: string, val: T): Promise<void> {
    // do nothing
  }

  async delete(key: string): Promise<void> {
    // do nothing
  }
}
