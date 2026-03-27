import { UploadError } from '../../../types/error'
import { LogLevel, Logger } from '../../../helper/logger'
import { generateRandomString } from '../../../helper/string'
import { Result, isCanceledResult, isErrorResult, isSuccessResult } from '../../../types/types'

export interface TaskState {
  status: TaskStatus
}

type ProgressNotice = () => void
export type OnError = () => void
export type OnCancel = () => void
export type OnProgress = () => void
export type OnComplete = () => void
export type TaskStatus = 'waiting' | 'processing' | 'canceled' | 'error' | 'success'

export interface Task {
  cancel(): Promise<Result>

  process(notice: ProgressNotice): Promise<Result>
}

type TaskCreator = () => Promise<Result<Task[]>>

interface LoggerOptions {
  level: LogLevel
  prefix: string
}

interface TaskQueueOptions {
  logger?: LoggerOptions
  concurrentLimit?: number
  tasksCreator?: TaskCreator
}

export class TaskQueue implements Task {
  private logger: Logger
  /** 取消标记 */
  private canceled = false
  /** 队列正在处理中 */
  private processing = false
  /** 队列错误信息 */
  private error?: UploadError
  /** 队列并发数（只读） */
  private readonly concurrentLimit: number
  /** 用户传入的任务 */
  private tasks: Task[] = []
  /** 动态创建任务方法 */
  private readonly tasksCreator?: TaskCreator
  /** 通过 tasksCreator 动态创建的任务 */
  private dynamicTasks: Task[] = []
  /** 任务的状态表 */
  private taskStates = new Map<Task, TaskState>()

  /** 状态订阅函数表 */
  private errorListeners = new Map<string, OnError>()
  private cancelListeners = new Map<string, OnCancel>()
  private progressListeners = new Map<string, OnProgress>()
  private completeListeners = new Map<string, OnComplete>()

  constructor(private options?: TaskQueueOptions) {
    this.tasksCreator = options?.tasksCreator
    this.concurrentLimit = options?.concurrentLimit || 1
    this.logger = new Logger(options?.logger?.level, options?.logger?.prefix)
  }

  // ==================== 公共 API ====================

  /** 添加任务 */
  enqueue(...tasks: Task[]) {
    if (this.processing) throw new Error('task is processing')
    this.tasks.splice(0, Infinity)
    this.tasks.push(...tasks)
  }

  /** 开始处理 */
  async start(): Promise<Result> {
    this.logger.info('--------------------------')
    this.logger.info('Start processing the queue')

    if (this.processing) {
      this.logger.error('Queue exited because its processing')
      return { error: new UploadError('InternalError', 'Task is processing') }
    }

    this.canceled = false
    this.processing = true
    this.error = undefined
    this.taskStates.clear()
    this.dynamicTasks.splice(0, Infinity)
    this.logger.info('Initialize queue status')

    if (this.tasksCreator) {
      this.logger.info('Call tasksCreator')
      const result = await this.tasksCreator()

      if (isErrorResult(result)) {
        this.logger.info(`TasksCreator execution has error: ${result.error.message}`)
        this.error = result.error
        this.processing = false
        this.handleError()
        return { error: result.error }
      }

      if (isCanceledResult(result)) {
        this.logger.info('TasksCreator execution canceled')
        this.processing = false
        this.handleCancel()
        return { canceled: true }
      }

      if (isSuccessResult(result)) {
        this.logger.info('TasksCreator execution successful')
        this.dynamicTasks.push(...result.result)
      }

      this.logger.info('TasksCreator execution completed')
    }

    this.logger.info(`Starting ${this.concurrentLimit} workers`)

    const workers = Array.from(
      { length: this.concurrentLimit },
      (_, index) => this.runWorker(index)
    )

    await Promise.all(workers)

    this.processing = false

    if (this.canceled) {
      this.logger.info('Queue is canceled')
      this.handleCancel()
      return { canceled: true }
    }

    if (this.error) {
      const hErr: UploadError = this.error
      this.logger.error(`Queue has error: ${hErr.message}`)
      this.handleError()
      return { error: this.error }
    }

    this.logger.info('Queue is complete')
    this.handleComplete()
    return { result: true }
  }

  /** 取消任务 */
  async cancel(): Promise<Result> {
    this.logger.info('Cancel the queue')
    this.canceled = true

    const cancelPromises: Array<Promise<any>> = []
    for (const task of [...this.tasks, ...this.dynamicTasks]) {
      const state = this.getTaskState(task)
      if (state.status === 'processing') {
        cancelPromises.push(task.cancel())
      }
    }

    this.logger.info(`Cancel ${cancelPromises.length} tasks in the queue`)
    const results = await Promise.all(cancelPromises)

    for (const cancelItem of results) {
      if (!isSuccessResult(cancelItem)) {
        return cancelItem
      }
    }

    this.logger.info('Cancel completed')
    return { result: true }
  }

  /** 作为 Task 接口使用；桥接 start 并转发进度通知 */
  async process(notice: ProgressNotice): Promise<Result> {
    const cleanListener = this.onProgress(notice)
    const result = await this.start()
    cleanListener()
    return result
  }

  // ==================== 事件订阅 ====================

  onProgress(listener: OnProgress) {
    const uuid = generateRandomString()
    this.progressListeners.set(uuid, listener)
    return () => this.progressListeners.delete(uuid)
  }

  onComplete(listener: OnComplete) {
    const uuid = generateRandomString()
    this.completeListeners.set(uuid, listener)
    return () => this.completeListeners.delete(uuid)
  }

  onError(listener: OnError) {
    const uuid = generateRandomString()
    this.errorListeners.set(uuid, listener)
    return () => this.errorListeners.delete(uuid)
  }

  onCancel(listener: OnCancel) {
    const uuid = generateRandomString()
    this.cancelListeners.set(uuid, listener)
    return () => this.cancelListeners.delete(uuid)
  }

  // ==================== 内部调度 ====================

  /** Worker 循环：不断获取任务并执行，直到没有任务或被中断 */
  private async runWorker(workerId: number): Promise<void> {
    this.logger.info(`Worker ${workerId} started`)

    while (!this.canceled && !this.error) {
      const task = this.acquireNextTask()
      if (!task) {
        this.logger.info(`Worker ${workerId} exited: no more tasks`)
        break
      }

      this.logger.info(`Worker ${workerId} processing task`)
      // eslint-disable-next-line no-await-in-loop
      const result = await task.process(() => this.handleProgress())
      this.logger.info(`Worker ${workerId} task resolved: ${JSON.stringify(result)}`)

      if (isCanceledResult(result)) {
        const state = this.getTaskState(task)
        state.status = 'canceled'
        this.canceled = true
        this.logger.info(`Worker ${workerId} exited: task canceled`)
        break
      }

      if (isErrorResult(result)) {
        const state = this.getTaskState(task)
        state.status = 'error'
        this.error = result.error
        this.logger.info(`Worker ${workerId} exited: task error`)
        break
      }

      if (isSuccessResult(result)) {
        const state = this.getTaskState(task)
        state.status = 'success'
        this.handleProgress()
      }
    }

    this.logger.info(`Worker ${workerId} finished`)
  }

  /** 原子性获取下一个等待中的任务，并标记为 processing */
  private acquireNextTask(): Task | null {
    const allTasks = [...this.tasks, ...this.dynamicTasks]
    for (const task of allTasks) {
      const state = this.getTaskState(task)
      if (state.status === 'waiting') {
        state.status = 'processing'
        return task
      }
    }
    return null
  }

  // ==================== 内部工具 ====================

  private getTaskState(task: Task): TaskState {
    const state = this.taskStates.get(task)
    if (state == null) {
      const initState: TaskState = { status: 'waiting' }
      this.taskStates.set(task, initState)
    }
    return this.taskStates.get(task)!
  }

  private handleProgress() {
    const progressListenerList = [...this.progressListeners.values()]
    for (let index = 0; index < progressListenerList.length; index++) {
      const progressListener = progressListenerList[index]
      if (progressListener) progressListener()
    }
  }

  private handleComplete() {
    const completeListenerList = [...this.completeListeners.values()]
    for (let index = 0; index < completeListenerList.length; index++) {
      const completeListener = completeListenerList[index]
      if (completeListener) completeListener()
    }
  }

  private handleError() {
    const errorListenerList = [...this.errorListeners.values()]
    for (let index = 0; index < errorListenerList.length; index++) {
      const errorListener = errorListenerList[index]
      if (errorListener) errorListener()
    }
  }

  private handleCancel() {
    const cancelListenerList = [...this.cancelListeners.values()]
    for (let index = 0; index < cancelListenerList.length; index++) {
      const cancelListener = cancelListenerList[index]
      if (cancelListener) cancelListener()
    }
  }
}
