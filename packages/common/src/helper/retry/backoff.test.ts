import {
  FixedBackoff,
  ExponentialBackoff,
  RandomizedBackoff,
  LimitedBackoff
} from './backoff'

describe('retry backoff test', () => {
  test('test FixedBackoff', () => {
    const backoff = new FixedBackoff(1000)
    expect(backoff.getDelay()).toBe(1000)
  })

  test('test ExponentialBackoff', () => {
    const backoff = new ExponentialBackoff(1000)
    expect(backoff.getDelay()).toBe(1000)
    expect(backoff.getDelay()).toBe(2000)
    expect(backoff.getDelay()).toBe(4000)
    expect(backoff.getDelay()).toBe(8000)
  })

  test('test RandomizedBackoff', () => {
    const backoff = new RandomizedBackoff(new FixedBackoff(1000), 100)
    for (let i = 0; i < 100; i += 1) {
      expect(backoff.getDelay()).toBeGreaterThan(900)
      expect(backoff.getDelay()).toBeLessThanOrEqual(1100)
    }

    const backoff2 = new RandomizedBackoff(new FixedBackoff(1000), 10000)
    for (let i = 0; i < 100; i += 1) {
      expect(backoff.getDelay()).toBeGreaterThan(0)
      expect(backoff.getDelay()).toBeLessThanOrEqual(11000)
    }
  })

  test('test LimitedBackoff', () => {
    const backoff = new LimitedBackoff(new ExponentialBackoff(1000), 2000)
    expect(backoff.getDelay()).toBe(1000)
    expect(backoff.getDelay()).toBe(2000)
    expect(backoff.getDelay()).toBe(2000)
    expect(backoff.getDelay()).toBe(2000)
  })
})
