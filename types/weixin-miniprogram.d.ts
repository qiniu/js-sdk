declare namespace WeixinMiniProgram {
  interface RequestOptions {
    url: string,
    method?: string
    headers?: Object
    timeout?: number // 毫秒
    data?: string | object | ArrayBuffer
    complete?: () => void
    success?: (response: any) => void
    fail?: (error: any) => void
  }

  interface RequestTask {
    abort: () => void
  }

  interface Wx {
    request(options: RequestOptions): RequestTask
  }
}

declare const wx: WeixinMiniProgram.Wx
