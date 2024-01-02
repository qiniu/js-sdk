type ProgressListener = (progress: number) => void

/** 虚拟进度条；在没有调用 end 之前会无限慢慢逼近 100%，但不会到达 100% */
export class MockProgress {
  private progress = 0
  private intervalId: number | null = null
  private listeners: ProgressListener[] = []
  constructor(
    /** 最大时间；单位为秒 */
    private timeConstant = 1
  ) {}

  private clearInterval() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  private callListeners() {
    for (const listener of this.listeners) {
      listener(this.progress)
    }
  }

  private setProgress(progress: number) {
    this.progress = progress
    this.callListeners()
  }

  start() {
    let time = 0
    this.progress = 0
    const intervalFrequency = 100
    this.intervalId = setInterval(() => {
      time += intervalFrequency
      this.setProgress(1 - Math.exp(-1 * time / (this.timeConstant * 1000)))
    }, intervalFrequency)
  }

  end() {
    this.clearInterval()
    this.setProgress(1)
  }

  stop() {
    this.clearInterval()
  }

  onProgress(listener: ProgressListener) {
    this.listeners.push(listener)
  }
}
