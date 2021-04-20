import { reportV3, V3LogInfo } from './report-v3'

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'OFF'

export default class Logger {
  private static id: number = 0

  // 为每个类分配一个 id
  // 用以区分不同的上传任务
  private id = Logger.id += 1

  constructor(
    private token: string,
    private disableReport = true,
    private level: LogLevel = 'OFF'
  ) { }

  /**
   * @param  {V3LogInfo} data 上报的数据。
   * @param  {boolean} retry 重试次数，可选，默认为 3。
   * @description 向服务端上报统计信息。
   */
  report(data: V3LogInfo, retry?: number) {
    if (this.disableReport) return
    try { reportV3(this.token, data, retry) }
    catch (error) { console.warn(error) }
  }

  /**
   * @param  {unknown[]} ...args
   * @description 输出 info 级别的调试信息。
   */
  info(...args: unknown[]) {
    const allowLevel: LogLevel[] = ['INFO']
    if (allowLevel.includes(this.level)) {
      console.log(`Qiniu-JS-SDK [INFO][${this.id}]: `, ...args)
    }
  }

  /**
   * @param  {unknown[]} ...args
   * @description 输出 warn 级别的调试信息。
   */
  warn(...args: unknown[]) {
    const allowLevel: LogLevel[] = ['INFO', 'WARN']
    if (allowLevel.includes(this.level)) {
      console.warn(`Qiniu-JS-SDK [WARN][${this.id}]: `, ...args)
    }
  }

  /**
   * @param  {unknown[]} ...args
   * @description 输出 error 级别的调试信息。
   */
  error(...args: unknown[]) {
    const allowLevel: LogLevel[] = ['INFO', 'WARN', 'ERROR']
    if (allowLevel.includes(this.level)) {
      console.error(`Qiniu-JS-SDK [ERROR][${this.id}]: `, ...args)
    }
  }
}
