export class Observable {
  constructor(subscribeAction) {
    this.subscribeAction = subscribeAction;
  }
  subscribe(oOrOnNext, onError, onCompleted) {
    let observer = new Observer(oOrOnNext, onError, onCompleted);
    let result = this.subscribeAction(observer); // 开始发射数据并拿到subscribeAction的返回值
    return new Subscription(observer, result); // 创造控制observer和subscribeAction的实例对象
  }
}

class Observer {
  constructor(onNext, onError, onCompleted) {
    this.isStopped = false;
    if (typeof onNext === "object") {
      this._onNext = onNext.next;
      this._onError = onNext.error;
      this._onCompleted = onNext.complete;
    } else {
      this._onNext = onNext;
      this._onError = onError;
      this._onCompleted = onCompleted;
    }
  }
  next(value) {
    if (!this.isStopped && this._onNext) {
      this._onNext(value);
    }
  }
  error(err) {
    if (!this.isStopped && this._onError) {
      this.isStopped = true;
      this._onError(err);
    }
  }
  complete(res) {
    if (!this.isStopped && this._onCompleted) {
      this.isStopped = true;
      this._onCompleted(res);
    }
  }
}

class Subscription {
  constructor(observer, result) {
    this.observer = observer;
    this.result = result;
  }
  unsubscribe() {
    this.observer.isStopped = true; // 取消observer的订阅
    this.result();
  }
}
