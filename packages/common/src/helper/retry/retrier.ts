// we need to make policies to access the attempt in order
/* eslint-disable no-await-in-loop */
import { Backoff, FixedBackoff, getDefaultBackoff } from './backoff'
import { Context, RetryPolicy, Attempt } from './types'

/**
 * if return true, then next attempt, otherwise stop retry
 */
export type BeforeRetryFunc<A, P> = (attempt: A, policy: P) => Promise<boolean>
/**
 * if return true, then next attempt, otherwise stop retry
 */
export type AfterAttemptFunc<A> = (attempt: A) => Promise<boolean>

export type DoFunc<A extends Attempt = Attempt> = (context: A['context']) => Promise<A['result']>

async function defaultBeforeRetry<A, P>(attempt: A, policy: P): Promise<boolean> {
  // if exists policy, then retry
  return !!policy
}

async function defaultAfterAttempt<A extends Attempt>(attempt: A): Promise<boolean> {
  /**
   * if exists error, then next attempt
   */
  return !!attempt.error
}

export interface RetrierOptions {
  policies: RetryPolicy[]
  backoff?: Backoff
  afterAttempt?: AfterAttemptFunc<Attempt>
  beforeRetry?: BeforeRetryFunc<Attempt, RetryPolicy>
}

export class Retrier<T = any> {
  static Never = new Retrier({
    policies: [],
    backoff: new FixedBackoff(0),
    afterAttempt: async () => false
  })

  private policies: Array<RetryPolicy<T>>
  private _backoff: Backoff
  private afterAttempt?: AfterAttemptFunc<Attempt<T>>
  private beforeRetry: BeforeRetryFunc<Attempt<T>, RetryPolicy>

  constructor({
    policies,
    backoff,
    afterAttempt,
    beforeRetry = defaultBeforeRetry
  }: RetrierOptions) {
    this.policies = policies
    this.afterAttempt = afterAttempt
    this.beforeRetry = beforeRetry

    if (!backoff) {
      backoff = getDefaultBackoff()
    }

    this._backoff = backoff
  }

  public async initContext(context: any) {
    for (const policy of this.policies) {
      await policy.initContext(context)
    }
  }

  public async tryDo<R extends T>(func: DoFunc<Attempt<R>>, context?: Context): Promise<R> {

    if (!context) {
      context = {}
      await this.initContext(context)
    }

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { attempt, policy } = await this.doAttempt<R>(func, context)

      if (!policy) {
        return this.returnAttempt<R>(attempt)
      }

      await policy.prepareRetry(attempt)
      if (
        this.beforeRetry
        && !await this.beforeRetry(attempt, policy)
      ) {
        return this.returnAttempt<R>(attempt)
      }
      await this._backoff.wait()
    }
  }

  public set backoff(backoff: Backoff) {
    this._backoff = backoff
  }

  public get backoff(): Backoff {
    return this._backoff
  }

  private async doAttempt<R extends T>(
    func: DoFunc<Attempt<R>>,
    context: Record<string, any>
  ): Promise<{ attempt: Attempt<R>, policy?: RetryPolicy }> {
    const attempt: Attempt<R> = {
      error: null,
      context
    }

    try {
      attempt.result = await func(context)
    } catch (error: any) {
      attempt.error = error
    }

    if (
      this.afterAttempt
      && !await this.afterAttempt(attempt)
    ) {
      return {
        attempt
      }
    }

    return {
      attempt,
      policy: await this.getRetryPolicy(attempt)
    }
  }

  private returnAttempt<R>(attempt: Attempt<R>): R {
    if (attempt.error) {
      throw attempt.error
    }

    return attempt.result as R
  }

  private async getRetryPolicy(attempt: Attempt): Promise<RetryPolicy | undefined> {
    let policy: RetryPolicy | undefined

    // remove this if branch, if no need to mock a don't retry error
    if (
      attempt.error
      && Object.prototype.hasOwnProperty.call(attempt.error, 'dontRetry')
      && (attempt.error as any).dontRetry
    ) {
      return
    }

    for (const p of this.policies) {
      if (await p.isImportant(attempt)) {
        policy = p
        break
      }
    }
    if (policy && await policy.shouldRetry(attempt)) {
      return policy
    }

    policy = undefined
    for (const p of this.policies) {
      if (await p.shouldRetry(attempt)) {
        policy = p
      }
    }

    return policy
  }
}
