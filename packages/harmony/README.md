# SDK README

## 快速使用

1. 安装SDK

```
ohpm install @qiniu/upload
```

2. 导入SDK

```javascript
import { createDirectUploadTask, createMultipartUploadTask， UploadFile } from '@qiniu/upload';
```

3. 创建上传任务

```javascript
// 获取当前应用的 context
// 关于如何获取具体参考：https://developer.harmonyos.com/cn/docs/documentation/doc-references-V3/js-apis-inner-application-context-0000001427744988-V3
const context = getContext(this)

// 创建上传文件对象
// 特别注意：你需要在用完之后调用 free 手动释放该对象
// 一般建议在 onComplete 的回调中释放
const file = UploadFile.formString(context, 'content')

// 注意：当前版本暂不支持直传

// 创建分片上传任务
const multipartUploadTask = createMultipartUploadTask(context, file, config);
```

4. 设置任务回调函数

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

### UploadFile 类

`UploadFile` 类是一个用于上传文件的实用工具类。

#### 静态方法

##### UploadFile.fromPath(filePath: string, meta?: FileMeta)

从文件路径创建一个 `UploadFile` 实例。

- `filePath` (string): 文件路径。
- `meta` (可选, FileMeta): 文件元数据。

##### UploadFile.fromString(data: string, meta?: FileMeta)

从字符串创建一个 `UploadFile` 实例。

- `data` (string): 文件数据字符串。
- `meta` (可选, FileMeta): 文件元数据。

##### UploadFile.fromArrayBuffer(data: ArrayBuffer, meta?: FileMeta)

从 ArrayBuffer 创建一个 `UploadFile` 实例。

- `data` (ArrayBuffer): 文件数据 ArrayBuffer。
- `meta` (可选, FileMeta): 文件元数据。

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

- 上传队列的上下文接口，用于存储任务相关的信息。
- `host`：上传使用的 host。
- `token`：上传使用的 token。
- `result`：上传成功的信息。
- `error`：队列的错误。
- `progress`：整体的任务进度信息。
- `setup()`：初始化函数，队列开始时执行。

### UploadConfig

```typescript
interface UploadConfig {
  tokenProvider: TokenProvider;
  serverUrl?: string;
  logLevel?: LogLevel;
  protocol?: HttpProtocol;
}
```

- 上传配置接口，用于配置上传任务的相关参数。
- `serverUrl`：服务器 URL，默认为 api.qiniu.com，专有云根据情况填写。
- `logLevel`：日志级别。
- `protocol`：HTTP 协议，默认 HTTPS。
- `tokenProvider`：用于获取上传所需 token 的函数。

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
