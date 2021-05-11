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
    let error = null
    let result = null

    // 文件小于等于 4M 使用直传
    try { result = await observablePromisify(upload(File3M, null, testToken)) } catch (err) { error = err }
    expect(result).toStrictEqual((await mockApi.direct()).data)
    expect(error).toStrictEqual(null)

    // 文件等于 4M 使用直传
    try { result = await observablePromisify(upload(File4M, null, testToken)) } catch (err) { error = err }
    expect(result).toStrictEqual((await mockApi.direct()).data)
    expect(error).toStrictEqual(null)
  })

  test('Direct: all api error state.', async () => {
    const testStateTable = [
      'invalidParams', 'expiredToken',
      'gatewayUnavailable', 'serviceUnavailable',
      'serviceTimeout', 'serviceError',
      'invalidUploadId', 'invalidRequest'
    ] as const

    for await (const state of testStateTable) {
      let error = null
      localStorage.clear()
      mockApi.clearInterceptor()
      mockApi.setInterceptor('direct', () => Promise.reject(errorMap[state]))
      try { await observablePromisify(upload(File3M, null, testToken)) } catch (err) { error = err }
      expect(error).toStrictEqual(errorMap[state])
    }
  })

  test('Resume: base.', async () => {
    let error = null
    let result = null

    // 文件大于等于 4M 使用分片
    try { result = await observablePromisify(upload(File5M, null, testToken)) } catch (err) { error = err }
    expect(result).toStrictEqual((await mockApi.uploadComplete()).data)
    expect(error).toStrictEqual(null)
  })

  test('Resume: all api error state.', async () => {
    const testApiTable: ApiName[] = [
      'getUpHosts', 'initUploadParts',
      'uploadChunk', 'uploadComplete'
    ]

    const testStateTable = [
      'invalidParams', 'expiredToken',
      'gatewayUnavailable', 'serviceUnavailable',
      'serviceTimeout', 'serviceError',
      'invalidUploadId', 'invalidRequest'
    ] as const

    for await (const apiName of testApiTable) {
      for await (const state of testStateTable) {
        let error = null
        localStorage.clear()
        mockApi.clearInterceptor()
        mockApi.setInterceptor(apiName, (..._: any[]) => Promise.reject(errorMap[state]))
        try { await observablePromisify(upload(File5M, null, testToken)) } catch (err) { error = err }
        expect(error).toStrictEqual(errorMap[state])
      }
    }
  })
})
