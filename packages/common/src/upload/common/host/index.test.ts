import { UploadError } from '../../../types/error'
import { Result, isCanceledResult, isErrorResult, isSuccessResult } from '../../../types/types'
import { HttpProtocol } from '../../../types/http'

import { Host, HostProvider, HostRetryTask, HostProgressKey } from './index'
import { Task } from '../queue'
import { QueueContext } from '../context'

class MockInnerTask implements Task {
  public cancelCalled = false
  public processCount = 0
  private results: Result[]

  constructor(results: Result[]) {
    this.results = results
  }

  async cancel(): Promise<Result> {
    this.cancelCalled = true
    return { result: true }
  }

  async process(_notice: () => void): Promise<Result> {
    const result = this.results[this.processCount] ?? { error: new UploadError('InternalError', 'no more results') }
    this.processCount++
    return result
  }
}

function createHosts(count: number): Host[] {
  return Array.from({ length: count }, (_, i) =>
    new Host(`host${i + 1}.example.com`, 'HTTPS' as HttpProtocol)
  )
}

function createMockContext(hostProvider?: HostProvider): QueueContext<HostProgressKey> {
  return {
    host: new Host('host1.example.com', 'HTTPS' as HttpProtocol),
    token: { bucket: 'test-bucket', assessKey: 'test-key', signature: 'test-sig', deadline: Date.now() / 1000 + 3600 },
    result: undefined,
    error: undefined,
    progress: {
      size: 0,
      percent: 0,
      details: {
        prepareUploadHost: { size: 0, percent: 0, fromCache: false }
      }
    },
    hostProvider,
    setup() {
      this.error = undefined
    }
  }
}

describe('HostProvider', () => {
  afterEach(() => {
    // 解冻所有测试用的 host
    for (let i = 1; i <= 10; i++) {
      new Host(`host${i}.example.com`, 'HTTPS' as HttpProtocol).unfreeze()
    }
  })

  test('getHost returns first unfrozen host', () => {
    const hosts = createHosts(3)
    const provider = new HostProvider(hosts)
    const host = provider.getHost()
    expect(host.getUrl()).toContain('host1')
  })

  test('getHost skips frozen hosts', () => {
    const hosts = createHosts(3)
    hosts[0].freeze()
    const provider = new HostProvider(hosts)
    const host = provider.getHost()
    expect(host.getUrl()).toContain('host2')
  })

  test('first call with all frozen — randomly unfreezes one', () => {
    const hosts = createHosts(3)
    hosts.forEach(h => h.freeze())
    const provider = new HostProvider(hosts)
    const host = provider.getHost()
    // 应该返回一个已解冻的 host
    expect(host.isFrozen()).toBe(false)
    expect(hosts.some(h => !h.isFrozen())).toBe(true)
  })

  test('non-first call with all frozen — returns closest to unfreezing', () => {
    const hosts = createHosts(3)
    const provider = new HostProvider(hosts)
    // 首次调用（正常返回）
    provider.getHost()
    // 冻结所有 host，设置不同的冻结时间
    hosts[0].freeze(30)
    hosts[1].freeze(10)
    hosts[2].freeze(20)
    const host = provider.getHost()
    // 应该返回冻结时间最短的 host2
    expect(host.getUrl()).toContain('host2')
  })
})

describe('HostRetryTask', () => {
  afterEach(() => {
    for (let i = 1; i <= 10; i++) {
      new Host(`host${i}.example.com`, 'HTTPS' as HttpProtocol).unfreeze()
    }
  })

  test('success on first attempt — no retry triggered', async () => {
    const hosts = createHosts(3)
    const provider = new HostProvider(hosts)
    const context = createMockContext(provider)
    const innerTask = new MockInnerTask([{ result: true }])

    const retryTask = new HostRetryTask(context, innerTask)
    const result = await retryTask.process(() => {})

    expect(isSuccessResult(result)).toBe(true)
    expect(innerTask.processCount).toBe(1)
  })

  test('NetworkError triggers host switch and succeeds', async () => {
    const hosts = createHosts(3)
    const provider = new HostProvider(hosts)
    const context = createMockContext(provider)
    context.host = hosts[0]

    const innerTask = new MockInnerTask([
      { error: new UploadError('NetworkError', 'network fail') },
      { result: true }
    ])

    const retryTask = new HostRetryTask(context, innerTask)
    const result = await retryTask.process(() => {})

    expect(isSuccessResult(result)).toBe(true)
    expect(innerTask.processCount).toBe(2)
    // host1 被冻结后应切换到 host2
    expect(context.host!.getUrl()).toContain('host2')
  })

  test('HttpRequestError triggers host switch and succeeds', async () => {
    const hosts = createHosts(3)
    const provider = new HostProvider(hosts)
    const context = createMockContext(provider)
    context.host = hosts[0]

    const innerTask = new MockInnerTask([
      { error: new UploadError('HttpRequestError', 'http fail') },
      { result: true }
    ])

    const retryTask = new HostRetryTask(context, innerTask)
    const result = await retryTask.process(() => {})

    expect(isSuccessResult(result)).toBe(true)
    expect(innerTask.processCount).toBe(2)
    expect(context.host!.getUrl()).toContain('host2')
  })

  test('retries exhausted — returns last error', async () => {
    const hosts = createHosts(3)
    const provider = new HostProvider(hosts)
    const context = createMockContext(provider)
    context.host = hosts[0]

    const innerTask = new MockInnerTask([
      { error: new UploadError('NetworkError', 'fail 1') },
      { error: new UploadError('NetworkError', 'fail 2') },
      { error: new UploadError('NetworkError', 'fail 3') }
    ])

    const retryTask = new HostRetryTask(context, innerTask, 2)
    const result = await retryTask.process(() => {})

    expect(isErrorResult(result)).toBe(true)
    if (isErrorResult(result)) {
      expect(result.error.name).toBe('NetworkError')
      expect(result.error.message).toBe('fail 3')
    }
    expect(innerTask.processCount).toBe(3)
  })

  test('non-retriable error returns immediately', async () => {
    const hosts = createHosts(3)
    const provider = new HostProvider(hosts)
    const context = createMockContext(provider)

    const innerTask = new MockInnerTask([
      { error: new UploadError('InternalError', 'fatal') }
    ])

    const retryTask = new HostRetryTask(context, innerTask)
    const result = await retryTask.process(() => {})

    expect(isErrorResult(result)).toBe(true)
    if (isErrorResult(result)) {
      expect(result.error.name).toBe('InternalError')
    }
    expect(innerTask.processCount).toBe(1)
  })

  test('cancel forwards to innerTask', async () => {
    const hosts = createHosts(3)
    const provider = new HostProvider(hosts)
    const context = createMockContext(provider)
    const innerTask = new MockInnerTask([{ result: true }])

    const retryTask = new HostRetryTask(context, innerTask)
    const cancelResult = await retryTask.cancel()

    expect(isSuccessResult(cancelResult)).toBe(true)
    expect(innerTask.cancelCalled).toBe(true)
  })

  test('canceled result is returned without retry', async () => {
    const hosts = createHosts(3)
    const provider = new HostProvider(hosts)
    const context = createMockContext(provider)

    const innerTask = new MockInnerTask([{ canceled: true as const }])

    const retryTask = new HostRetryTask(context, innerTask)
    const result = await retryTask.process(() => {})

    expect(isCanceledResult(result)).toBe(true)
    expect(innerTask.processCount).toBe(1)
  })
})
