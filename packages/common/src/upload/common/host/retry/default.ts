import { Result, isCanceledResult, isErrorResult, isSuccessResult } from '../../../../types/types'
import { NEVER_RETRY_ERROR_NAMES, HttpRequestError } from '../../../../types/error'
import { Attempt, Retrier } from '../../../../helper/retry'

import { Host } from '../host'
import { HostsRetryPolicy } from './policies'

interface HostsRetrierOptions {
  hosts?: Host[]
}

export function getDefaultHostsRetrier<T>({
  hosts
}: HostsRetrierOptions) {
  return new Retrier<Result<T>>({
    policies: [
      new HostsRetryPolicy({
        hosts
      })
    ],
    afterAttempt: shouldNextAttempt
  })
}

export async function shouldNextAttempt(attempt: Attempt<Result, any>): Promise<boolean> {
  if (attempt.error || !attempt.result) {
    return true
  }
  if (isSuccessResult(attempt.result) || isCanceledResult(attempt.result)) {
    return false
  }
  if (NEVER_RETRY_ERROR_NAMES.includes(attempt.result.error.name)) {
    return false
  }
  if (attempt.result.error instanceof HttpRequestError) {
    return attempt.result.error.needRetry()
  }
  return true
}
