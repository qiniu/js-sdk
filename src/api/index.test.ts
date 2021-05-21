import { DEFAULT_CHUNK_SIZE, Config } from '../upload'
import { region } from '../config'

import { getUploadUrl } from '.'

jest.mock('../utils', () => ({
  ...jest.requireActual('../utils') as any,

  request: () => Promise.resolve({
    data: {
      up: {
        acc: {
          main: ['mock.qiniu.com']
        }
      }
    }
  }),
  getPutPolicy: () => ({
    ak: 'ak',
    bucket: 'bucket'
  })
}))

describe('api function test', () => {
  test('getUploadUrl', async () => {
    const config: Config = {
      useCdnDomain: true,
      disableStatisticsReport: false,
      retryCount: 3,
      checkByMD5: false,
      uphost: '',
      upprotocol: 'https',
      forceDirect: false,
      chunkSize: DEFAULT_CHUNK_SIZE,
      concurrentRequestLimit: 3
    }

    let url: string
    const token = 'token'

    url = await getUploadUrl(config, token)
    expect(url).toBe('https://mock.qiniu.com')

    config.region = region.z0
    url = await getUploadUrl(config, token)
    expect(url).toBe('https://upload.qiniup.com')

    config.upprotocol = 'https'
    url = await getUploadUrl(config, token)
    expect(url).toBe('https://upload.qiniup.com')

    config.upprotocol = 'http'
    url = await getUploadUrl(config, token)
    expect(url).toBe('http://upload.qiniup.com')

    config.upprotocol = 'https:'
    url = await getUploadUrl(config, token)
    expect(url).toBe('https://upload.qiniup.com')

    config.upprotocol = 'http:'
    url = await getUploadUrl(config, token)
    expect(url).toBe('http://upload.qiniup.com')

    config.uphost = 'qiniu.com'
    url = await getUploadUrl(config, token)
    expect(url).toBe('http://qiniu.com')
  })
})
