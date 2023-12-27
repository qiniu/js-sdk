import { Token } from '../../../types/token'
import { UploadError } from '../../../types/error'
import { generateUUID } from '../../../helper/uuid'
import { Result, isCanceledResult, isErrorResult, isSuccessResult } from '../../../types/types'
import { Host } from '../host'

const delay = (ms = 1000) => new Promise(resolve => setTimeout(resolve, ms))

export interface Progress<Key extends string> {
  /** 百分比进度；整个任务队列的进度 */
  percent: number
  /** 进度详情; 包含每个任务的详细进度信息 */
  details: Record<Key, number>
}

export interface TaskState {
  retryCount: number
  status: TaskStatus
  startTime?: number
  endTime?: number
}

/** 队列的上下文；用于在所有任务间共享状态 */
export interface QueueContext<ProgressKey extends string = string> {
  /** 上传使用的 host; 由公共的 HostProvideTask 维护和更新 */
  host?: Host
  /** 上传使用的 token; 由公共的 TokenProvideTask 维护和更新 */
  token?: Token
  /** 上传成功的信息  */
  result?: string
  /** 队列的错误 */
  error?: UploadError
  /** 整体的任务进度信息 */
  progress: Progress<ProgressKey>

  /** 初始化函数；队列开始时执行 */
  setup(): void
}

type ProgressNotice = () => void
export type OnError = () => void
export type OnProgress = () => void
export type OnComplete = () => void
export type TaskStatus = 'waiting' | 'processing' | 'canceled' | 'error' | 'success'

export interface Task {
  cancel(): Promise<Result>
  process(notice: ProgressNotice): Promise<Result>
}

type InnerTask =
  | TaskQueue
  | Task

type TaskCreator = () => Promise<Result<Task[]>>

interface TaskQueueOptions {
  concurrentLimit?: number
  tasksCreator?: TaskCreator
}

export class TaskQueue {
  /** 取消标记 */
  private canceled = false
  /** 队列错误信息； */
  private error?: UploadError
  /** 队列并发标记 */
  private concurrentTicket = 1
  /** 用户传入的任务 */
  private tasks: InnerTask[] = []
  /** 动态创建任务方法 */
  private dynamicTasksCreator?: TaskCreator
  /** 通过 tasksCreator 动态创建的任务 */
  private dynamicTasks: InnerTask[] = []
  /** 任务的状态表 */
  private taskStates = new Map<InnerTask, TaskState>()

  /** 状态订阅函数表 */
  private errorListeners = new Map<string, OnError>()
  private progressListeners = new Map<string, OnProgress>()
  private completeListeners = new Map<string, OnComplete>()

  constructor(options?: TaskQueueOptions) {
    this.dynamicTasksCreator = options?.tasksCreator
    this.concurrentTicket = options?.concurrentLimit || 1
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

  onProgress(listener: OnProgress) {
    const uuid = generateUUID()
    this.progressListeners.set(uuid, listener)
    return () => this.progressListeners.delete(uuid)
  }
  onComplete(listener: OnComplete) {
    const uuid = generateUUID()
    this.completeListeners.set(uuid, listener)
    return () => this.completeListeners.delete(uuid)
  }
  onError(listener: OnError) {
    const uuid = generateUUID()
    this.errorListeners.set(uuid, listener)
    return () => this.errorListeners.delete(uuid)
  }

  private getTaskState(task: InnerTask): TaskState {
    const state = this.taskStates.get(task)
    if (state == null) {
      const initState: TaskState = { status: 'waiting', retryCount: 0 }
      this.taskStates.set(task, initState)
    }
    return this.taskStates.get(task)!
  }

  /** 任务处理函数；递归取出任务并执行，除非遇到 canceled 或 error 状态 */
  private async process(paddingTask?: InnerTask) {
    // 任务已经取消了
    if (this.canceled) return

    // 常规任务处理逻辑
    if (paddingTask != null) {
      if (this.concurrentTicket === 0) return
      // 读取任务的当前状态
      const state = this.getTaskState(paddingTask)

      this.concurrentTicket -= 1
      state.status = 'processing'
      state.startTime = Date.now()
      const isQueue = paddingTask instanceof TaskQueue
      const progressChange = () => this.handleProgress() // bind this

      if (isQueue) {
        // 订阅目标队列的 progress 并在当前队列结束时移除订阅
        const clean = paddingTask.onProgress(progressChange)
        this.onComplete(() => clean())
        this.onError(() => clean())
      }

      const result = await (isQueue ? paddingTask.start() : paddingTask.process(progressChange))
      state.endTime = Date.now()
      this.concurrentTicket += 1

      // 成功，继续进行下次递归
      if (isSuccessResult(result)) {
        // 成功则继续向后处理
        state.status = 'success'
        this.handleProgress()
        this.process()
      }

      // 该任务已经取消，更新状态啥也不干
      if (isCanceledResult(result)) {
        state.status = 'canceled'
        this.handleProgress()
      }

      // 发生错误，重试或停止任务队列
      if (isErrorResult(result)) {
        state.status = 'error'
        this.error = result.error
        // 网络错误或者请求错误，直接重试等待一定时间后重试
        if (result.error.name === 'NetworkError' || result.error.name === 'HttpRequestError') {
          if (state.retryCount <= 3) {
            state.retryCount += 1
            await delay(2000)
            // 继续处理这个任务
            this.process(paddingTask)
            return
          }
        }

        this.handleError()
        this.cancel() // 停止队列
      }

      return
    }

    // 获取处于 waiting 中的任务
    const allTasks = [...this.tasks, ...this.dynamicTasks]
    const waitingTasks = allTasks.filter(task => {
      const state = this.getTaskState(task)
      return state.status === 'waiting'
    })

    // 根据 concurrentLimit 取出任务并执行
    if (waitingTasks.length > 0 && this.concurrentTicket > 0) {
      // 如果还有任务则根据当前剩余的 concurrentLimit 取出任务并执行
      const pendingTasks = waitingTasks.slice(0, this.concurrentTicket)
      for (let index = 0; index < pendingTasks.length; index++) {
        this.process(pendingTasks[index])
      }
      return
    }

    // 获取所有已经完成的任务
    const completedTasks = allTasks.filter(task => {
      const state = this.getTaskState(task)
      return state.status === 'success'
    })

    // 如果任务全部完成了，则触发 complete 事件
    if (completedTasks.length === allTasks.length) {
      this.handleComplete()
    }
  }

  /** 添加任务 */
  enqueue(tasks: Array<Task | TaskQueue>) {
    // 清空现有任务并设置新的任务
    this.tasks.splice(0, Infinity)
    this.tasks.push(...tasks)
  }

  /** 开始处理 */
  async start(): Promise<Result> {
    return new Promise(resolve => {
      // 初始化全局状态
      this.canceled = false
      this.error = undefined
      this.taskStates.clear()

      // 任务状态和 start 函数返回绑定
      this.onComplete(() => resolve({ result: true }))
      this.onError(() => resolve({ error: this.error! }))

      // 如果队列有任务创建方法则执行创建
      if (this.dynamicTasksCreator) {
        // 清空当前的 dynamicTasks
        this.dynamicTasks.splice(0, Infinity)
        this.dynamicTasksCreator().then(result => {
          if (isSuccessResult(result)) {
            this.dynamicTasks.push(...result.result)
            // 任务创建完成，开始处理
            this.process()
          }

          // 发生错误
          if (isErrorResult(result)) {
            this.error = result.error
            this.handleError()
          }
        })

        return
      }

      // 开始处理任务
      this.process()
    })
  }

  /** 取消任务 */
  async cancel() {
    this.canceled = true
    const cancelPromises: Array<Promise<any>> = []
    for (const task of [...this.tasks, ...this.dynamicTasks]) {
      const state = this.getTaskState(task)
      // 处理中的任务需要进行取消操作
      const shouldCanceled = ['processing']
      if (shouldCanceled.includes(state.status)) {
        cancelPromises.push(task.cancel())
      }
    }
    await Promise.all(cancelPromises)
  }
}

/** 上传任务的队列上下文 */
export class UploadQueueContext<ProgressKey extends string = string> implements QueueContext {
  host?: Host
  token?: Token
  result?: string
  error?: UploadError
  progress: Progress<ProgressKey>

  constructor() {
    this.progress = {
      percent: 0,
      details: {} as Record<string, number>
    }
  }

  setup(): void {
    this.error = undefined
    this.progress.percent = 0
    this.progress.details = {} as Record<string, number>
  }
}
