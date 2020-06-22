/** 消费者接口 */
export interface IObserver<T, E, C> {
  /** 用来接收 Observable 中的 next 类型通知 */
  next: (value: T) => void
  /** 用来接收 Observable 中的 error 类型通知 */
  error: (err: E) => void
  /** 用来接收 Observable 中的 complete 类型通知 */
  complete: (res: C) => void
}

export interface NextObserver<T, E, C> {
  next: (value: T) => void
  error?: (err: E) => void
  complete?: (res: C) => void
}

export interface IUnsubscribable {
  /** 取消 observer 的订阅 */
  unsubscribe(): void
}

/** Subscription 的接口 */
export interface ISubscriptionLike extends IUnsubscribable {
  readonly closed: boolean
}

export type TeardownLogic = () => void

export interface ISubscribable<T, E, C> {
  subscribe(observer?: NextObserver<T, E, C>): IUnsubscribable
  subscribe(next: null | undefined, error: null | undefined, complete: (res: C) => void): IUnsubscribable
  subscribe(next: null | undefined, error: (error: E) => void, complete?: (res: C) => void): IUnsubscribable
  subscribe(next: (value: T) => void, error: null | undefined, complete: (res: C) => void): IUnsubscribable
}

/** 表示可清理的资源，比如 Observable 的执行 */
class Subscription implements ISubscriptionLike {
  /** 用来标示该 Subscription 是否被取消订阅的标示位 */
  public closed = false

  /** 清理 subscription 持有的资源 */
  private _unsubscribe: TeardownLogic | undefined

  /** 取消 observer 的订阅 */
  unsubscribe() {
    if (this.closed) {
      return
    }

    this.closed = true
    if (this._unsubscribe) {
      this._unsubscribe()
    }
  }

  /** 添加一个 tear down 在该 Subscription 的 unsubscribe() 期间调用 */
  add(teardown: TeardownLogic) {
    this._unsubscribe = teardown
  }
}

/**
 * 实现 Observer 接口并且继承 Subscription 类，Observer 是消费 Observable 值的公有 API
 * 所有 Observers 都转化成了 Subscriber，以便提供类似 Subscription 的能力，比如 unsubscribe
*/
export class Subscriber<T, E, C> extends Subscription implements IObserver<T, E, C> {
  protected isStopped = false
  protected destination: Partial<IObserver<T, E, C>>

  constructor(
    observerOrNext?: NextObserver<T, E, C> | ((value: T) => void) | null,
    error?: ((err: E) => void) | null,
    complete?: ((res: C) => void) | null
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

  complete(result: C) {
    if (!this.isStopped && this.destination.complete) {
      this.isStopped = true
      this.destination.complete(result)
    }
  }
}

/** 可观察对象，当前的上传事件的集合 */
export class Observable<T, E, C> implements ISubscribable<T, E, C> {

  constructor(private _subscribe: (subscriber: Subscriber<T, E, C>) => TeardownLogic) {}

  subscribe(observer: NextObserver<T, E, C>): Subscription
  subscribe(next: null | undefined, error: null | undefined, complete: (res: C) => void): Subscription
  subscribe(next: null | undefined, error: (error: E) => void, complete?: (res: C) => void): Subscription
  subscribe(next: (value: T) => void, error: null | undefined, complete: (res: C) => void): Subscription
  subscribe(
    observerOrNext?: NextObserver<T, E, C> | ((value: T) => void) | null,
    error?: ((err: E) => void) | null,
    complete?: ((res: C) => void) | null
  ): Subscription {
    const sink = new Subscriber(observerOrNext, error, complete)
    sink.add(this._subscribe(sink))
    return sink
  }
}
