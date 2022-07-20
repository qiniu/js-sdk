import { reportV3, V3LogInfo } from './report-v3'

class MockXHR {
  sendData: string
  openData: string[]
  openCount: number
  headerData: string[]

  status: number
  readyState: number
  onreadystatechange() {
    // null
  }

  clear() {
    this.sendData = ''
    this.openData = []
    this.headerData = []

    this.status = 0
    this.readyState = 0
  }

  open(...args: string[]) {
    this.clear()
    this.openCount += 1
    this.openData = args
  }

  send(args: string) {
    this.sendData = args
  }

  setRequestHeader(...args: string[]) {
    this.headerData.push(...args)
  }

  changeStatusAndState(readyState: number, status: number) {
    this.status = status
    this.readyState = readyState
    this.onreadystatechange()
  }
}

const mockXHR = new MockXHR()

jest.mock('../utils', () => ({
  createXHR: () => mockXHR,
  getAuthHeaders: (t: string) => t
}))

describe('test report-v3', () => {
  const testData: V3LogInfo = {
    code: 200,
    reqId: 'reqId',
    host: 'host',
    remoteIp: 'remoteIp',
    port: 'port',
    duration: 1,
    time: 1,
    bytesSent: 1,
    upType: 'jssdk-h5',
    size: 1
  }

  test('stringify send Data', () => {
    reportV3('token', testData, 3)
    mockXHR.changeStatusAndState(0, 0)
    expect(mockXHR.sendData).toBe([
      testData.code || '',
      testData.reqId || '',
      testData.host || '',
      testData.remoteIp || '',
      testData.port || '',
      testData.duration || '',
      testData.time || '',
      testData.bytesSent || '',
      testData.upType || '',
      testData.size || ''
    ].join(','))
  })

  test('retry', () => {
    mockXHR.openCount = 0
    reportV3('token', testData)
    for (let index = 1; index <= 10; index++) {
      mockXHR.changeStatusAndState(4, 0)
    }
    expect(mockXHR.openCount).toBe(4)

    mockXHR.openCount = 0
    reportV3('token', testData, 4)
    for (let index = 1; index < 10; index++) {
      mockXHR.changeStatusAndState(4, 0)
    }
    expect(mockXHR.openCount).toBe(5)

    mockXHR.openCount = 0
    reportV3('token', testData, 0)
    for (let index = 1; index < 10; index++) {
      mockXHR.changeStatusAndState(4, 0)
    }
    expect(mockXHR.openCount).toBe(1)
  })
})
