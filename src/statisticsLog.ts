import { createXHR } from './utils'

interface LogInfo {
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

export default class StatisticsLogger {

  log(info: LogInfo, token: string) {
    const logString = Object.values(info).join(',')
    this.send(logString, token, 0)
  }

  send(logString: string, token: string, retryCount: number) {
    const xhr = createXHR()
    xhr.open('POST', 'https://uplog.qbox.me/log/3')
    xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded')
    xhr.setRequestHeader('Authorization', 'UpToken ' + token)
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4 && xhr.status !== 200 && ++retryCount <= 3) {
        this.send(logString, token, retryCount)
      }
    }
    xhr.send(logString)
  }

}
