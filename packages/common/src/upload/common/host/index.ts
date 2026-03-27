import { ConfigApis } from '../../../api'
import { HttpProtocol } from '../../../types/http'
import { ErrorName, UploadError } from '../../../types/error'
import { Result, isCanceledResult, isErrorResult, isSuccessResult } from '../../../types/types'
import { MockProgress } from '../../../helper/progress'

import { Task } from '../queue'
import { QueueContext } from '../context'

/**
 * @description 解冻时间，key 是 host，value 为解冻时间
 */
const unfreezeTimeMap = new Map<string, number>()

export class Host {
  constructor(
    private host: string,
    private protocol: HttpProtocol
  ) {}

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
    return `${this.protocol.toLowerCase()}://${this.host}`
  }

  /**
   * @description 获取解冻时间
   */
  getUnfreezeTime() {
    return unfreezeTimeMap.get(this.host)
  }
}

interface GetUploadHostParams {
  assessKey: string
  bucket: string
}

class RegionHostProvider {
  /**
   * @description 缓存的 host 表，以 bucket 和 assessKey 作为 key
   */
  private cachedHostsMap = new Map<string, Host[]>()

  constructor(
    private protocol: HttpProtocol,
    private configApis: ConfigApis,
    private initHosts?: string[]
  ) {}

  /**
   * @description 注册可用 host
   */
  private register(assessKey: string, bucketName: string, hosts: string[]): void {
    this.cachedHostsMap.set(
      `${assessKey}@${bucketName}`,
      hosts.map(host => new Host(host, this.protocol))
    )
  }

  /**
   * @description 刷新最新的 host 数据，如果用户在构造时该类时传入了 host 或者已经存在缓存则不会发起请求
   */
  private async refresh(assessKey: string, bucketName: string): Promise<Result<boolean>> {
    const cachedHostList = this.cachedHostsMap.get(`${assessKey}@${bucketName}`) || []
    if (cachedHostList.length > 0) return { result: false }

    if (this.initHosts && this.initHosts.length > 0) {
      this.register(assessKey, bucketName, this.initHosts)
      return { result: true }
    }

    const configResult = await this.configApis.getHostConfig({
      assessKey,
      bucket: bucketName
    })

    if (!isSuccessResult(configResult)) {
      return configResult
    }

    const hostConfigs = configResult.result.hosts

    if (hostConfigs && hostConfigs.length > 0) {
      // 取第一个区域也就是当前空间所在区域的上传地址
      // 暂时不用其他区域上传地址是是因为不同区域必须从头上传（第一个分片）
      const hostConfig = hostConfigs[0]
      this.register(assessKey, bucketName, [
        // 严格依照优先级
        ...hostConfig.up.domains,
        ...hostConfig.up.old
      ])
    }

    return { result: true }
  }

  /**
   * @description 获取所有上传 Host 列表
   */
  public async getUploadHosts(params: GetUploadHostParams): Promise<Result<Host[]>> {
    const { assessKey, bucket } = params

    const refreshResult = await this.refresh(assessKey, bucket)
    if (!isSuccessResult(refreshResult)) return refreshResult

    const cachedHostList = this.cachedHostsMap.get(`${assessKey}@${bucket}`) || []

    if (cachedHostList.length === 0) {
      return { error: new UploadError('InvalidUploadHost', 'No upload host available') }
    }

    return { result: cachedHostList }
  }
}

export class HostProvider {
  private isFirstCall = true

  constructor(private hosts: Host[]) {}

  /**
   * @description 获取一个可用的 Host；优先返回未冻结的，首次调用且全部冻结时随机解冻一个
   */
  getHost(): Host {
    const available = this.hosts.filter(h => !h.isFrozen())
    if (available.length > 0) {
      this.isFirstCall = false
      return available[0]
    }

    // 所有 host 均被冻结
    if (this.isFirstCall) {
      this.isFirstCall = false
      const randomIndex = Math.floor(Math.random() * this.hosts.length)
      this.hosts[randomIndex].unfreeze()
      return this.hosts[randomIndex]
    }

    // 非首次调用，返回离解冻最近的 host
    const sorted = this.hosts
      .slice()
      .sort((a, b) => (a.getUnfreezeTime() || 0) - (b.getUnfreezeTime() || 0))
    return sorted[0]
  }
}

export type HostProgressKey = 'prepareUploadHost'

export class RegionHostProvideTask implements Task {
  private regionHostProvider: RegionHostProvider

  constructor(
    private context: QueueContext<HostProgressKey>,
    configApis: ConfigApis,
    protocol: HttpProtocol,
    initHosts?: string[]
  ) {
    this.regionHostProvider = new RegionHostProvider(protocol, configApis, initHosts)
    this.context.progress.details.prepareUploadHost = {
      fromCache: false,
      percent: 0,
      size: 0
    }
  }

  async cancel(): Promise<Result> {
    return { result: true }
  }

  async process(notice: () => void): Promise<Result> {
    const progress = new MockProgress(1)
    progress.onProgress(value => {
      this.context.progress.details.prepareUploadHost.percent = value
      notice()
    })

    const needFreezeError: ErrorName[] = ['HttpRequestError', 'NetworkError']
    if (this.context.error && needFreezeError.includes(this.context.error.name)) {
      // 只要是网络错误就冻结当前的 host
      this.context.host?.freeze()
    }

    // 当前的 host 没有被冻结，继续复用
    if (this.context.host?.isFrozen() === false) {
      this.context.progress.details.prepareUploadHost.fromCache = true
      progress.end()
      return { result: true }
    }

    // 首次执行时通过 RegionHostProvider 拉取 host 列表并创建 HostProvider
    if (!this.context.hostProvider) {
      const token = this.context.token!
      const hostsResult = await this.regionHostProvider.getUploadHosts(token)
      if (!isSuccessResult(hostsResult)) {
        if (isErrorResult(hostsResult)) {
          this.context.error = hostsResult.error
        }

        progress.stop()
        return hostsResult
      }
      this.context.hostProvider = new HostProvider(hostsResult.result)
    }

    this.context.host = this.context.hostProvider.getHost()
    progress.end()
    return { result: true }
  }
}

export class HostRetryTask implements Task {
  constructor(
    private context: QueueContext<HostProgressKey>,
    private innerTask: Task,
    private maxRetries = 2
  ) {}

  async cancel(): Promise<Result> {
    return this.innerTask.cancel()
  }

  async process(notice: () => void): Promise<Result> {
    return this.processWithRetry(notice, 0)
  }

  private async processWithRetry(notice: () => void, retryCount: number): Promise<Result> {
    // 记住本次请求使用的 host，避免并发时 freeze 错误的 host
    const hostBeforeProcess = this.context.host
    const result = await this.innerTask.process(notice)
    if (isSuccessResult(result) || isCanceledResult(result)) return result
    if (isErrorResult(result)) {
      const isRetriable = result.error.name === 'NetworkError'
        || result.error.name === 'HttpRequestError'
      if (isRetriable && retryCount < this.maxRetries && this.context.hostProvider) {
        hostBeforeProcess?.freeze()
        this.context.host = this.context.hostProvider.getHost()
        return this.processWithRetry(notice, retryCount + 1)
      }
    }
    return result
  }
}
