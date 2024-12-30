import { HttpProtocol } from '../../../types/http'
import { ValueOf } from '../../../types/utility'
import { Host } from '../host'

// TODO: Is it feasible to use enum type on all platforms?
//   - yes, browser compile by tsc
//   - yes, wechat mini program compile by tsc
//   - ?, harmony
// enum ServiceName {
//  UP = 'up',
//  UP_ACC = 'up_acc'
// }
export const ServiceName = {
  UP: 'up',
  UP_ACC: 'up_acc'
}
export type TServiceName = ValueOf<typeof ServiceName>

export interface RegionOptions {
  regionId: string
  services: Record<TServiceName, Host[]>
  createdAt?: Date
  ttl?: number // seconds
}

// TODO: The Region class could be improved
//   by implement `clone` method for immutable usage
export class Region {
  static fromRegionId(regionId: string, protocol: HttpProtocol = 'HTTPS'): Region {
    const upHosts = [
      `upload-${regionId}.qiniup.com`,
      `up-${regionId}.qiniup.com`,
      `upload-${regionId}.qiniuio.com`
    ]
    const services: Record<TServiceName, Host[]> = {
      [ServiceName.UP]: upHosts.map(host => new Host(host, protocol)),
      [ServiceName.UP_ACC]: []
    }
    return new Region({
      regionId,
      services
    })
  }

  readonly regionId: string
  readonly services: Record<TServiceName, Host[]>
  readonly createdAt: Date
  ttl: number // seconds

  constructor({
    regionId,
    services = {},
    ttl = -1,
    createdAt = new Date()
  }: RegionOptions) {
    this.regionId = regionId

    // handle services. make sure all entries are array.
    this.services = services
    for (const sn of Object.values(ServiceName)) {
      if (
        !Array.isArray(this.services[sn])
        || !this.services[sn].length
      ) {
        this.services[sn] = []
      }
    }

    this.ttl = ttl
    this.createdAt = createdAt
  }

  get isLive(): boolean {
    if (this.ttl < 0) {
      return true
    }
    const liveDuration = Math.floor(
      (Date.now() - this.createdAt.getTime())
      / 1000
    )
    return liveDuration <= this.ttl
  }
}
