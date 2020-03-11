import { IUploadProgress } from './upload'

export interface INextObject {
  next(res: IUploadProgress): void
  error(err: ICustomError | Error): void
  complete(): any
}

export interface ICustomError {
  code: number	// 请求错误状态码，只有在 err.isRequestError 为 true 的时候才有效。可查阅码值对应说明。
  message: string	// 错误信息，包含错误码，当后端返回提示信息时也会有相应的错误信息。
  isRequestError: true | undefined	// 用于区分是否 xhr 请求错误当 xhr 请求出现错误并且后端通过 HTTP 状态码返回了错误信息时，该参数为 true否则为 undefined 。
  reqId: string	// xhr请求错误的 X-Reqid。
}

export type OnNext = (next: IUploadProgress) => void
export type OnError = (error: ICustomError | Error) => void
export type OnCompleted = () => void
export type SubscribeAction = (params: Observer) => () => void

class Subscription {
  private observer: Observer
  private result: () => any

  constructor(observer: Observer, result: () => any) {
    this.observer = observer
    this.result = result
  }

  unsubscribe() {
    this.observer.isStopped = true // 取消observer的订阅
    this.result()
  }
}

export class Observer {
  private _onNext: OnNext
  private _onError: OnError
  private _onCompleted: OnCompleted
  public isStopped = false


  constructor(oOrOnNext: INextObject)
  constructor(oOrOnNext: OnNext, onError: OnError, onCompleted: OnCompleted)
  constructor(oOrOnNext: OnNext | INextObject, onError?: OnError, onCompleted?: OnCompleted) {
    if (typeof oOrOnNext === 'object') {
      this._onNext = oOrOnNext.next
      this._onError = oOrOnNext.error
      this._onCompleted = oOrOnNext.complete
    } else {
      this._onNext = oOrOnNext
      this._onError = onError as OnError
      this._onCompleted = onCompleted as OnCompleted
    }
  }

  next(value: IUploadProgress) {
    if (!this.isStopped && this._onNext) {
      this._onNext(value)
    }
  }

  error(err: ICustomError | Error) {
    if (!this.isStopped && this._onError) {
      this.isStopped = true
      this._onError(err)
    }
  }

  complete() {
    if (!this.isStopped && this._onCompleted) {
      this.isStopped = true
      this._onCompleted()
    }
  }
}

export class Observable {
  public subscribeAction: SubscribeAction

  constructor(action: SubscribeAction) {
    this.subscribeAction = action
  }


  subscribe(oOrOnNext: INextObject): Subscription
  subscribe(oOrOnNext: OnNext, onError: OnError, onCompleted: OnCompleted): Subscription
  subscribe(oOrOnNext: OnNext | INextObject, onError?: OnError, onCompleted?: OnCompleted): Subscription {
    let observer: Observer

    if (typeof oOrOnNext === 'object') {
      observer = new Observer(oOrOnNext)
    } else {
      observer = new Observer(oOrOnNext, onError as OnError, onCompleted as OnCompleted)
    }

    const result = this.subscribeAction(observer) // 开始发射数据并拿到subscribeAction的返回值
    return new Subscription(observer, result) // 创造控制observer和subscribeAction的实例对象
  }
}
