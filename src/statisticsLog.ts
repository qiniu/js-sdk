import { createXHR } from './utils'

interface ILogInfo {
  code: number
  reqId: string
  host: string
  remoteIp: string
  port: string
  duration: number
  time: number
  bytesSent: number
  upType: 'jssdk-h5'
  size: number
}

export default class StatisticsLogger{

  log(info: ILogInfo, token: string) {
    let logString = ''
    Object.keys(info).forEach(k => logString += info[k] + ',')
    this.send(logString, token, 0)
  }

  send(logString: string, token: string, retryCount: number) {
    const xhr = createXHR()
    const self = this
    xhr.open('POST', 'https://uplog.qbox.me/log/3')
    xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded')
    xhr.setRequestHeader('Authorization', 'UpToken ' + token)
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status !== 200) {
          ++retryCount <= 3 && self.send(logString, token, retryCount)
        }
      }
    }
    xhr.send(logString)
  }

}
