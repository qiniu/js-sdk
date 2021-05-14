import { getUpHosts } from '../api'
import { InternalConfig } from './base'

/**
  * @description 解冻时间，key 是 host，value 为解冻时间
  */
const unfreezeTimeMap = new Map<string, number>()

export class Host {
  constructor(public host: string, public protocol: InternalConfig['upprotocol']) { }

  /**
   * @description 当前 host 是否为冻结状态
   */
  isFrozen() {
    const currentTime = new Date().getTime()
    const unfreezeTime = unfreezeTimeMap.get(this.host)
    return unfreezeTime != null && unfreezeTime >= currentTime
  }

  /**
   * @param  {number} time 单位秒，默认 20s
   * @description 冻结该 host 对象，该 host 将在指定时间内不可用
   */
  freeze(time = 20) {
    const unfreezeTime = new Date().getTime() + (time * 1000)
    unfreezeTimeMap.set(this.host, unfreezeTime)
  }

  /**
   * @description 解冻该 host
   */
  unfreeze() {
    unfreezeTimeMap.delete(this.host)
  }

  /**
   * @description 获取当前 host 的完整 url
   */
  getUrl() {
    return `${this.protocol}://${this.host}`
  }

  /**
   * @description 获取解冻时间
   */
  getUnfreezeTime() {
    return unfreezeTimeMap.get(this.host)
  }
}
export class HostPool {
  /**
   * @description 缓存的 host 表，以 bucket 和 accessKey 作为 key
   */
  private cachedHostsMap = new Map<string, Host[]>()

  /**
   * @param  {string[]} hosts
   * @description 如果在构造时传入 hosts，则该 host 池始终使用传入的 host 做为可用的数据
   */
  constructor(private hosts?: string[]) {
  }

  /**
   * @param  {string} accessKey
   * @param  {string} bucketName
   * @param  {string[]} hosts
   * @param  {InternalConfig['upprotocol']} protocol
   * @returns  {void}
   * @description 注册可用 host
   */
  private register(accessKey: string, bucketName: string, hosts: string[], protocol: InternalConfig['upprotocol']): void {
    this.cachedHostsMap.set(
      `${accessKey}@${bucketName}`,
      hosts.map(host => new Host(host, protocol))
    )
  }

  /**
   * @param  {string} accessKey
   * @param  {string} bucketName
   * @param  {InternalConfig['upprotocol']} protocol
   * @returns  {Promise<void>}
   * @description 从接口刷新最新的 host 数据，如果用户在构造时该类时传入了 host、则不会发起请求、而是固定使用传入的数据。
   */
  private async refresh(accessKey: string, bucketName: string, protocol: InternalConfig['upprotocol']): Promise<void> {
    const hosts: string[] = []
    if (this.hosts != null && this.hosts.length > 0) {
      hosts.push(...this.hosts)
    } else {
      const response = await getUpHosts(accessKey, bucketName, protocol)
      if (response?.data != null) {
        hosts.push(
          ...(response.data.up?.acc?.main || []),
          ...(response.data.up?.acc?.backup || [])
        )
      }
    }

    this.register(accessKey, bucketName, hosts, protocol)
  }

  /**
   * @param  {string} accessKey
   * @param  {string} bucketName
   * @param  {InternalConfig['upprotocol']} protocol
   * @param  {boolean} isRefresh
   * @returns  {Promise<Host | null>}
   * @description 获取一个可用的上传 Host，排除已冻结的
   */
  public async getUp(accessKey: string, bucketName: string, protocol: InternalConfig['upprotocol'], isRefresh = false): Promise<Host | null> {
    if (isRefresh) await this.refresh(accessKey, bucketName, protocol)

    const cachedHostList = this.cachedHostsMap.get(`${accessKey}@${bucketName}`) || []
    if (cachedHostList.length === 0 && !isRefresh) {
      return this.getUp(accessKey, bucketName, protocol, true)
    }

    if (cachedHostList.length === 0) return null
    const availableHostList = cachedHostList.filter(host => !host.isFrozen())
    if (availableHostList.length > 0) return availableHostList[0]

    // 无可用的，去取离解冻最近的 host
    const priorityQueue = cachedHostList
      .slice().sort((hostA, hostB) => (
        hostA.getUnfreezeTime() || 0) - (hostB.getUnfreezeTime() || 0)
      )

    return priorityQueue[0]
  }
}
