import { isCanceledResult, isErrorResult } from '../../../../types/types'
import { Attempt, RetryPolicy } from '../../../../helper/retry'

import { Host } from '../../host'
import { Region, TServiceName } from '../region'
import { RegionsProvider } from '../providers'

export interface RegionsRetryContext {
  /** 操作使用的 host; */
  host?: Host
  /** 备用域名 */
  alternativeHosts?: Host[]
  /** 当前所使用的服务 */
  serviceName?: TServiceName
  /** 备用服务 */
  alternativeServiceNames?: TServiceName[]
  /** 当前使用的区域 */
  region?: Region
  /** 备用区域 */
  alternativeRegions?: Region[]
}

export interface RegionsRetryPolicyOptions {
  regionsProvider?: RegionsProvider
  serviceNames: TServiceName[]
  // used for resume from break point
  // preferredHostsProvider: PreferredHostsProvider
  // the type `QueueContext['operationApiContext` depends on the attempt type
  onChangeRegion?: (context: RegionsRetryContext) => Promise<void>
}

export class RegionsRetryPolicy implements RetryPolicy<any, RegionsRetryContext> {
  private regionsProvider?: RegionsProvider
  private serviceNames: TServiceName[]
  private onChangeRegion?: (context: RegionsRetryContext) => Promise<void>

  constructor({
    regionsProvider,
    serviceNames,
    // preferredHostsProvider,
    onChangeRegion
  }: RegionsRetryPolicyOptions) {
    this.regionsProvider = regionsProvider
    this.serviceNames = serviceNames
    this.onChangeRegion = onChangeRegion
  }

  async initContext(context: RegionsRetryContext) {
    if (!this.regionsProvider) {
      return
    }
    await this.initRegions(context, this.regionsProvider)
    await this.prepareHosts(context)
  }

  async shouldRetry(attempt: Attempt<any, RegionsRetryContext>): Promise<boolean> {
    const context = attempt.context
    return !!context.alternativeRegions?.length
      || !!context.alternativeServiceNames?.length
  }

  async prepareRetry(attempt: Attempt<any, RegionsRetryContext>) {
    await this.prepareHosts(attempt.context)
  }

  async isImportant() {
    return false
  }

  private async initRegions(context: RegionsRetryContext, regionsProvider: RegionsProvider) {
    const regionsResult = await regionsProvider.getRegions()
    // TODO: is there a need for resuming?
    //   seems the resuming not storage on local. so it's may ok to reupload from the beginning.
    // const preferredHosts = await this.preferredHostsProvider.getPreferredHosts()
    if (isErrorResult(regionsResult)) {
      throw regionsResult.error
    }
    if (isCanceledResult(regionsResult)) {
      return
    }
    const regions = regionsResult.result.slice()
    context.region = regions.shift()
    context.alternativeRegions = regions
    context.alternativeServiceNames = this.serviceNames.slice()
  }

  private async prepareHosts(context: RegionsRetryContext) {
    let hosts: Host[] | undefined
    let regionChanged = false

    while (!hosts?.length) {
      const sn = context.alternativeServiceNames?.shift()
      if (sn) {
        context.serviceName = sn
        hosts = context.region?.services[context.serviceName]?.slice()
        continue
      }

      const r = context.alternativeRegions?.shift()
      if (r) {
        context.region = r
        context.alternativeServiceNames = this.serviceNames.slice()
        context.serviceName = context.alternativeServiceNames.shift()
        regionChanged = true
        continue
      }

      throw new Error('There isn\'t available service or region for next try')
    }

    context.alternativeHosts = hosts
    context.host = context.alternativeHosts.shift()
    if (regionChanged && this.onChangeRegion) {
      await this.onChangeRegion(context)
    }
  }
}

export class AccUnavailableRetryPolicy implements RetryPolicy<any, RegionsRetryContext> {
  async initContext(context: RegionsRetryContext) {
    // do nothing
  }

  async shouldRetry(attempt: Attempt<any, RegionsRetryContext>): Promise<boolean> {
    if (isErrorResult(attempt.result)) {
      return attempt.result.error.message.includes('transfer acceleration is not configured on this bucket')
    }
    return false
  }

  async prepareRetry(attempt: Attempt<any, RegionsRetryContext>) {
    const ctx = attempt.context
    const nextServiceName = ctx.alternativeServiceNames?.shift()
    if (!nextServiceName) {
      throw new Error('There isn\'t available service for next try')
    }
    ctx.serviceName = nextServiceName
    ctx.alternativeHosts = ctx.region?.services[ctx.serviceName]?.slice()
  }

  async isImportant() {
    return false
  }
}
