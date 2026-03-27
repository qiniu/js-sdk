import { UploadError } from '../../../types/error'
import { Result, isCanceledResult, isErrorResult, isSuccessResult } from '../../../types/types'

import { Task, TaskQueue } from './index'
import { RetryTask } from './retry'

const delay = (n: number) => new Promise(r => setTimeout(r, n))

class MockTask implements Task {
  public canceled = false
  public processed = false
  public processCount = 0
  public progressCount = 0
  private _progress: (() => void) | null = null
  private _resolve: ((result: Result) => void) | null = null

  resolve(data: Result) {
    this._resolve?.(data)
  }

  progress() {
    this.progressCount += 1
    this._progress?.()
  }

  async cancel(): Promise<Result> {
    this.canceled = true

    if (this._resolve) {
      this._resolve({ canceled: true })
    }

    return { result: true }
  }

  process(notice: () => void): Promise<Result> {
    return new Promise(resolve => {
      this.processCount += 1
      this.processed = true
      this._resolve = resolve
      this._progress = notice
    })
  }
}

describe('test TaskQueue', () => {
  test('test Cancel', async () => {
    const task1 = new MockTask()
    const task2 = new MockTask()
    const queue = new TaskQueue({
      concurrentLimit: 1
    })
    queue.enqueue(task1, task2)
    const startPromise = queue.start()
    const cancelPromise = queue.cancel()

    const startResult = await startPromise
    const cancelResult = await cancelPromise

    expect(task1.canceled).toBe(true)
    expect(task2.canceled).toBe(false)
    expect(isCanceledResult(startResult)).toBe(true)
    expect(isSuccessResult(cancelResult)).toBe(true)
  })

  test('test Progress', async () => {
    const task1 = new MockTask()
    const queue = new TaskQueue({
      concurrentLimit: 2
    })
    queue.enqueue(task1)
    const startPromise = queue.start()

    await delay(100)
    task1.progress()
    await delay(100)
    task1.resolve({ result: true })

    const startResult = await startPromise

    expect(task1.processCount).toBe(1)
    expect(task1.processCount).toBe(1)
    expect(isSuccessResult(startResult)).toBe(true)
  })

  test('test Complete', async () => {
    let complete = false
    const task = new MockTask()
    const queue = new TaskQueue()
    queue.enqueue(task)
    queue.onComplete(() => {
      complete = true
    })

    const startPromise = queue.start()

    task.resolve({ result: true })
    const startResult = await startPromise

    expect(complete).toBe(true)
    expect(task.canceled).toBe(false)
    expect(isSuccessResult(startResult)).toBe(true)
  })

  test('test Error', async () => {
    let error = false
    const task = new MockTask()
    const queue = new TaskQueue()
    queue.enqueue(task)
    queue.onError(() => {
      error = true
    })

    const startPromise = queue.start()
    task.resolve({ error: new UploadError('InternalError', 'test') })
    const startResult = await startPromise

    expect(error).toBe(true)
    expect(task.canceled).toBe(false)
    expect(isErrorResult(startResult)).toBe(true)
  })

  test('test tasksCreator', async () => {
    const task = new MockTask()
    const queue = new TaskQueue({
      tasksCreator: async (): Promise<Result<Task[]>> => (
        { result: [task] }
      )
    })

    const startPromise = queue.start()
    await delay(100)
    task.resolve({ result: true })
    await delay(100)
    const startResult = await startPromise

    expect(task.canceled).toBe(false)
    expect(isSuccessResult(startResult)).toBe(true)
  })

  test('test concurrentLimit', async () => {
    const task1 = new MockTask()
    const task2 = new MockTask()
    const task3 = new MockTask()
    const queue = new TaskQueue({
      concurrentLimit: 2
    })
    queue.enqueue(task1, task2, task3)
    const startPromise = queue.start()

    task1.resolve({ canceled: true })
    task2.resolve({ canceled: true })
    task3.resolve({ canceled: true })

    const startResult = await startPromise

    expect(task1.processed).toBe(true)
    expect(task2.processed).toBe(true)
    expect(task3.processed).toBe(false)
    expect(isCanceledResult(startResult)).toBe(true)
  })

  test('test queue nested', async () => {
    const task1 = new MockTask()
    const queue1 = new TaskQueue()
    const queue2 = new TaskQueue()
    queue1.enqueue(queue2)
    queue2.enqueue(task1)
    const startPromise = queue1.start()

    await delay(500)
    task1.resolve({ result: true })
    const startResult = await startPromise

    expect(task1.processed).toBe(true)
    expect(isSuccessResult(startResult)).toBe(true)
  })

  test('test repeat start', async () => {
    const task1 = new MockTask()
    const queue1 = new TaskQueue()
    queue1.enqueue(task1)
    const start1Promise = queue1.start()
    const start2Promise = queue1.start()

    await delay(500)
    task1.resolve({ result: true })

    const start1Result = await start1Promise
    const start2Result = await start2Promise

    expect(task1.processed).toBe(true)
    expect(isErrorResult(start2Result)).toBe(true)
    expect(isSuccessResult(start1Result)).toBe(true)
  })
})

describe('test RetryTask', () => {
  test('test retry on NetworkError', async () => {
    const task = new MockTask()
    const retryTask = new RetryTask(task, {
      retryDelay: 100
    })

    const processPromise = retryTask.process(() => {})

    await delay(50)
    task.resolve({ error: new UploadError('NetworkError', 'test') })
    await delay(150)
    task.resolve({ result: true })

    const result = await processPromise

    expect(task.processCount).toBe(2)
    expect(isSuccessResult(result)).toBe(true)
  })

  test('test no retry on non-NetworkError', async () => {
    const task = new MockTask()
    const retryTask = new RetryTask(task, {
      retryDelay: 100
    })

    const processPromise = retryTask.process(() => {})

    await delay(50)
    task.resolve({ error: new UploadError('InternalError', 'test') })

    const result = await processPromise

    expect(task.processCount).toBe(1)
    expect(isErrorResult(result)).toBe(true)
  })

  test('test max retries exceeded', async () => {
    const task = new MockTask()
    const retryTask = new RetryTask(task, {
      retryDelay: 100
    })

    const processPromise = retryTask.process(() => {})

    await delay(50)
    task.resolve({ error: new UploadError('NetworkError', 'test 1') })
    await delay(150)
    task.resolve({ error: new UploadError('NetworkError', 'test 2') })

    const result = await processPromise

    expect(task.processCount).toBe(2)
    expect(isErrorResult(result)).toBe(true)
  })

  test('test cancel', async () => {
    const task = new MockTask()
    const retryTask = new RetryTask(task)

    const processPromise = retryTask.process(() => {})

    await delay(50)
    await retryTask.cancel()

    const result = await processPromise

    expect(task.canceled).toBe(true)
    expect(isCanceledResult(result)).toBe(true)
  })

  test('test custom shouldRetry', async () => {
    const task = new MockTask()
    const retryTask = new RetryTask(task, {
      retryDelay: 100,
      shouldRetry: (error) => error.name === 'InternalError'
    })

    const processPromise = retryTask.process(() => {})

    await delay(50)
    task.resolve({ error: new UploadError('InternalError', 'test') })
    await delay(150)
    task.resolve({ result: true })

    const result = await processPromise

    expect(task.processCount).toBe(2)
    expect(isSuccessResult(result)).toBe(true)
  })
})
