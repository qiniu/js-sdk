import { Retrier } from '../../../../helper/retry'
import { HostsRetryPolicy, shouldNextAttempt } from '../../host'

import { RegionsProvider } from '../providers'
import { TServiceName } from '../region'
import { RegionsRetryPolicy } from './policies'

interface RegionsRetrierOptions {
  regionsProvider?: RegionsProvider
  serviceNames: TServiceName[]
}

export function getDefaultRegionsHostsRetrier<T>({
  regionsProvider,
  serviceNames
}: RegionsRetrierOptions) {
  return new Retrier({
    policies: [
      new HostsRetryPolicy(),
      new RegionsRetryPolicy({
        regionsProvider,
        serviceNames
      })
    ],
    afterAttempt: shouldNextAttempt
  })
}
