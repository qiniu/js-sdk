import { Config, ZONE, ZONES, PutExtra } from "./config";
import { createFileUrl, checkExpire, getUploadUrl } from "./utils";
import { UploadManager } from "./upload";
import { imageMogr2, watermark, imageInfo, exif, pipeline } from "./image";
class Observable {
  constructor(subscribeAction) {
    this.subscribeAction = subscribeAction;
  }
  subscribe(oOrOnNext, onError, onCompleted) {
    let observer = new Observer(oOrOnNext, onError, onCompleted);
    let result = this.subscribeAction(observer); //开始发射数据并拿到subscribeAction的返回值
    return new Subscription(observer, result); //创造控制observer和subscribeAction的实例对象
  }
}

//observer的构造类
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
      this._onError(err);
      this.isStopped = true;
    }
  }
  complete(res) {
    if (!this.isStopped && this._onCompleted) {
      this._onCompleted(res);
      this.isStopped = true;
    }
  }
}

//subscription构造函数
class Subscription {
  constructor(observer, result) {
    this.observer = observer;
    this.result = result;
  }
  unsubscribe() {
    this.observer.isStopped = true; //取消observer的订阅
    this.result();
  }
}

function upload(file, key, uptoken, putExtra, config) {
  let option = {
    file: file,
    key: key,
    token: uptoken,
    putExtra: putExtra,
    config: config
  };
  let uploadManager = new UploadManager(option);
  return new Observable(observer => {
    let datasource = uploadManager;
    datasource.onData = e => observer.next(e);
    datasource.onError = e => observer.error(e);
    datasource.onComplete = e => observer.complete(e);
    datasource.putFile();
    return datasource.stop.bind(datasource);
  });
}
export {
  upload,
  Config,
  PutExtra,
  UploadManager,
  ZONES,
  createFileUrl,
  checkExpire,
  getUploadUrl,
  imageMogr2,
  watermark,
  imageInfo,
  exif,
  pipeline
};
