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
   * @param  {string[]} initHosts
   * @description 如果在构造时传入 initHosts，则该 host 池始终使用传入的 initHosts 做为可用的数据
   */
  constructor(private initHosts: string[] = []) { }

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
   * @description 刷新最新的 host 数据，如果用户在构造时该类时传入了 host 或者已经存在缓存则不会发起请求
   */
  private async refresh(accessKey: string, bucketName: string, protocol: InternalConfig['upprotocol']): Promise<void> {
    const cachedHostList = this.cachedHostsMap.get(`${accessKey}@${bucketName}`) || []
    if (cachedHostList.length > 0) return

    if (this.initHosts.length > 0) {
      this.register(accessKey, bucketName, this.initHosts, protocol)
      return
    }

    const response = await getUpHosts(accessKey, bucketName, protocol)
    if (response?.data != null) {
      const stashHosts: string[] = [
        ...(response.data.up?.acc?.main || []),
        ...(response.data.up?.acc?.backup || [])
      ]
      this.register(accessKey, bucketName, stashHosts, protocol)
    }
  }

  /**
   * @param  {string} accessKey
   * @param  {string} bucketName
   * @param  {InternalConfig['upprotocol']} protocol
   * @returns  {Promise<Host | null>}
   * @description 获取一个可用的上传 Host，排除已冻结的
   */
  public async getUp(accessKey: string, bucketName: string, protocol: InternalConfig['upprotocol']): Promise<Host | null> {
    await this.refresh(accessKey, bucketName, protocol)
    const cachedHostList = this.cachedHostsMap.get(`${accessKey}@${bucketName}`) || []

    if (cachedHostList.length === 0) return null
    const availableHostList = cachedHostList.filter(host => !host.isFrozen())
    if (availableHostList.length > 0) return availableHostList[0]

    // 无可用的，去取离解冻最近的 host
    const priorityQueue = cachedHostList
      .slice().sort(
        (hostA, hostB) => (hostA.getUnfreezeTime() || 0) - (hostB.getUnfreezeTime() || 0)
      )

    return priorityQueue[0]
  }
}
