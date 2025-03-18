import { UploadError } from './error'

export type ErrorResult = { error: UploadError }
export type CanceledResult = { canceled: true }
export type SuccessResult<R = unknown> = { result: R }
export type Result<R = unknown> = SuccessResult<R> | ErrorResult | CanceledResult

export function isErrorResult(result: Result<any>): result is ErrorResult {
  return !!(result && 'error' in result)
}

export function isCanceledResult(result: Result<any>): result is CanceledResult {
  return !!(result && 'canceled' in result && result.canceled)
}

export function isSuccessResult<R>(result: Result<R>): result is SuccessResult<R> {
  return !!(!isErrorResult(result) && !isCanceledResult(result) && result && 'result' in result)
}
