// 消费者接口
export interface IObserver<T, E> {
  next: (value: T) => void
  error: (err: E) => void
  complete: (res: any) => void
}

export interface NextObserver<T, E> {
  next: (value: T) => void
  error?: (err: E) => void
  complete?: (res: any) => void
}

export interface IUnsubscribable {
  unsubscribe(): void
}

export interface ISubscriptionLike extends IUnsubscribable {
  unsubscribe(): void
  readonly closed: boolean
}

export type TeardownLogic = () => void

export interface ISubscribable<T, E> {
  subscribe(observer?: NextObserver<T, E>): IUnsubscribable
  subscribe(next: null | undefined, error: null | undefined, complete: () => void): IUnsubscribable
  subscribe(next: null | undefined, error: (error: E) => void, complete?: () => void): IUnsubscribable
  subscribe(next: (value: T) => void, error: null | undefined, complete: () => void): IUnsubscribable
}

// 表示可清理的资源，比如 Observable 的执行
class Subscription implements ISubscriptionLike {
  public closed = false

  private _unsubscribe: TeardownLogic | undefined

  // 取消 observer 的订阅
  unsubscribe() {
    if (this.closed) {
      return
    }

    this.closed = true
    if (this._unsubscribe) {
      this._unsubscribe()
    }
  }

  add(teardown: TeardownLogic) {
    this._unsubscribe = teardown
  }
}

// 实现 Observer 接口并且继承 Subscription 类.
// Observer 是消费 Observable 值的公有 API
// 所有 Observers 都转化成了 Subscriber，以便提供类似 Subscription 的能力，比如 unsubscribe
export class Subscriber<T, E> extends Subscription implements IObserver<T, E> {
  protected isStopped = false
  protected destination: Partial<IObserver<T, E>>

  constructor(
    observerOrNext?: NextObserver<T, E> | ((value: T) => void) | null,
    error?: ((err: E) => void) | null,
    complete?: ((res: any) => void) | null
  ) {
    super()

    if (observerOrNext && typeof observerOrNext === 'object') {
      this.destination = observerOrNext
    } else {
      this.destination = {
        ...observerOrNext && { next: observerOrNext },
        ...error && { error },
        ...complete && { complete }
      }
    }
  }

  unsubscribe(): void {
    if (this.closed) {
      return
    }

    this.isStopped = true
    super.unsubscribe()
  }

  next(value: T) {
    if (!this.isStopped && this.destination.next) {
      this.destination.next(value)
    }
  }

  error(err: E) {
    if (!this.isStopped && this.destination.error) {
      this.isStopped = true
      this.destination.error(err)
    }
  }

  complete(result: any) {
    if (!this.isStopped && this.destination.complete) {
      this.isStopped = true
      this.destination.complete(result)
    }
  }
}

export class Observable<T, E> implements ISubscribable<T, E> {

  constructor(private _subscribe: (subscriber: Subscriber<T, E>) => TeardownLogic) {}

  subscribe(observer: NextObserver<T, E>): Subscription
  subscribe(next: null | undefined, error: null | undefined, complete: (res: any) => void): Subscription
  subscribe(next: null | undefined, error: (error: E) => void, complete?: (res: any) => void): Subscription
  subscribe(next: (value: T) => void, error: null | undefined, complete: (res: any) => void): Subscription
  subscribe(
    observerOrNext?: NextObserver<T, E> | ((value: T) => void) | null,
    error?: ((err: E) => void) | null,
    complete?: ((res: any) => void) | null
  ): Subscription {
    const sink = new Subscriber(observerOrNext, error, complete)
    sink.add(this._subscribe(sink))
    return sink
  }
}
