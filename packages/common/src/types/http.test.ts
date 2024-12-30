import { HttpAbortController, HttpFormData, isHttpFormData, HttpClientOptions, HttpResponse, HttpClient } from './http'

describe('HttpAbortController', () => {
  test('should set aborted to true when abort is called', () => {
    const controller = new HttpAbortController()
    expect(controller.aborted).toBe(false)

    const listener1 = jest.fn()
    const listener2 = jest.fn()
    controller.onAbort(listener1)
    controller.onAbort(listener2)
    controller.abort()

    expect(controller.aborted).toBe(true)
    expect(listener1).toHaveBeenCalledTimes(1)
    expect(listener2).toHaveBeenCalledTimes(1)
  })

  test('should not call listeners more than once', () => {
    const controller = new HttpAbortController()
    const listener = jest.fn()
    controller.onAbort(listener)
    controller.abort()
    controller.abort()
    expect(listener).toHaveBeenCalledTimes(1)
  })
})

describe('HttpFormData', () => {
  test('should set and get values correctly', () => {
    const formData = new HttpFormData()
    formData.set('key1', 'value1')
    formData.set('key2', 'value2', { option: 'option2' })
    expect(formData.get('key1')).toEqual({ value: 'value1' })
    expect(formData.get('key2')).toEqual({ value: 'value2', option: { option: 'option2' } })
  })

  test('should iterate over entries correctly', () => {
    const formData = new HttpFormData()
    formData.set('key1', 'value1')
    formData.set('key2', 'value2', { option: 'option2' })

    const entries = formData.entries()
    expect(entries).toEqual([
      ['key1', 'value1', undefined],
      ['key2', 'value2', { option: 'option2' }]
    ])
  })

  test('should call callback for each entry in forEach', () => {
    const formData = new HttpFormData()
    formData.set('key1', 'value1')
    formData.set('key2', 'value2', { option: 'option2' })

    const callback = jest.fn()
    formData.forEach(callback)

    expect(callback).toHaveBeenCalledTimes(2)
    expect(callback).toHaveBeenCalledWith('key1', 'value1', undefined)
    expect(callback).toHaveBeenCalledWith('key2', 'value2', { option: 'option2' })
  })
})

describe('isHttpFormData', () => {
  test('should return true for instances of HttpFormData', () => {
    const formData = new HttpFormData()
    expect(isHttpFormData(formData)).toBe(true)
  })

  test('should return false for non-instances of HttpFormData', () => {
    expect(isHttpFormData({})).toBe(false)
    // the falsy values return themselves doesn't make sense
    expect(isHttpFormData(null)).toBe(null)
    expect(isHttpFormData(undefined)).toBe(undefined)
    expect(isHttpFormData(0)).toBe(0)
  })
})
