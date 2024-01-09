import * as qiniu from '@qiniu/wechat-miniprogram-upload'

Component({
  data: {
    tabs: [
      {
        text: '文本上传',
        iconPath: '/pages/index/tab-icons/document_text_outlined.png',
        selectedIconPath: '/pages/index/tab-icons/document_text.png',
      },
      {
        text: '文件上传',
        iconPath: '/pages/index/tab-icons/file_outlined.png',
        selectedIconPath: '/pages/index/tab-icons/file.png',
      }
    ],
    file: '',
    token: 'dgHUyu6FJLTIqHZS2Be798icC_DXdHAqaNa9WnO0:Zzn3vpv6bkDTBLSeY_n7qi2oDwg=:eyJzY29wZSI6InNkay10ZXN0LTExIiwiZGVhZGxpbmUiOjE3MTQ3OTU4MzAsInJldHVybkJvZHkiOiJ7XCJrZXlcIjokKGtleSksXCJoYXNoXCI6ICQoZXRhZyksIFwidGVzdFwiOiQoeDp0ZXN0KX0ifQ==',
    text: '测试上传文本内容',
    progress: '',
    task: null
  },
  methods: {
    onTabChange() {

    },
    selectMedia() {
      wx.chooseMedia({
        count: 1,
        sourceType: ['album', 'camera'],
        mediaType: ['image', 'mix', 'video'],
        success: tempFiles => this.setData({ ...this.data, file: tempFiles.tempFiles[0].tempFilePath })
      })
    },
    async uploadText() {
      const file: qiniu.FileData = { type: 'string', data: this.data.text }
      const task = qiniu.createDirectUploadTask(file, {
        vars: { 'test': '2222222' },
        tokenProvider: () => Promise.resolve(this.data.token)
      })
      await this.printTask(task)

    },

    async uploadArrayBuffer() {
      const buffer = new ArrayBuffer(100)
      const file: qiniu.FileData = {
        type: 'array-buffer',
        data: buffer,
        filename: 'test.test',
        mimeType: 'test/test',
        metadata: {
          '222222': '22222',
          '2231231': '22313'
        }
      }
      const task = qiniu.createDirectUploadTask(file, {
        vars: { 'test': '2222222' },
        tokenProvider: () => Promise.resolve(this.data.token)
      })
      await this.printTask(task)
    },

    async uploadFile() {
      const file: qiniu.FileData = {
        type: 'path',
        data: this.data.file,
        filename: 'test.test2312',
        mimeType: 'test/test',
        metadata: {
          '222222123': '222231222',
          '223123231231': '2231232313'
        }
      }
      const task = qiniu.createMultipartUploadTask(file, {
        vars: { 'test': '2222222' },
        tokenProvider: () => Promise.resolve(this.data.token)
      })
      await this.printTask(task)
    },

    async printTask(task: qiniu.UploadTask) {
      task.onProgress(ctx => this.setData({ ...this.data, progress: JSON.stringify(ctx.progress) }))
      task.onProgress(ctx => console.log('Progress: ', JSON.stringify(ctx.progress)))
      task.onComplete(ctx => console.log('Complete: ', ctx))
      task.onError(ctx => console.log('Error: ', ctx))
      this.data.task = task as any
      console.log('await task.start', await task.start())
    },

    async stopTask() {
      if (this.data.task) {
        (this.data.task as unknown as qiniu.UploadTask).cancel()
      }
    },

    async startTask() {
      if (this.data.task) {
        (this.data.task as unknown as qiniu.UploadTask).start()
      }
    }
  },
})
