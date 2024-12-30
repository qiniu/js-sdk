// In face, this tests have included policies tests.
// So it's ok to remove the policies tests.
import { getDefaultHostsRetrier, shouldNextAttempt } from './default'
import { HostsRetryContext } from './policies'
import { Retrier, Attempt, FixedBackoff } from '../../../../helper/retry'
import { Result, isSuccessResult, isCanceledResult } from '../../../../types/types'
import { NEVER_RETRY_ERROR_NAMES, HttpRequestError, UploadError } from '../../../../types/error'
import { Host } from '../host'

import { MockHttpClient } from '../../../../types/http.mock'
import { HttpClientOptions } from '../../../../types/http'
import { MockProgress } from '../../../..'

describe('getDefaultHostsRetrier', () => {
  let retrier: Retrier<Result<any>>
  let hosts: Host[]
  const mockHttpClient = new MockHttpClient()

  beforeAll(() => {
    mockHttpClient.post.mockImplementation((url: string, _opts?: HttpClientOptions) => {
      if (url.includes('js-sdk3')) {
        return Promise.resolve({
          result: {
            code: 200,
            data: '{}'
          }
        })
      }
      return Promise.resolve({
        error: new UploadError('HttpRequestError', 'mock request error')
      })
    })
  })

  afterAll(() => {
    mockHttpClient.post.mockClear()
  })

  beforeEach(() => {
    hosts = [
      new Host('js-sdk1.qiniu.com', 'HTTP'),
      new Host('js-sdk2.qiniu.com', 'HTTP'),
      new Host('js-sdk3.qiniu.com', 'HTTP')
    ]
    retrier = getDefaultHostsRetrier({ hosts })
    // the cases timeout default is 5000ms
    // don't wait it too long
    retrier.backoff = new FixedBackoff(100)
  })

  test('test retrier init', async () => {
    const context: HostsRetryContext = {}
    await retrier.initContext(context)

    expect(context.host).toEqual(hosts[0])
    expect(context.alternativeHosts).toEqual([hosts[1], hosts[2]])
  })

  test('test retrier retryDo', async () => {
    const context: HostsRetryContext = {}
    await retrier.initContext(context)

    const result = await retrier.tryDo((ctx: HostsRetryContext) => {
      if (!ctx.host) {
        return Promise.resolve({
          error: new UploadError('InvalidUploadHost', 'invalid upload host')
        })
      }
      return mockHttpClient.post(ctx.host?.getUrl(), undefined)
    })

    if (!isSuccessResult(result)) {
      throw new Error('expect the result is successful')
    }
    expect(result.result.code).toBe(200)
    expect(result.result.data).toBe('{}')
    expect(mockHttpClient.post).toBeCalledTimes(3)
  })
})
