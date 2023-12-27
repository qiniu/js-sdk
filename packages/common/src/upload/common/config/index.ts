import { UploadConfig } from '../../types'

export function initUploadConfig(config: UploadConfig): Required<UploadConfig> {
  if (!config.httpClient) throw new Error('HttpClient parameter must be set')
  if (!config.tokenProvider) throw new Error('TokenProvider parameter must be set')

  const protocol = config.protocol || 'HTTPS'
  const serverUrl = config.serverUrl || 'https://api.qiniu.com'

  return { ...config, protocol, serverUrl } as Required<UploadConfig>
}
