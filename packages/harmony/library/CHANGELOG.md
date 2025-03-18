# Change logs

## v1.0.2 (2024-07-26)

### 改动

- 优化进度处理，避免进度回退
- 其他实现细节优化

## v1.0.1 (2024-07-09)

### 改动

- 修复 onProgress 在任务完成之后依旧触发的问题
- UploadFile 添加 key 属性用于指定上传存储目标 key

## v1.0.0 (2024-05-08)

### 改动

- rc 版本升级为 1.0.0

## v1.0.0-rc.5 (2024-03-14)

### 改动

- 添加 createMultipartUploadV1Task
- 重命名 createMultipartUploadTask 为 createMultipartUploadV2Task

## v1.0.0-rc.4 (2024-03-13)

### 改动

- 支持 datashare schema 的 uri
- 添加支持指定 uploadHosts 功能
- 重命名 serverUrl 为 apiServerUrl
- 其他细节错误优化

## v1.0.0-rc.3 (2024-01-12)

### 改动

- 添加直传的非完整能力支持
- 添加系统接口的调用前检查

## v1.0.0-rc.2 (2024-01-09)

### 改动

- 支持自定义变量与 metadata 支持

## v1.0.0-rc.1 (2024-01-09)

### 改动

- 第一个预览版本，仅支持分片上传
