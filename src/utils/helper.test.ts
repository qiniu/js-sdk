import mock from 'xhr-mock'

import { QiniuNetworkError } from '../errors'
import { computeMd5, createLocalKey, getPortFromUrl, request } from './helper'

describe('api function test', () => {
  test('createLocalKey', () => {
    expect(createLocalKey('test', null, 1024)).toMatch('qiniu_js_sdk_upload_file_name_test_size_1024')
    expect(createLocalKey('test', 'demo', 1024)).toMatch('qiniu_js_sdk_upload_file_name_test_key_demo_size_1024')
  })

  test('computeMd5', async () => {
    const testData = [
      ['message', '78e731027d8fd50ed642340b7c9a63b3'],
      ['undefined', '5e543256c480ac577d30f76f9120eb74'],
      ['message áßäöü', '3fc4229d4a54045f5d5b96dd759581d4']
    ]

    for (const [input, expected] of testData) {
      const testBlob = new Blob([input], { type: 'text/plain;charset=utf-8' })
      // eslint-disable-next-line no-await-in-loop
      const actual = await computeMd5(testBlob)
      expect(actual).toStrictEqual(expected)
    }
  })

  test('getPortFromUrl', () => {
    const testData = [
      ['', ''],
      ['//loaclhost', ''],
      ['http://loaclhost', '80'],
      ['https://loaclhost', '443'],
      ['http://loaclhost:3030', '3030'],
      ['https://loaclhost:3030', '3030'],
      ['http://loaclhost:3030/path', '3030'],
      ['http://loaclhost:3030/path?test=3232', '3030'],
      ['http://loaclhost.com:3030/path?test=3232', '3030'],
      ['http://loaclhost.com.cn:3030/path?test=3232', '3030']
    ]

    for (const [input, expected] of testData) {
      const actual = getPortFromUrl(input)
      expect(actual).toStrictEqual(expected)
    }
  })

  describe('xhr test', () => {
    beforeEach(() => mock.setup())
    afterEach(() => mock.teardown())

    it('reqeust timeout', async () => {
      expect.assertions(4)

      mock.post('/', () => new Promise(() => null))

      await request('/', { method: 'POST', timeout: 1000, body: 'mock data' })
        .catch((error: QiniuNetworkError) => {
          expect(error).toBeInstanceOf(QiniuNetworkError)
          expect(error.type).toBe('timeout')
        })

      mock.get('/', () => new Promise(() => null))

      await request('/', { method: 'GET', timeout: 1000 })
        .catch((error: QiniuNetworkError) => {
          expect(error).toBeInstanceOf(QiniuNetworkError)
          expect(error.type).toBe('timeout')
        })
    })

    it('reqeust don\'t timeout', async () => {
      const mockedFn = jest.fn()

      mock.post('/', {
        body: '{}'
      })

      await request('/', { method: 'POST', timeout: 2000, body: 'mock data' })
        .then(mockedFn)
        .catch((error: QiniuNetworkError) => {
          expect(error).toBeInstanceOf(QiniuNetworkError)
          expect(error.type).toBe('timeout')
        })

      mock.get('/', {
        body: '{}'
      })

      await request('/', { method: 'GET', timeout: 2000 })
        .then(mockedFn)
        .catch((error: QiniuNetworkError) => {
          expect(error).toBeInstanceOf(QiniuNetworkError)
          expect(error.type).toBe('timeout')
        })

      expect(mockedFn).toBeCalledTimes(2)
    })
  })
})
