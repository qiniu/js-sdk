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

  test('Direct: refreshes token after 401.', async () => {
    let requestCount = 0
    const getUpToken = jest.fn(() => Promise.resolve(testToken))
    mockApi.setInterceptor('direct', () => {
      requestCount += 1
      if (requestCount === 1) return Promise.reject(errorMap.expiredToken)
      return Promise.resolve({ data: { key: 'refreshed' }, reqId: 'req-id' })
    })

    const result = await observablePromisify(upload(File3M, null, testToken, undefined, { getUpToken }))

    expect(result).toStrictEqual({ key: 'refreshed' })
    expect(requestCount).toBe(2)
    expect(getUpToken).toHaveBeenCalledTimes(1)
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

  test('Resume: refreshes token before making file.', async () => {
    let requestCount = 0
    const getUpToken = jest.fn(() => testToken)
    mockApi.setInterceptor('uploadComplete', () => {
      requestCount += 1
      if (requestCount === 1) return Promise.reject(errorMap.expiredToken)
      return Promise.resolve({ data: { key: 'refreshed' }, reqId: 'req-id' })
    })

    const result = await observablePromisify(upload(File5M, null, testToken, undefined, { getUpToken }))

    expect(result).toStrictEqual({ key: 'refreshed' })
    expect(requestCount).toBe(2)
    expect(getUpToken).toHaveBeenCalledTimes(1)
  })

  test('Resume: shares token refresh between concurrent chunks.', async () => {
    let requestCount = 0
    const getUpToken = jest.fn(() => new Promise<string>(resolve => {
      setTimeout(() => resolve(testToken), 10)
    }))
    mockApi.setInterceptor('uploadChunk', () => {
      requestCount += 1
      if (requestCount <= 2) return Promise.reject(errorMap.expiredToken)
      return Promise.resolve({
        data: { etag: `etag-${requestCount}`, md5: `md5-${requestCount}` },
        reqId: 'req-id'
      })
    })

    await observablePromisify(upload(File5M, null, testToken, undefined, { getUpToken }))

    expect(getUpToken).toHaveBeenCalledTimes(1)
    expect(requestCount).toBe(4)
  })

  test('does not refresh a token with a different scope.', async () => {
    const getUpToken = jest.fn(() => 'invalid-token')
    mockApi.setInterceptor('direct', () => Promise.reject(errorMap.expiredToken))

    await expect(observablePromisify(upload(File3M, null, testToken, undefined, { getUpToken })))
      .rejects.toMatchObject({ name: 'InvalidToken' })
    expect(getUpToken).toHaveBeenCalledTimes(1)
  })
})
