# SDK README

## 快速使用

1. 安装SDK

```bash
ohpm i @qiniu/upload
```

2. 导入SDK

```typescript
import { createDirectUploadTask, createMultipartUploadTask, FileData } from '@qiniu/upload';
```

3. 创建上传任务

```typescript
// 创建上传数据
const fileData: FileData = { type: 'uri', data: 'datashare://xxxx' }
const fileData: FileData = { type: 'path', data: '/data/storage/xxx' }
const fileData: FileData = { type: 'string', data: 'content' }
const fileData: FileData = { type: 'array-buffer', data: new ArrayBuffer(1e3) }

// 创建直传任务
const uploadTask = createDirectUploadTask(fileData, config);

// 创建分片上传任务
// 当前版本 SDK 暂不支持部分私有云服务版本较老的分片上传功能
const uploadTask = createMultipartUploadTask(fileData, config);
```

1. 设置任务回调函数

```typescript
// 设置进度回调函数
uploadTask.onProgress((progress, context) => {
  // 处理进度回调
});

// 设置完成回调函数
uploadTask.onComplete((result, context) => {
  // 处理完成回调
});

// 设置错误回调函数
uploadTask.onError((error, context) => {
  // 处理错误回调
});
```

5. 启动任务

```typescript
uploadTask.start()
```

6. 简单模式

如果你不需要关心进度信息，可以通过 start 快速获取任务的状态信息

```
createMultipartUploadTask(fileData, config).start()
 .then((result) => {
    // 处理任务完成结果
  })
  .catch((error) => {
    // 处理任务启动失败错误
  });
```

## 接口说明

### TokenProvider

```typescript
type TokenProvider = () => Promise<string>
```

- 一个用于获取上传所需 token 的函数类型。
- 返回一个 Promise，该 Promise 提供上传所需的 token。

### Context

```typescript
interface Context<ProgressKey extends string = string> {
  host?: Host;
  token?: Token;
  result?: string;
  error?: UploadError;
  progress: Progress<ProgressKey>;
}
```

- 上传的上下文接口，用于存储任务相关的信息。
- `host`：上传使用的 host。
- `token`：上传使用的 token。
- `result`：上传成功的信息。
- `error`：队列的错误。
- `progress`：整体的任务进度信息。

### UploadConfig

```typescript
interface UploadConfig {
  tokenProvider: TokenProvider;
  apiServerUrl?: string;
  uploadHosts?: []string;
  logLevel?: LogLevel;
  protocol?: HttpProtocol;
  vars?: Record<string, string>;
}
```

- 上传配置接口，用于配置上传任务的相关参数。
- `apiServerUrl`：服务的接口地址；默认为七牛公有云，示例：<https://api.qiniu.com> 该配置仅当未设置 `uploadHosts` 时生效，SDK 将会通过指定的 api 服务提供的接口来动态获取上传地址，私有云请联系集群运维人员，并确认集群是否支持 `v4/query` 接口
- `uploadHosts`: 上传服务地址，手动指定上传服务地址，示例：up.qiniu.com
- `logLevel`：日志级别。
- `protocol`：HTTP 协议，默认 HTTPS。
- `tokenProvider`：用于获取上传所需 token 的函数。
- `vars`: 上传过程中的自定义变量。

### OnError

```typescript
type OnError = (error: UploadError, context: Context) => void;
```

- 错误回调函数类型。

### OnProgress

```typescript
type OnProgress = (progress: Progress, context: Context) => void;
```

- 进度回调函数类型。

#### Progress

```typescript
type Progress<Key extends string = string> = {
  /** 上传的文件总大小；单位 byte */
  size: number
  /** 目前处理的百分比进度；范围 0-1 */
  percent: number
  /** 具体每个部分的进度信息； */
  details: Record<Key, {
    /** 子任务的处理数据大小；单位 byte */
    size: number
    /** 目前处理的百分比进度；范围 0-1 */
    percent: number
    /** 该处理是否复用了缓存； */
    fromCache: boolean
  }>
}
```

### OnComplete

```typescript
type OnComplete = (result: string, context: Context) => void;
```

- 完成回调函数类型。
- 接收一个上下文参数，并返回 `void`。

### UploadTask

```typescript
interface UploadTask {
  onProgress(fn: OnProgress): void;
  onComplete(fn: OnComplete): void;
  onError(fn: OnError): void;
  cancel(): Promise<Result>;
  start(): Promise<Result>;
}
```

- 上传任务接口，用于控制上传任务的执行和处理回调函数。
- `onProgress(fn: OnProgress)`：设置进度回调函数。
- `onComplete(fn: OnComplete)`：设置完成回调函数。
- `onError(fn: OnError)`：设置错误回调函数。
- `cancel()`：取消上传任务，并返回一个 Promise，该 Promise 在解析时提供任务结果。
- `start()`：启动上传任务，并返回一个 Promise， 该 Promise 在解析时提供任务结果。
