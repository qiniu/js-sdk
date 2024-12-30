import { isSuccessResult } from '../../../../types/types'
import { Region } from '../region'

import { StaticRegionsProvider } from './static'

describe('StaticRegionsProvider', () => {
  test('test getRegions', async () => {
    const regions = [
      Region.fromRegionId('z0'),
      Region.fromRegionId('z1')
    ]
    const provider = new StaticRegionsProvider(regions)
    const result = await provider.getRegions()

    if (!isSuccessResult(result)) {
      throw new Error('expect the result is successful')
    }

    expect(result.result).toEqual(regions)
  })
})
