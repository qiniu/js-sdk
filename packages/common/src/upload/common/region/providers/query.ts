import { HttpProtocol } from '../../../../types/http'
import { Result, isCanceledResult, isErrorResult, isSuccessResult } from '../../../../types/types'
import { UploadError } from '../../../../types/error'
import { ConfigApis, HostConfig } from '../../../../api'
import { Retrier } from '../../../../helper/retry'

import { Host } from '../../host'

import { Region, ServiceName } from '../region'
import { RegionsProvider } from './types'

function getRegionsFromHostConfig(
  hostConfig: HostConfig,
  serverProtocol: HttpProtocol
) {
  return {
    result: hostConfig.hosts.map(r => {
      const services = {
        [ServiceName.UP]: r.up.domains.concat(r.up.old)
          .map(h => new Host(h, serverProtocol)),
        [ServiceName.UP_ACC]: (r.up.acc_domains || [])
          .map(h => new Host(h, serverProtocol))
      }
      return new Region({
        regionId: r.region,
        services
      })
    })
  }
}

export interface QueryRegionsProviderOptions {
  configApis: ConfigApis
  serverProtocol: HttpProtocol
  retrier: Retrier<Result<HostConfig>>
  accessKey: string
  bucketName: string
}

export class QueryRegionsProvider implements RegionsProvider {

  constructor(
    private readonly options: QueryRegionsProviderOptions
  ) {}

  async getRegions(): Promise<Result<Region[]>> {
    const {
      retrier,
      serverProtocol
    } = this.options
    const hostConfigResult = await retrier.tryDo(ctx => this.getHostConfig(ctx.host))
    if (!hostConfigResult) {
      return {
        error: new UploadError('InternalError', 'get host config failed')
      }
    }
    if (!isSuccessResult(hostConfigResult)) {
      return hostConfigResult
    }
    return getRegionsFromHostConfig(hostConfigResult.result, serverProtocol)
  }

  private async getHostConfig(host: Host): Promise<Result<HostConfig>> {
    const {
      configApis,
      accessKey,
      bucketName
    } = this.options
    return configApis.getHostConfig({
      serverUrl: host.getUrl(),
      assessKey: accessKey,
      bucket: bucketName
    })
  }
}
