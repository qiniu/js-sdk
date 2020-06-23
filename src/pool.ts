export type RunTask<T> = (...args: T[]) => Promise<void>

export interface QueueContent<T> {
  task: T
  resolve: () => void
  reject: (err?: any) => void
}

export class Pool<T> {
  queue: Array<QueueContent<T>> = []
  processing: Array<QueueContent<T>> = []

  constructor(private runTask: RunTask<T>, private limit: number) {}

  enqueue(task: T) {
    return new Promise((resolve, reject) => {
      this.queue.push({
        task,
        resolve,
        reject
      })
      this.check()
    })
  }

  run(item: QueueContent<T>) {
    this.queue = this.queue.filter(v => v !== item)
    this.processing.push(item)
    this.runTask(item.task).then(
      () => {
        this.processing = this.processing.filter(v => v !== item)
        item.resolve()
        this.check()
      },
      err => item.reject(err)
    )
  }

  check() {
    const processingNum = this.processing.length
    const availableNum = this.limit - processingNum
    this.queue.slice(0, availableNum).forEach(item => {
      this.run(item)
    })
  }
}
