import { ApiName, errorMap, MockApi } from '../api/index.mock'

const mockApi = new MockApi()
jest.mock('../api', () => mockApi)

// eslint-disable-next-line import/first
import { MB, Observable } from '../utils'
// eslint-disable-next-line import/first
import upload from '.'

const testToken = 'lVgtk5xr03Oz_uvkzDtQ8LtpiEUWx5tGEDUZVg1y:rAwZ6rnPQbjyG6Pzkx4PORzn6C8=:eyJyZXR1cm5Cb2R5Ijoie1wia2V5XCI6ICQoa2V5KX0iLCJzY29wZSI6InFpbml1LWRhcnQtc2RrIiwiZGVhZGxpbmUiOjE2MTkzNjA0Mzh9'

function mockFile(size = 4, name = 'mock.jpg', type = 'image/jpg'): File {
  if (size >= 1024) throw new Error('the size is set too large.')

  const blob = new Blob(['1'.repeat(size * MB)], { type })
  return new File([blob], name)
}

function observablePromisify<T, E, C>(observable: Observable<T, E, C>) {
  return new Promise((resolve, reject) => {
    observable.subscribe({
      error: reject,
      complete: resolve
    })
  })
}

const File3M = mockFile(3)
const File4M = mockFile(4)
const File5M = mockFile(5)

describe('test upload', () => {
  beforeEach(() => {
    localStorage.clear() // 清理缓存
    mockApi.clearInterceptor()
  })

  test('base Direct.', async () => {
    // 文件小于 4M 使用直传
    const result1 = await observablePromisify(upload(File3M, null, testToken))
    expect(result1).toStrictEqual((await mockApi.direct()).data)

    // 文件等于 4M 使用直传
    const result2 = await observablePromisify(upload(File4M, null, testToken))
    expect(result2).toStrictEqual((await mockApi.direct()).data)
  })

  test('Direct: all api error state.', async () => {
    for (const error of Object.values(errorMap)) {
      localStorage.clear()
      mockApi.clearInterceptor()
      mockApi.setInterceptor('direct', () => Promise.reject(error))
      // eslint-disable-next-line no-await-in-loop
      await expect(observablePromisify(upload(File3M, null, testToken)))
        .rejects.toStrictEqual(error)
    }
  })

  test('Resume: base.', async () => {
    // 文件大于 4M 使用分片
    const result = await observablePromisify(upload(File5M, null, testToken))
    expect(result).toStrictEqual((await mockApi.uploadComplete()).data)
  })

  test('Resume: all api error state.', async () => {
    const testApiTable: ApiName[] = [
      'getUpHosts', 'initUploadParts',
      'uploadChunk', 'uploadComplete'
    ]

    for (const apiName of testApiTable) {
      for (const error of Object.values(errorMap)) {
        localStorage.clear()
        mockApi.clearInterceptor()
        mockApi.setInterceptor(apiName, (..._: any[]) => Promise.reject(error))
        // eslint-disable-next-line no-await-in-loop
        await expect(observablePromisify(upload(File5M, null, testToken)))
          .rejects.toStrictEqual(error)
      }
    }
  })
})
