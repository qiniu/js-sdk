import { UploadConfig } from '../../types'
import { UploadContext } from '../context'
import { getDefaultRegionsHostsRetrier, getDefaultRegionsProvider, ServiceName } from '../region'

export function initUploadConfig(config: UploadConfig): Required<UploadConfig> {
  if (!config.httpClient) throw new Error('HttpClient parameter must be set')
  if (!config.tokenProvider) throw new Error('TokenProvider parameter must be set')

  const logLevel = config.logLevel || 'NONE'
  const protocol = config.protocol || 'HTTPS'
  const accelerateUploading = config.accelerateUploading || false
  const uploadHosts = config.uploadHosts || []
  let bucketServerHosts = [
    'uc.qiniuapi.com',
    'kodo-config.qiniuapi.com',
    'uc.qbox.me'
  ]
  if (Array.isArray(config.bucketServerHosts) && config.bucketServerHosts.length) {
    bucketServerHosts = config.bucketServerHosts
  } else if (config.apiServerUrl) {
    const domain = config.apiServerUrl.split('://')[1]
    if (domain) {
      bucketServerHosts = [config.apiServerUrl]
    } else {
      throw new Error('Invalid apiServerUrl, and please use bucketServerHosts instead of it')
    }
  }
  const apiServerUrl = config.apiServerUrl || `${protocol.toLowerCase()}://${bucketServerHosts[0]}`

  const httpClient = config.httpClient
  const regionsProviderGetter = config.regionsProviderGetter
    || ((context: UploadContext) => getDefaultRegionsProvider({
      httpClient,
      bucketServerHosts,
      memoryCache: config.regionsMemoryCache,
      persistentCache: config.regionsPersistentCache,
      serverProtocol: protocol,
      accessKey: context.token!.assessKey,
      bucketName: context.token!.bucket
    }))
  const uploadRetrierGetter = config.uploadRetrierGetter
    || ((context: UploadContext) => getDefaultRegionsHostsRetrier({
      regionsProvider: regionsProviderGetter(context),
      serviceNames: accelerateUploading ? [ServiceName.UP_ACC, ServiceName.UP] : [ServiceName.UP]
    }))

  return {
    ...config,
    protocol,
    apiServerUrl,
    bucketServerHosts,
    logLevel,
    accelerateUploading,
    uploadHosts,
    regionsProviderGetter,
    uploadRetrierGetter
  } as Required<UploadConfig> // TODO: this `as` statement has type error risk
}
