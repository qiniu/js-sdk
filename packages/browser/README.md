# SDK README

## 快速使用

1. 安装SDK

```
npm install @qiniu/wechat-miniprogram-upload
```

2. 导入SDK

```javascript
import { createDirectUploadTask, createMultipartUploadTask, FileData } from '@qiniu/wechat-miniprogram-upload';
```

3. 创建上传任务

```javascript
// 创建上传数据
const fileData: FileData = { type: 'file', data: File }
const fileData: FileData = { type: 'string', data: 'content' }
const fileData: FileData = { type: 'array-buffer', data: new ArrayBuffer(1e3) }

// 创建直传任务
const directUploadTask = createDirectUploadTask(fileData, config);

// 创建分片上传任务
const multipartUploadTask = createMultipartUploadTask(fileData, config);
```

1. 设置任务回调函数

```javascript
// 设置进度回调函数
directUploadTask.onProgress((context) => {
  // 处理进度回调
});

// 设置完成回调函数
directUploadTask.onComplete((context) => {
  // 处理完成回调
});

// 设置错误回调函数
directUploadTask.onError((context) => {
  // 处理错误回调
});
```

5. 启动任务

```javascript
directUploadTask.start()
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
  serverUrl?: string;
  logLevel?: LogLevel;
  protocol?: HttpProtocol;
  vars?: Record<string, string>;
}
```

- 上传配置接口，用于配置上传任务的相关参数。
- `serverUrl`：服务器 URL，默认为 api.qiniu.com，专有云根据情况填写。
- `logLevel`：日志级别。
- `protocol`：HTTP 协议，默认 HTTPS。
- `tokenProvider`：用于获取上传所需 token 的函数。
- `vars`: 上传过程中的自定义变量。

### OnError

```typescript
type OnError = (context: Context) => void;
```

- 错误回调函数类型。
- 接收一个上下文参数，并返回 `void`。

### OnProgress

```typescript
type OnProgress = (context: Context) => void;
```

- 进度回调函数类型。
- 接收一个上下文参数，并返回 `void`。

### OnComplete

```typescript
type OnComplete = (context: Context) => void;
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
- `start()`：启动上传任务，并返回一个 Promise， 该Promise 在解析时提供任务结果。
