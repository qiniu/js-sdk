export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'NONE'

const LogLevelWidth: Record<LogLevel, number> = {
  NONE: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
}

export class Logger {
  constructor(private logLevel: LogLevel = 'NONE', private prefix = 'DEFAULT') {}

  private log(level: LogLevel, message: string): void {
    if (this.logLevel === 'NONE') return

    if (LogLevelWidth[level] >= LogLevelWidth[this.logLevel]) {
      // eslint-disable-next-line no-console
      console.log(`[${this.prefix}][${level}]: ${message}`)
    }
  }

  public info(message: string): void {
    this.log('INFO', message)
  }

  public warn(message: string): void {
    this.log('WARN', message)
  }

  public error(message: string): void {
    this.log('ERROR', message)
  }
}
