import { Result } from '../../../types/types'
import { UploadError } from '../../../types/error'
import { Retrier } from '../../../helper/retry'
import { UploadConfig } from '../../types'

import { QueueContext } from '../context'
import { Host } from '../host'
import { Task } from '../queue'

export interface PrepareRegionsHostsTaskOptions {
  config: Required<UploadConfig>
  context: QueueContext<RegionsHostsProgressKey>
}

export type RegionsHostsProgressKey = 'prepareRegionsHosts'

export class PrepareRegionsHostsTask implements Task {
  private readonly config: Required<UploadConfig>
  private readonly context: QueueContext<RegionsHostsProgressKey>

  constructor({
    config,
    context
  }: PrepareRegionsHostsTaskOptions) {
    this.config = config
    this.context = context
  }

  public async cancel(): Promise<Result> {
    return {
      result: true
    }
  }

  public async process(): Promise<Result> {
    const {
      protocol,
      uploadHosts,
      uploadRetrierGetter,
      regionsProviderGetter
    } = this.config
    const {
      operationApiContext
    } = this.context

    if (uploadHosts.length) {
      [
        operationApiContext.host,
        ...operationApiContext.alternativeHosts
      ] = uploadHosts.map(h => new Host(h, protocol))
      return {
        result: true
      }
    }

    this.context.operationApiRetrier = uploadRetrierGetter(this.context)

    if (this.context.operationApiRetrier === Retrier.Never) {
      const provider = regionsProviderGetter(this.context)
      const regions = await provider.getRegions()
      return {
        result: true
      }
    }

    try {
      await this.context.operationApiRetrier.initContext(this.context.operationApiContext)
    } catch (err: any) {
      this.context.error = new UploadError('InvalidUploadHost', err.toString())
      return {
        error: this.context.error
      }
    }

    return {
      result: true
    }
  }
}
