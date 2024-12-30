import { Region, ServiceName } from './region'

describe('Region', () => {
  test('test fromRegionId', () => {
    const region = Region.fromRegionId('z0')

    expect(region.createdAt.getTime()).toBeGreaterThanOrEqual(Date.now() - 100)
    expect(region.regionId).toBe('z0')
    expect(region.ttl).toBe(-1)
    expect(region.isLive).toBeTruthy()
    expect(region.services[ServiceName.UP_ACC]).toBe([])
    expect(region.services[ServiceName.UP].map(h => h.getUrl()))
      .toEqual([
        'https://upload-z0.qiniup.com',
        'https://up-z0.qiniup.com',
        'https://upload-z0.qiniuio.com'
      ])

    const regionHttp = Region.fromRegionId('z1', 'HTTP')
    expect(regionHttp.services[ServiceName.UP].map(h => h.getUrl()))
      .toEqual([
        'http://upload-z0.qiniup.com',
        'http://up-z0.qiniup.com',
        'http://upload-z0.qiniuio.com'
      ])
  })

  const regionIsLiveCases = [
    {
      params: {
        ttl: 0
      },
      expectVal: false
    }, {
      params: {
        ttl: 10
      },
      expectVal: true
    }, {
      params: {
        ttl: 10,
        createTime: new Date(0)
      },
      expectVal: false
    }
  ]
  regionIsLiveCases.forEach(caseItem => {
    test(`test region isLive ${JSON.stringify(caseItem.params)}`, () => {
      const region = new Region({
        regionId: 'fake',
        services: {},
        ...caseItem.params
      })

      expect(region.isLive).toBe(caseItem.expectVal)
    })
  })
})
