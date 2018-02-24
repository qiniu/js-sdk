import {createXHR} from './utils'

export class StatisticsLogger{

  log(info, token) {
    this.token = token;
    let logString = "";
    Object.keys(info).forEach(k => logString += info[k] + ",");
    this.send(logString);
  }

  send(logString){
    let xhr = createXHR();
    let count = 0;
    let that = this;
    xhr.open('POST', "https://uplog.qbox.me/log/3");
    xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    xhr.setRequestHeader('Authorization', 'UpToken ' + that.token);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (xhr.status !== 200) {
            count++;
            count <=3 ? xhr.send(logString) : "";
        } 
      }
    };
    xhr.send(logString);
  }

}