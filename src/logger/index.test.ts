import Logger from './index'

let isCallReport = false

jest.mock('./report-v3', () => ({
  reportV3: () => {
    isCallReport = true
  }
}))

const originalLog = console.log
const originalWarn = console.warn
const originalError = console.error

const logMessage: unknown[] = []
const warnMessage: unknown[] = []
const errorMessage: unknown[] = []

beforeAll(() => {
  console.log = jest.fn((...args: unknown[]) => logMessage.push(...args))
  console.warn = jest.fn((...args: unknown[]) => warnMessage.push(...args))
  console.error = jest.fn((...args: unknown[]) => errorMessage.push(...args))
})

afterAll(() => {
  console.log = originalLog
  console.warn = originalWarn
  console.error = originalError
})

describe('test logger', () => {
  test('level', () => {
    const infoLogger = new Logger('', true, 'INFO')
    infoLogger.info('test1')
    expect(logMessage).toStrictEqual([`Qiniu-JS-SDK [INFO][1]: `, 'test1'])
    infoLogger.warn('test2')
    expect(warnMessage).toStrictEqual(['Qiniu-JS-SDK [WARN][1]: ', 'test2'])
    infoLogger.error('test3')
    expect(errorMessage).toStrictEqual(['Qiniu-JS-SDK [ERROR][1]: ', 'test3'])

    // 清空消息
    logMessage.splice(0, logMessage.length)
    warnMessage.splice(0, warnMessage.length)
    errorMessage.splice(0, errorMessage.length)

    const warnLogger = new Logger('', true, 'WARN')
    warnLogger.info('test1')
    expect(logMessage).toStrictEqual([])
    warnLogger.warn('test2')
    expect(warnMessage).toStrictEqual(['Qiniu-JS-SDK [WARN][2]: ', 'test2'])
    warnLogger.error('test3')
    expect(errorMessage).toStrictEqual(['Qiniu-JS-SDK [ERROR][2]: ', 'test3'])

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
    expect(errorMessage).toStrictEqual(['Qiniu-JS-SDK [ERROR][3]: ', 'test3'])

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
    // @ts-ignore
    const startId = Logger.id
    new Logger('', true, 'OFF')
    new Logger('', true, 'OFF')
    const last = new Logger('', true, 'OFF')
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
