export abstract class Backoff {
  abstract getDelay(): number

  async wait() {
    const n = this.getDelay()
    if (n <= 0) {
      return
    }
    await new Promise(resolve => setTimeout(resolve, n))
  }
}

export class FixedBackoff extends Backoff {
  private delay: number
  constructor(delay: number) {
    super()
    this.delay = delay
  }

  getDelay(): number {
    return this.delay
  }
}

export class ExponentialBackoff extends Backoff {
  private base: number
  private factor: number
  private next: number

  constructor(base: number, factor = 2) {
    super()
    this.base = base
    this.factor = factor
    this.next = base
  }

  getDelay(): number {
    const delay = this.next
    this.next *= this.factor
    return delay
  }
}

const Second = 1000

// make the backoff delay duration plus the delta,
// delta is belong to (-delta, delta), not inclusive
export class RandomizedBackoff extends Backoff {
  private backoff: Backoff
  private delta: number // int, in milliseconds

  constructor(backoff: Backoff, delta = 2 * Second) {
    super()
    this.backoff = backoff
    this.delta = Math.floor(delta)
  }

  getDelay(): number {
    let diff = Math.floor(Math.random() * this.delta)
    diff = Math.floor(Math.random() * 2) ? diff : -diff
    const delay = this.backoff.getDelay() + diff
    return Math.max(0, delay)
  }
}

export class LimitedBackoff extends Backoff {
  private backoff: Backoff
  private min: number
  private max: number

  constructor(backoff: Backoff, max: number, min = 0) {
    super()
    if (min > max) {
      throw new Error('min should be less than or equal to max')
    }
    this.backoff = backoff
    this.max = max
    this.min = min
  }

  getDelay(): number {
    let delay = Math.min(
      this.max,
      this.backoff.getDelay()
    )
    delay = Math.max(
      this.min,
      delay
    )
    return delay
  }
}

export function getDefaultBackoff(): Backoff {
  const exponential = new ExponentialBackoff(3 * Second)
  const randomized = new RandomizedBackoff(exponential, Second)
  return new LimitedBackoff(randomized, 30 * Second)
}
