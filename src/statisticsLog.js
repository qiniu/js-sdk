import {createXHR} from './utils'

export class StatisticsLogger{

  log(info, token) {
    this.token = token;
    this.info = "";
    Object.keys(info).forEach(k => this.info += info[k] + ",");
    this.send();
  }

  send(){
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
            count <=3 ? xhr.send(this.info) : "";
        } 
      }
    };
    xhr.send(this.info);
  }
  
}