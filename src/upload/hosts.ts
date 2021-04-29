import { getUpHosts } from '../api'
import { Config } from './base'

/**
  * @description 解冻时间，key 是 host，value 为解冻时间
  */
const unfreezeTimeMap = new Map<string, number>()

export class Host {
  public host: string
  public protocol: Config['upprotocol']

  constructor(host: string, protocol: Config['upprotocol'] = 'https') {
    this.protocol = protocol
    this.host = host
  }

  /**
   * @description 获取当前 host 的完整 url
   */
  url() {
    return `${this.protocol}://${this.host}`
  }

  /**
   * @description 当前 host 是否为冻结状态
   */
  isFrozen() {
    const currentTime = new Date().getTime()
    const unfreezeTime = unfreezeTimeMap.get(this.host)
    if (unfreezeTime != null && unfreezeTime >= currentTime) return true

    // 已经到达解冻时间（解冻当前的 host）
    this.unfreeze()
    return false
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
}

export class HostPool {
  /**
   * @description 构造类时传入的数据
   */
  private hosts?: string[]

  /**
   * @description 缓存的 host 表，以 bucket 和 accessKey 作为 key
   */
  private cachedHostsMap = new Map<string, Host[]>()

  /**
   * @param  {string[] | string} hosts
   * @description 如果在构造时传入 hosts，则该 host 池始终使用传入的 host 做为可用的数据
   */
  constructor(hosts?: string[] | string) {
    if (hosts == null) return
    if (Array.isArray(hosts)) this.hosts = hosts
    if (typeof hosts === 'string') this.hosts = [hosts]
  }

  /**
   * @param  {string} accessKey
   * @param  {string} bucketName
   * @param  {string[]} hosts
   * @param  {Config['upprotocol']} protocol
   * @returns  {void}
   * @description 注册可用 host
   */
  private register(accessKey: string, bucketName: string, hosts: string[], protocol: Config['upprotocol']): void {
    this.cachedHostsMap.set(
      `${accessKey}@${bucketName}`,
      hosts.map(host => new Host(host, protocol))
    )
  }

  /**
   * @param  {string} accessKey
   * @param  {string} bucketName
   * @param  {Config['upprotocol']} protocol
   * @returns  {Promise<void>}
   * @description 从接口刷新最新的 host 数据，如果用户在构造时该类时传入了 host、则不会发起请求、而是固定使用传入的数据。
   */
  private async refresh(accessKey: string, bucketName: string, protocol: Config['upprotocol']): Promise<void> {
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
   * @param  {Config['upprotocol']} protocol
   * @param  {boolean} isRefresh
   * @returns  {Promise<Host | null>}
   * @description 获取一个可用的上传 Host，排除已冻结的
   */
  public async getUp(accessKey: string, bucketName: string, protocol: Config['upprotocol'], isRefresh = false): Promise<Host | null> {
    if (isRefresh) await this.refresh(accessKey, bucketName, protocol)
    const cachedHost = this.cachedHostsMap.get(`${accessKey}@${bucketName}`)
    if (cachedHost == null && isRefresh === false) {
      return this.getUp(accessKey, bucketName, protocol, true)
    }

    const availableHost = (cachedHost || []).filter(host => !host.isFrozen())
    if (availableHost.length === 0 && isRefresh === false) {
      return this.getUp(accessKey, bucketName, protocol, true)
    }

    // 有 host 但是全被冻结了，去取离解冻最近的 host
    if (cachedHost != null && cachedHost.length > 0 && availableHost.length === 0) {
      const priorityQueue = cachedHost.slice()
        .sort(({ host: hostA }, { host: hostB }) => {
          const aUnfreezeTime = unfreezeTimeMap.get(hostA)
          const bUnfreezeTime = unfreezeTimeMap.get(hostB)

          return (aUnfreezeTime || 0) - (bUnfreezeTime || 0)
        })

      return priorityQueue[0]
    }

    return availableHost ? availableHost[0] : null
  }
}
