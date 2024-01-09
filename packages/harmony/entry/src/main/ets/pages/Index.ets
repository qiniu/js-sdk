import { createMultipartUploadTask, UploadTask, Progress as UploadProgress, FileData } from '@qiniu/upload'

const token = 'token'

@Entry
@Component
struct Index {
  @State error: string = ''
  @State result: string = ''
  @State progress: UploadProgress = {}
  @State task: UploadTask | null = null

  stopTask() {
    if (this.task) this.task.cancel()
  }

  startTask() {
    if (this.task) this.task.start().catch(error => {
      console.log(JSON.stringify(error))
    })
  }

  async uploadFileByMultipart() {
    const context = getContext(this)
    const fileData: FileData = { type: 'string', data: '1'.repeat(1024*1024 * 10)}
    const task =  createMultipartUploadTask(context, fileData, {
      logLevel: 'INFO',
      tokenProvider:  () => Promise.resolve(token)
    })

    this.uploadFileState(task)
    await task.start()
  }

  // async uploadFileByDirect() {
  //   const context = getContext(this)
  //   const fileData: FileData = { type: 'string', data: '1'.repeat(1024*1024 * 10)}
  //   const task =  createDirectUploadTask(context, fileData, {
  //     logLevel: 'INFO',
  //     tokenProvider:  () => Promise.resolve(token)
  //   })
  //   this.uploadFileState(task)
  //   await task.start()
  // }

  uploadFileState(task: UploadTask) {
    this.task = task
    task.onComplete(ctx =>  this.result = ctx.result)
    task.onProgress(ctx => this.progress = ctx.progress)
    task.onError(ctx => this.error = ctx.error.message)
  }

  build() {
    Row() {
      Scroll() {
      Column() {
        Text('上传测试')
          .fontSize(20)
          .fontWeight(FontWeight.Bold)
        Text(`结果：${this.result}`)
          .fontSize(14)
          .fontWeight(FontWeight.Bold)
        Column() {
          ForEach(Object.keys(this.progress), key => {
            Text(`${key}: ${this.progress[key]}`)
              .fontSize(14)
              .fontWeight(FontWeight.Bold)
          })
        }
        Text(`错误：${this.error}`)
          .fontSize(14)
          .fontWeight(FontWeight.Bold)
        Button('分片上传测试')
          .width(200)
          .height(50)
          .margin(10)
          .onClick(() => this.uploadFileByMultipart())
        Button('直传测试')
          .width(200)
          .height(50)
          .margin(10)
          .onClick(() => this.uploadFileByDirect())
        Button('取消任务')
          .width(200)
          .height(50)
          .margin(10)
          .onClick(() => this.stopTask())
        Button('继续任务')
          .width(200)
          .height(50)
          .onClick(() => this.startTask())
      }
      .width('100%')
      }
    .height('100%')
    }
  }
}
