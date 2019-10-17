import { createXHR } from "./utils";

export class StatisticsLogger{

  log(info, token) {
    let logString = "";
    Object.keys(info).forEach(k => logString += info[k] + ",");
    this.send(logString, token, 0);
  }

  send(logString, token, retryCount) {
    let xhr = createXHR();
    let self = this;
    xhr.open("POST", "https://uplog.qbox.me/log/3");
    xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xhr.setRequestHeader("Authorization", "UpToken " + token);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (xhr.status !== 200) {
          ++retryCount <= 3 && self.send(logString, token, retryCount);
        }
      }
    };
    xhr.send(logString);
  }

}
