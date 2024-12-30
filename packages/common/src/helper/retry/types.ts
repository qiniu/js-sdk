export type Context = Record<string, any>

export interface Attempt<T = any, C extends Context = Context> {
  result?: T
  error: Error | null
  context: C
}

export interface RetryPolicy<
  T = any,
  C extends Context = Context,
  A extends Attempt<T, C> = Attempt<T, C>
> {
  initContext(context: A['context']): Promise<void>
  shouldRetry(attempt: A): Promise<boolean>
  prepareRetry(attempt: A): Promise<void>
  isImportant(attempt: A): Promise<boolean>
}
