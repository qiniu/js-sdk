import { Result } from '../../../../types/types'
import { Retrier } from '../../../../helper/retry'

import { Region } from '../region'

export interface RegionsProvider {
  getRegions(): Promise<Result<Region[]>>
}
