import Logger from './index'

let isCallReport = false

jest.mock('./report-v3', () => ({
  reportV3: () => {
    isCallReport = true
  }
}))

// eslint-disable-next-line no-console
const originalLog = console.log
// eslint-disable-next-line no-console
const originalWarn = console.warn
// eslint-disable-next-line no-console
const originalError = console.error

const logMessage: unknown[] = []
const warnMessage: unknown[] = []
const errorMessage: unknown[] = []

beforeAll(() => {
  // eslint-disable-next-line no-console
  console.log = jest.fn((...args: unknown[]) => logMessage.push(...args))
  // eslint-disable-next-line no-console
  console.warn = jest.fn((...args: unknown[]) => warnMessage.push(...args))
  // eslint-disable-next-line no-console
  console.error = jest.fn((...args: unknown[]) => errorMessage.push(...args))
})

afterAll(() => {
  // eslint-disable-next-line no-console
  console.log = originalLog
  // eslint-disable-next-line no-console
  console.warn = originalWarn
  // eslint-disable-next-line no-console
  console.error = originalError
})

describe('test logger', () => {
  test('level', () => {
    const infoLogger = new Logger('', true, 'INFO')
    infoLogger.info('test1')
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    expect(logMessage).toStrictEqual([infoLogger.getPrintPrefix('INFO'), 'test1'])
    infoLogger.warn('test2')
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    expect(warnMessage).toStrictEqual([infoLogger.getPrintPrefix('WARN'), 'test2'])
    infoLogger.error('test3')
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    expect(errorMessage).toStrictEqual([infoLogger.getPrintPrefix('ERROR'), 'test3'])

    // 清空消息
    logMessage.splice(0, logMessage.length)
    warnMessage.splice(0, warnMessage.length)
    errorMessage.splice(0, errorMessage.length)

    const warnLogger = new Logger('', true, 'WARN')
    warnLogger.info('test1')
    expect(logMessage).toStrictEqual([])
    warnLogger.warn('test2')
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    expect(warnMessage).toStrictEqual([warnLogger.getPrintPrefix('WARN'), 'test2'])
    warnLogger.error('test3')
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    expect(errorMessage).toStrictEqual([warnLogger.getPrintPrefix('ERROR'), 'test3'])

    // 清空消息
    logMessage.splice(0, logMessage.length)
    warnMessage.splice(0, warnMessage.length)
    errorMessage.splice(0, errorMessage.length)

    const errorLogger = new Logger('', true, 'ERROR')
    errorLogger.info('test1')
    expect(logMessage).toStrictEqual([])
    errorLogger.warn('test2')
    expect(warnMessage).toStrictEqual([])
    errorLogger.error('test3')
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    expect(errorMessage).toStrictEqual([errorLogger.getPrintPrefix('ERROR'), 'test3'])

    // 清空消息
    logMessage.splice(0, logMessage.length)
    warnMessage.splice(0, warnMessage.length)
    errorMessage.splice(0, errorMessage.length)

    const offLogger = new Logger('', true, 'OFF')
    offLogger.info('test1')
    expect(logMessage).toStrictEqual([])
    offLogger.warn('test2')
    expect(warnMessage).toStrictEqual([])
    offLogger.error('test3')
    expect(errorMessage).toStrictEqual([])
  })

  test('unique id', () => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const startId = Logger.id
    // eslint-disable-next-line no-new
    new Logger('', true, 'OFF')
    // eslint-disable-next-line no-new
    new Logger('', true, 'OFF')
    const last = new Logger('', true, 'OFF')
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    expect(last.id).toStrictEqual(startId + 3)
  })

  test('report', () => {
    const logger1 = new Logger('', false, 'OFF')
    logger1.report(null as any)
    expect(isCallReport).toBeTruthy()
    isCallReport = false
    const logger2 = new Logger('', true, 'OFF')
    logger2.report(null as any)
    expect(isCallReport).toBeFalsy()
  })
})
