import { Region } from '../region'
import { RegionsProvider } from './types'

export class StaticRegionsProvider implements RegionsProvider {
  regions: Region[]

  constructor(regions: Region[]) {
    this.regions = regions.slice()
  }
  async getRegions() {
    return {
      result: this.regions
    }
  }
}
