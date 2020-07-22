import { getUploadUrl } from '../api'
import { DEFAULT_CHUNK_SIZE, Config } from '../upload/base'
import { region } from '../config'

describe('api function test', () => {
  test('getUploadUrl', async () => {
    let config: Config = {
      useCdnDomain: true,
      disableStatisticsReport: false,
      retryCount: 3,
      checkByMD5: false,
      uphost: '',
      upprotocol: 'https:',
      forceDirect: false,
      chunkSize: DEFAULT_CHUNK_SIZE,
      concurrentRequestLimit: 3
    }

    let url: string
    const token = '4TUDv7mcubtP5yWqzrZiI0YEVLSLEu3NlVvCxT-D:UUEt7wiIOSlS7AoCx9w_pABEFtI=:eyJkZWxldGVBZnRlckRheXMiOjEsInJldHVybkJvZHkiOiJ7XCJrZXlcIjpcIiQoa2V5KVwiLFwiaGFzaFwiOlwiJChldGFnKVwiLFwiZnNpemVcIjokKGZzaXplKSxcImJ1Y2tldFwiOlwiJChidWNrZXQpXCIsXCJuYW1lXCI6XCIkKHg6bmFtZSlcIn0iLCJzY29wZSI6ImtpbmRvbSIsImRlYWRsaW5lIjoxNTk1NDEzNjQxfQ=='

    config.region = region.z0
    url = await getUploadUrl(config, token)
    expect(url).toBe('https://upload.qiniup.com')

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
