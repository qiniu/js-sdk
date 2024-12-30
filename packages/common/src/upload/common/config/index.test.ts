import { MockHttpClient } from '../../../types/http.mock'
import { initUploadConfig } from './index'

describe('test config', () => {
  test('test check required options in runtime', () => {
    expect(() => {
      initUploadConfig({
        tokenProvider: () => Promise.resolve('mock_token')
      })
    })
      .toThrow('HttpClient parameter must be set')
  })

  test('test config default values', () => {
    const config = initUploadConfig({
      httpClient: new MockHttpClient(),
      tokenProvider: () => Promise.resolve('mock_token')
    })

    expect(config.logLevel).toBe('NONE')
    expect(config.protocol).toBe('HTTPS')
    expect(config.accelerateUploading).toBe(false)
    expect(config.uploadHosts).toEqual([])
    expect(config.bucketServerHosts).toEqual(['uc.qbox.me'])
    expect(config.apiServerUrl).toBe('https://uc.qbox.me')

    // provider and retrier see other test cases
  })
})
