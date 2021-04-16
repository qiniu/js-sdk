import { createXHR } from './utils'

export type LogLevel = '>=info' | '>=warn' | '>=error' | false

export class Logger {
  constructor(
    private token: string,
    private isReport = false,
    private level: LogLevel = false,
  ) { }

  private stack(): string | undefined {
    const stack = new Error().stack?.split('\n')
    // 裁掉前三行，显示真正的函数调用点
    return stack?.slice(3)[0]?.trim()
  }

  private report(logs: any[], retry = 3) {
    if (!this.isReport) return

    const xhr = createXHR()
    xhr.open('POST', 'https://uplog.qbox.me/log/3')
    xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded')
    xhr.setRequestHeader('Authorization', 'UpToken ' + this.token)
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4 && xhr.status !== 200 && retry > 0) {
        this.report(logs, retry - 1)
      }
    }

    const formattedLogs = logs.map(log => {
      try { return JSON.stringify(log) }
      catch (error) { return JSON.stringify(error) }
    })

    xhr.send(formattedLogs.join('\n'))
  }

  /**
   * @param  {any[]} ...args
   * 输出 info 级别的调试信息
   */
  info(...args: any[]) {
    const allowLevel: LogLevel[] = ['>=info']
    if (allowLevel.includes(this.level)) {
      console.log('Qiniu-JS-SDK[info]: ', ...args)
    }
  }

  /**
   * @param  {any[]} ...args
   * 输出 warn 级别的调试信息
   */
  warn(...args: any[]) {
    const allowLevel: LogLevel[] = ['>=info', '>=warn']
    if (allowLevel.includes(this.level)) {
      console.warn('Qiniu-JS-SDK[warn]: ', ...args)
    }
  }

  /**
   * @param  {any[]} ...args
   * 输出 error 级别的调试信息
   */
  error(...args: any[]) {
    const allowLevel: LogLevel[] = ['>=info', '>=warn', '>=error']
    if (allowLevel.includes(this.level)) {
      console.error('Qiniu-JS-SDK[error]: ', ...args)
      this.report([this.stack(), ...args])
    }
  }
}
