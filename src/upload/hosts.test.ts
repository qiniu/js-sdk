// eslint-disable-next-line import/newline-after-import
import { MockApi } from '../api/index.mock'
const mockApi = new MockApi()
jest.mock('../api', () => mockApi)

// eslint-disable-next-line import/first
import { Host, HostPool } from './hosts'

function sleep(time = 100) {
  return new Promise((resolve, _) => {
    setTimeout(resolve, time)
  })
}

describe('test hosts', () => {
  const getParams = ['accessKey', 'bucket', 'https'] as const

  test('getUp from api', async () => {
    const hostPool = new HostPool()
    const apiData = await mockApi.getUpHosts()

    // 无冻结行为每次获取到的都是第一个
    const actual1 = await hostPool.getUp(...getParams)
    expect(actual1?.host).toStrictEqual(apiData.data.up.acc.main[0])

    const actual2 = await hostPool.getUp(...getParams)
    expect(actual2?.host).toStrictEqual(apiData.data.up.acc.main[0])

    const actual3 = await hostPool.getUp(...getParams)
    expect(actual3?.host).toStrictEqual(apiData.data.up.acc.main[0])
  })

  test('getUp from config', async () => {
    const hostPool = new HostPool([
      'host-1',
      'host-2'
    ])

    // 无冻结行为每次获取到的都是第一个
    const actual1 = await hostPool.getUp(...getParams)
    expect(actual1).toStrictEqual(new Host('host-1', 'https'))

    const actual2 = await hostPool.getUp(...getParams)
    expect(actual2).toStrictEqual(new Host('host-1', 'https'))

    const actual3 = await hostPool.getUp(...getParams)
    expect(actual3).toStrictEqual(new Host('host-1', 'https'))
  })

  test('freeze & unfreeze', async () => {
    const hostPool = new HostPool([
      'host-1',
      'host-2'
    ])

    // 测试冻结第一个
    const host1 = await hostPool.getUp(...getParams)
    expect(host1).toStrictEqual(new Host('host-1', 'https'))
    // eslint-disable-next-line no-unused-expressions
    host1?.freeze()
    await sleep()

    // 自动切换到了下一个可用的 host-2
    const host2 = await hostPool.getUp(...getParams)
    expect(host2).toStrictEqual(new Host('host-2', 'https'))
    // eslint-disable-next-line no-unused-expressions
    host2?.freeze()
    await sleep()

    // 以下是都被冻结情况的测试

    // 全部都冻结了，拿到的应该是离解冻时间最近的一个
    const actual1 = await hostPool.getUp(...getParams)
    expect(actual1).toStrictEqual(new Host('host-1', 'https'))
    // eslint-disable-next-line no-unused-expressions
    host1?.freeze() // 已经冻结的再次冻结相当于更新解冻时间
    await sleep()

    // 因为 host-1 刚更新过冻结时间，所以这个时候解冻时间优先的应该是 host-2
    const actual2 = await hostPool.getUp(...getParams)
    expect(actual2).toStrictEqual(new Host('host-2', 'https'))
    await sleep()

    // 测试解冻 host-2，拿到的应该是 host-2
    // eslint-disable-next-line no-unused-expressions
    host2?.unfreeze()
    const actual3 = await hostPool.getUp(...getParams)
    expect(actual3).toStrictEqual(new Host('host-2', 'https'))
    // eslint-disable-next-line no-unused-expressions
    host2?.freeze() // 测试完再冻结住
    await sleep()

    // 本来优先的现在应该是 host-1
    // 测试 host-2 冻结时间设置为 0，应该获取到 host-2
    // eslint-disable-next-line no-unused-expressions
    host2?.freeze(0)
    const actual4 = await hostPool.getUp(...getParams)
    expect(actual4).toStrictEqual(new Host('host-2', 'https'))
    // eslint-disable-next-line no-unused-expressions
    host2?.freeze()
    await sleep()

    // 测试自定义冻结时间
    // eslint-disable-next-line no-unused-expressions
    host1?.freeze(200)
    // eslint-disable-next-line no-unused-expressions
    host2?.freeze(100)
    const actual5 = await hostPool.getUp(...getParams)
    expect(actual5).toStrictEqual(new Host('host-2', 'https'))
  })
})
