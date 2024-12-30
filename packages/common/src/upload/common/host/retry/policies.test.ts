import { HostsRetryPolicy, HostsRetryContext } from './policies'
import { Attempt } from '../../../../helper/retry'
import { Host } from '../host'

describe('HostsRetryPolicy', () => {
  let hosts: Host[]
  let policy: HostsRetryPolicy<any>

  beforeEach(() => {
    hosts = [
      new Host('js-sdk1.qiniu.com', 'HTTP'),
      new Host('js-sdk2.qiniu.com', 'HTTP'),
      new Host('js-sdk3.qiniu.com', 'HTTP')
    ]
    policy = new HostsRetryPolicy({ hosts })
  })

  it('should initialize context with the first host and alternative hosts', async () => {
    const context: HostsRetryContext = {}
    await policy.initContext(context)

    expect(context.host).toEqual(hosts[0])
    expect(context.alternativeHosts).toEqual([hosts[1], hosts[2]])
  })

  it('should return true for shouldRetry if there are alternative hosts', async () => {
    const context: HostsRetryContext = {
      host: hosts[0],
      alternativeHosts: [hosts[1], hosts[2]]
    }
    const attempt: Attempt<any, HostsRetryContext> = {
      context,
      error: null,
      result: null
    }

    const shouldRetry = await policy.shouldRetry(attempt)
    expect(shouldRetry).toBe(true)
  })

  it('should return false for shouldRetry if there are no alternative hosts', async () => {
    const context: HostsRetryContext = {
      host: hosts[0],
      alternativeHosts: []
    }
    const attempt: Attempt<any, HostsRetryContext> = {
      context,
      error: null,
      result: null
    }

    const shouldRetry = await policy.shouldRetry(attempt)
    expect(shouldRetry).toBe(false)
  })

  it('should prepare retry by shifting to the next alternative host', async () => {
    const context: HostsRetryContext = {
      host: hosts[0],
      alternativeHosts: [hosts[1], hosts[2]]
    }
    const attempt: Attempt<any, HostsRetryContext> = { context, error: null, result: null }

    await policy.prepareRetry(attempt)

    expect(context.host).toEqual(hosts[1])
    expect(context.alternativeHosts).toEqual([hosts[2]])
  })

  it('should throw an error if there are no alternative hosts to retry', async () => {
    const context: HostsRetryContext = {
      host: hosts[0],
      alternativeHosts: []
    }
    const attempt: Attempt<any, HostsRetryContext> = {
      context,
      error: null,
      result: null
    }

    await expect(policy.prepareRetry(attempt))
      .rejects.toThrow('There isn\'t available host for next try')
  })

  it('should return false for isImportant', async () => {
    const isImportant = await policy.isImportant()
    expect(isImportant).toBe(false)
  })
})
