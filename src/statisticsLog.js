import { createXHR } from "./utils";

export class StatisticsLogger{

  log(info, token) {
    let logString = "";
    Object.keys(info).forEach(k => logString += info[k] + ",");
    this.send(logString, token);
  }

  send(logString, token){
    let xhr = createXHR();
    let count = 0;
    xhr.open("POST", "https://uplog.qbox.me/log/3");
    xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xhr.setRequestHeader("Authorization", "UpToken " + token);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (xhr.status !== 200) {
            count++;
            count <= 3 ? xhr.send(logString) : "";
        } 
      }
    };
    xhr.send(logString);
  }

}