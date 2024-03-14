import picker from '@ohos.file.picker'
import { createMultipartUploadV2Task, createDirectUploadTask, UploadTask, Progress as UploadProgress, FileData } from '@qiniu/upload'

const token = 'dgHUyu6FJLTIqHZS2Be798icC_DXdHAqaNa9WnO0:Zzn3vpv6bkDTBLSeY_n7qi2oDwg=:eyJzY29wZSI6InNkay10ZXN0LTExIiwiZGVhZGxpbmUiOjE3MTQ3OTU4MzAsInJldHVybkJvZHkiOiJ7XCJrZXlcIjokKGtleSksXCJoYXNoXCI6ICQoZXRhZyksIFwidGVzdFwiOiQoeDp0ZXN0KX0ifQ=='

@Entry
@Component
struct Index {
  @State file: string = ''
  @State error: string = ''
  @State result: string = ''
  @State task: UploadTask | null = null
  @State progress: Partial<UploadProgress> | null = null

  selectUploadFile() {
    try {
      let PhotoSelectOptions = new picker.PhotoSelectOptions()
      PhotoSelectOptions.MIMEType = picker.PhotoViewMIMETypes.IMAGE_TYPE
      PhotoSelectOptions.maxSelectNumber = 1
      let photoPicker = new picker.PhotoViewPicker()
      photoPicker.select(PhotoSelectOptions).then((PhotoSelectResult) => {
        console.info('PhotoViewPicker.select successfully, PhotoSelectResult uri: ' + JSON.stringify(PhotoSelectResult))
        this.file = PhotoSelectResult.photoUris[0]
      }).catch((err) => {
        console.error('PhotoViewPicker.select failed with err: ' + err)
        this.file = ''
      })
    } catch (err) {
      this.file = ''
    }
  }

  getUploadFile(): FileData {
    if (this.file != '') {
      return ({
        type: 'uri',
        data: this.file
      })
    }

    return {
      type: 'string',
      data: '1'.repeat(1024 * 1024 * 10),
    }
  }

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

    const fileData: FileData = {
      ...this.getUploadFile(),
      filename: "test-test",
      mimeType: "232312323/2312",
      metadata: {
        '2321': "2323232"
      }
    }
    const task = createMultipartUploadV2Task(context, fileData, {
      logLevel: 'INFO',
      vars: { test: '222222' },
      tokenProvider: () => Promise.resolve(token)
    })

    this.uploadFileState(task)
    await task.start()
  }

  async uploadFileByDirect() {
    const context = getContext(this)
    const fileData: FileData = this.getUploadFile()
    const task = createDirectUploadTask(context, fileData, {
      logLevel: 'INFO',
      tokenProvider: () => Promise.resolve(token)
    })
    this.uploadFileState(task)
    await task.start()
  }

  uploadFileState(task: UploadTask) {
    this.task = task
    task.onProgress(progress => this.progress = progress as any)
    task.onComplete(result => this.result = result)
    task.onError(error => this.error = error.message)
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
          Column() {
            ForEach(Object.keys(this.progress?.details || {}), key => {
              Text(`${key}: ${this.progress?.details[key]?.percent}`)
                .fontSize(14)
                .fontWeight(FontWeight.Bold)
            })
          }
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
