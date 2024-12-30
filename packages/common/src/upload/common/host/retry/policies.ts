import { Attempt, RetryPolicy } from '../../../../helper/retry'

import { Host } from '../host'

export interface HostsRetryContext {
  /** 获取配置的域名 */
  host?: Host
  /** 备用获取配置的域名 */
  alternativeHosts?: Host[]
}

export interface HostsRetryPolicyOptions {
  // This could be improved in future,
  // by the NewHostProvider with `getHosts(): Promise<Host[]>`
  hosts?: Host[]
}

export class HostsRetryPolicy<T> implements RetryPolicy<T, HostsRetryContext> {
  private hosts: Host[]

  constructor({
    hosts = []
  }: HostsRetryPolicyOptions = {}) {
    this.hosts = hosts
  }

  async initContext(context: HostsRetryContext) {
    if (this.skipInit) {
      return
    }

    const hosts = this.hosts.slice()

    context.host = hosts.shift()
    context.alternativeHosts = hosts
  }

  async shouldRetry(attempt: Attempt<T, HostsRetryContext>) {
    return !!attempt.context.alternativeHosts?.length
  }

  async prepareRetry(attempt: Attempt<T, HostsRetryContext>) {
    const context = attempt.context

    if (!context.alternativeHosts?.length) {
      throw new Error('There isn\'t available host for next try')
    }

    context.host = context.alternativeHosts.shift()
  }

  async isImportant() {
    return false
  }

  private get skipInit(): boolean {
    return !this.hosts.length
  }
}
