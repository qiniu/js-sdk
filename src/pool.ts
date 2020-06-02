export type Task = (...args: any) => Promise<void>

export type QueueContent = {
  task: any
  resolve: <T>(value?: T | PromiseLike<T>) => void
  reject: (reason?: any) => void
}

export class Pool {
  runTask: Task
  queue: QueueContent[] = []
  processing: QueueContent[] = []
  limit: number

  constructor(runTask: Task, limit: number) {
    this.runTask = runTask
    this.limit = limit
  }

  enqueue(task: any) {
    return new Promise((resolve, reject) => {
      this.queue.push({
        task,
        resolve,
        reject
      })
      this.check()
    })
  }

  run(item: QueueContent) {
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
