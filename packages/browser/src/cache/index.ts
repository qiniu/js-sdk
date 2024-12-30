import * as common from '../@internal'

export class LocalStorageCacheManager<T> implements common.cache.PersistentCacheManager<T> {
  persistPath: string;

  constructor(persistLocation: string) {
    this.persistPath = persistLocation
  }

  async get(key: string): Promise<T | null> {
    const itemKey = this.getPersistKey(key)
    const raw = localStorage.getItem(itemKey)
    if (!raw) {
      return null
    }
    return this.parse(raw)
  }

  async set(key: string, val: T): Promise<void> {
    const itemKey = this.getPersistKey(key)
    const raw = this.stringify(val)
    localStorage.setItem(itemKey, raw)
  }

  async delete(key: string): Promise<void> {
    const itemKey = this.getPersistKey(key)
    localStorage.removeItem(itemKey)
  }

  private getPersistKey(key: string): string {
    return `qnsdk:${this.persistPath}:${key}`
  }

  private parse(val: string): T {
    return JSON.parse(val)
  }

  private stringify(val: T): string {
    return JSON.stringify(val)
  }
}
