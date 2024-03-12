import { UploadConfig } from '../../types'

export function initUploadConfig(config: UploadConfig): Required<UploadConfig> {
  if (!config.httpClient) throw new Error('HttpClient parameter must be set')
  if (!config.tokenProvider) throw new Error('TokenProvider parameter must be set')

  const logLevel = config.logLevel || 'NONE'
  const protocol = config.protocol || 'HTTPS'
  const uploadHosts = config.uploadHosts || []
  const serverUrl = config.serverUrl || 'https://api.qiniu.com'

  return { ...config, protocol, serverUrl, logLevel } as Required<UploadConfig>
}
