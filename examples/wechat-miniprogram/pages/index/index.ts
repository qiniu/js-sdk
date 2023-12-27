import * as qiniu from '@qiniu-js/wechat-miniprogram'


const token = 'dgHUyu6FJLTIqHZS2Be798icC_DXdHAqaNa9WnO0:1oKniXpgdYlbDWftB6aO8LY52dU=:eyJzY29wZSI6InNkay10ZXN0LTExIiwiZGVhZGxpbmUiOjE3MTM2NTExNjJ9'

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
    text: '测试上传文本内容',
    progress: '',
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
      const file = qiniu.UploadFile.fromString(this.data.text)
      const task = qiniu.createDirectUploadTask(file, {
        tokenProvider: { getUploadToken: () => Promise.resolve(token) }
      })
      this.printTask(task)

    },
    async uploadFile() {
      const file = qiniu.UploadFile.fromPath(this.data.file)
      const task = qiniu.createMultipartUploadTask(file, {
        tokenProvider: { getUploadToken: () => Promise.resolve(token) }
      })
      this.printTask(task)
    },
    async printTask(task: qiniu.UploadTask) {
      task.onProgress(ctx => this.setData({ ...this.data, progress: JSON.stringify(ctx.progress.details) }))
      task.onProgress(ctx => console.log('Progress: ', JSON.stringify(ctx.progress.details)))
      task.onComplete(ctx => console.log('Complete: ', ctx))
      task.onError(ctx => console.log('Error: ', ctx))
      console.log(await task.start());
      (globalThis as any).task = task
    }
  },
})
