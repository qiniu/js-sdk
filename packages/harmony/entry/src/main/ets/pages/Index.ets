import picker from '@ohos.file.picker'
import { createMultipartUploadV2Task, createDirectUploadTask, UploadFile, UploadTask, Progress as UploadProgress } from '@qiniu/upload'
import { UploadError } from '@qiniu/upload/src/main/ets/components/@internal'

const token = 'dgHUyu6FJLTIqHZS2Be798icC_DXdHAqaNa9WnO0:UrM8khFar8tad-Yf3xz-9WGyISE=:eyJzY29wZSI6InNkay10ZXN0LTExIiwiZGVhZGxpbmUiOjE4MTQ4OTU4MzAsInJldHVybkJvZHkiOiJ7XCJrZXlcIjokKGtleSksXCJoYXNoXCI6ICQoZXRhZyksIFwidGVzdFwiOiQoeDp0ZXN0KX0iLCJkZXRlY3RNaW1lIjoxfQ=='

@Entry
@Component
struct Index {
  @State file: string | undefined = ''
  @State error: string | undefined = ''
  @State result: string | undefined = ''
  @State task: UploadTask | null = null
  @State progress: UploadProgress | null = null

  selectUploadFile() {
    try {
      let PhotoSelectOptions = new picker.PhotoSelectOptions()
      PhotoSelectOptions.MIMEType = picker.PhotoViewMIMETypes.IMAGE_TYPE
      PhotoSelectOptions.maxSelectNumber = 1
      let photoPicker = new picker.PhotoViewPicker()
      photoPicker.select(PhotoSelectOptions).then((PhotoSelectResult) => {
        console.info('PhotoViewPicker.select successfully, PhotoSelectResult uri: ' + JSON.stringify(PhotoSelectResult))
        this.file = PhotoSelectResult.photoUris[0]
      }).catch((err: Error) => {
        console.error('PhotoViewPicker.select failed with err: ' + err)
        this.file = ''
      })
    } catch (err) {
      this.file = ''
    }
  }

  getUploadFile(): UploadFile {
    if (this.file && this.file != '') {
      return UploadFile.fromUri(this.file)
    }

    return UploadFile.fromString('1'.repeat(1024 * 1024 * 10))
  }

  stopTask() {
    if (this.task) this.task.cancel()
  }

  startTask() {
    if (this.task) this.task.start().catch((error: UploadError) => {
      console.log(JSON.stringify(error))
    })
  }

  async uploadFileByMultipart() {
    const context = getContext(this)

    const file = this.getUploadFile()

    file.filename = "test-test"
    file.mimeType = "232312323/2312"
    file.metadata = {
      '2321': "2323232"
    }

    const task = createMultipartUploadV2Task(context, file, {
      logLevel: 'INFO',
      vars: { test: '222222' },
      tokenProvider: () => Promise.resolve(token)
    })

    this.uploadFileState(task)
    await task.start()
  }

  async uploadFileByDirect() {
    const context = getContext(this)
    const fileData = this.getUploadFile()
    const task = createDirectUploadTask(context, fileData, {
      logLevel: 'INFO',
      tokenProvider: () => Promise.resolve(token)
    })
    this.uploadFileState(task)
    await task.start()
  }

  uploadFileState(task: UploadTask) {
    this.task = task
    // task.onProgress(progress => this.progress = progress)
    task.onComplete(result => this.result = result)
    task.onError(error => this.error = error?.message)
  }

  build() {
    Row() {
      Scroll() {
        Column() {
          Text('上传测试')
            .fontSize(20)
            .fontWeight(FontWeight.Bold)
          Text(`当前文件：${this.file || '自动生成'}`)
            .fontSize(14)
            .fontWeight(FontWeight.Bold)
          Text(`结果：${this.result}`)
            .fontSize(14)
            .fontWeight(FontWeight.Bold)
          // Column() {
          //   ForEach(Object.keys(this.progress?.details), (key: string) => {
          //     Text(`${key}: ${this.progress?.details[key]?.percent}`)
          //       .fontSize(14)
          //       .fontWeight(FontWeight.Bold)
          //   })
          // }
          Text(`错误：${this.error}`)
            .fontSize(14)
            .fontWeight(FontWeight.Bold)
          Button('选择文件')
            .width(200)
            .height(50)
            .margin(10)
            .onClick(() => this.selectUploadFile())
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
