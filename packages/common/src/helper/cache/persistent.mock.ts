import { MemoryCacheManager, PersistentCacheManager } from './index'

export class MockCacheManager<T> extends MemoryCacheManager<T> implements PersistentCacheManager<T> {
  persistLocation = ''

  get = jest.fn<Promise<T | null>, [string]>(() => Promise.resolve(null))
  set = jest.fn<Promise<void>, [string, T]>(() => Promise.resolve())
  delete = jest.fn<Promise<void>, [string]>(() => Promise.resolve())
}
