# Qiniu-JavaScript-SDK

[![Build Status](https://travis-ci.org/qiniu/x.svg?branch=master)](https://travis-ci.org/qiniu/js-sdk)
[![GitHub release](https://img.shields.io/github/v/tag/qiniu/js-sdk.svg?label=release)](https://github.com/qiniu/js-sdk/releases)
[![Coverage Status](https://codecov.io/gh/qiniu/js-sdk/branch/master/graph/badge.svg)](https://codecov.io/gh/qiniu/js-sdk)

基于七牛 API 开发的前端 JavaScript SDK

## 当前版本为 3.x，旧版本文档：[2.x](https://github.com/qiniu/js-sdk/tree/2.x)、[1.x](https://github.com/qiniu/js-sdk/tree/1.x)

### 2.x 升级到 3.x 的注意事项请参考 [文档](https://github.com/qiniu/js-sdk/wiki/2.x-%E5%8D%87%E7%BA%A7%E5%88%B0-3.x-%E6%96%87%E6%A1%A3%E6%B3%A8%E6%84%8F%E4%BA%8B%E9%A1%B9)

## 快速导航

* [功能简介](#summary)
* [准备](#ready)
* [引入](#install)
* [使用](#usage)
* [运行示例](#demo)
* [说明](#note)
* [常见问题](#faq)

## 概述

Qiniu-JavaScript-SDK （下文简称为 JS-SDK）适用于 ：IE11、Edge、Chrome、Firefox、Safari 等浏览器，基于七牛云存储官方 API 构建，其中上传功能基于 H5 File API。开发者基于 JS-SDK 可以方便的从浏览器端上传文件至七牛云存储，并对上传成功后的图片进行丰富的数据处理操作。
JS-SDK 兼容支持 H5 File API 的浏览器，在低版本浏览器下，需要额外的插件如 plupload，JS-SDK 提供了一些接口可以结合插件来进行上传工作，注意：(在低版本浏览器需要引入 [babel-polyfill](https://babeljs.cn/docs/usage/polyfill/) 来解决 SDK 里某些语法或者属性浏览器不能识别的问题)。

Qiniu-JavaScript-SDK 为客户端 SDK，没有包含 `token` 生成实现，为了安全，`token` 建议通过网络从服务端获取，具体生成代码可以参考以下服务端 SDK 的文档。

* [Android](https://developer.qiniu.com/kodo/sdk/android)
* [Java](https://developer.qiniu.com/kodo/sdk/java)
* [PHP](https://developer.qiniu.com/kodo/sdk/php)
* [Python](https://developer.qiniu.com/kodo/sdk/python)
* [Ruby](https://developer.qiniu.com/kodo/sdk/ruby)
* [Go](https://developer.qiniu.com/kodo/sdk/go)
* [Node.js](https://developer.qiniu.com/kodo/sdk/nodejs)
* [C#](https://developer.qiniu.com/kodo/sdk/csharp)
* [C/C++](https://developer.qiniu.com/kodo/sdk/cpp)
* [Objective-C](https://developer.qiniu.com/kodo/sdk/objc)

Qiniu-JavaScript-SDK 的示例 [Demo](http://jssdk-v2.demo.qiniu.io) 中的服务器端部分是基于 [Node.js 服务器端 SDK](https://developer.qiniu.com/kodo/sdk/nodejs) 开发的。

* [JavaScript SDK 在线示例 V3](https://js-sdk-demo.qiniu.io)
* [JavaScript SDK 在线示例 V2](http://jssdk-v2.demo.qiniu.io)

<!--
本 SDK 可使开发者忽略上传底层实现细节，而更多的关注 UI 层的展现。
 -->
<a id="summary"></a>

## 功能简介

* 上传
  * 大于 4M 时可分块上传，小于 4M 时直传
  * 分块上传时，支持断点续传
* 数据处理（图片）
  * imageView2（缩略图）
  * imageMogr2（高级处理，包含缩放、裁剪、旋转等）
  * imageInfo （获取基本信息）
  * exif （获取图片 EXIF 信息）
  * watermark （文字、图片水印）
  * pipeline （管道，可对 imageView2、imageMogr2、watermark 进行链式处理）

<a id="ready"></a>

## 准备

* 在使用 JS-SDK 之前，您必须先注册一个七牛帐号，并登录控制台获取一对有效的 `AccessKey` 和 `SecretKey`，您可以阅读 [快速入门](https://developer.qiniu.com/kodo/manual/console-quickstart) 和 [安全机制](https://developer.qiniu.com/kodo/manual/security#security) 以进一步了解如何正确使用和管理密钥 。

* JS-SDK 依赖服务端颁发 `token`，可以通过以下二种方式实现：

  * 利用 [七牛服务端 SDK](https://developer.qiniu.com/sdk#sdk) 构建后端服务
  * 利用七牛底层 API 构建服务，详见七牛 [上传策略](https://developer.qiniu.com/kodo/manual/put-policy) 和 [上传凭证](https://developer.qiniu.com/kodo/manual/upload-token)

  前端通过接口请求以获得 `token` 信息

<a id="install"></a>

## 引入

支持以下几种安装方式

* 直接使用静态文件地址：

  ```
  https://cdnjs.cloudflare.com/ajax/libs/qiniu-js/<version>/qiniu.min.js
  
  // 当上方资源链接访问不稳定时，可选使用下方资源链接
  https://cdn.staticfile.org/qiniu-js/<version>/qiniu.min.js
  ```

  通过 script 标签引入该文件，会在全局生成名为 `qiniu` 的对象


* 使用 NPM 安装

  NPM 的全称是 Node Package Manager，是一个 [NodeJS](https://nodejs.org) 包管理和分发工具，已经成为了非官方的发布 Node 模块（包）的标准。如果需要更详细的关于 NPM 的使用说明，您可以访问 [NPM 官方网站](https://www.npmjs.com)，或对应的 [中文网站](http://www.npmjs.com.cn/)

  ```shell
  npm install qiniu-js
  ```

  ```Javascript
  const qiniu = require('qiniu-js')
  // or
  import * as qiniu from 'qiniu-js'
  ```

* 通过源码编译

`git clone git@github.com:qiniu/js-sdk.git`，进入项目根目录执行 `npm install` ，执行 `npm run build`，即可在dist 目录生成 `qiniu.min.js`。

<a id="usage"></a>

## 使用

`qiniu.upload` 返回一个 `observable` 对象用来控制上传行为，`observable` 对像通过 `subscribe` 方法可以被 `observer` 所订阅，订阅同时会开始触发上传，同时返回一个 `subscription` 对象，该对象有一个 `unsubscribe` 方法取消订阅，同时终止上传行为。对于不支持 SDK 的浏览器可以参考 demo1 中用插件处理和 form 直传的方式； 一般 form 提交常常会导致网页跳转，demo1 中 form 直传通过加入 iframe，并结合后端 SDK 上传来解决网页跳转问题，实现 form 无刷新上传。分片上传时，JS-SDK支持断点续传功能，会把已上传片的后端返回值ctx信息存储到本地，有效期为一天，超过一天后，当继续上传该文件时会清除掉本地存储信息重新上传。

### Example

文件上传：

```JavaScript

const observable = qiniu.upload(file, key, token, putExtra, config)

const subscription = observable.subscribe(observer) // 上传开始
// or
const subscription = observable.subscribe(next, error, complete) // 这样传参形式也可以

subscription.unsubscribe() // 上传取消
```

图片上传前压缩：

```JavaScript
const options = {
  quality: 0.92,
  noCompressIfLarger: true
  // maxWidth: 1000,
  // maxHeight: 618
}
qiniu.compressImage(file, options).then(data => {
  const observable = qiniu.upload(data.dist, key, token, putExtra, config)
  const subscription = observable.subscribe(observer) // 上传开始
})
```

## API Reference Interface

### qiniu.upload(file: File, key: string, token: string, putExtra?: object, config?: object): observable

* **observable**: 为一个带有 subscribe 方法的类实例

  * observable.subscribe(observer: object): subscription

    * observer: `observer` 为一个 `object`，用来设置上传过程的监听函数，有三个属性 `next`、`error`、`complete`:

        ```JavaScript
        const observer = {
          next(res){
            // ...
          },
          error(err){
            // ...
          },
          complete(res){
            // ...
          }
        }
        ```

      * next: 接收上传进度信息的回调函数，回调函数参数值为 `object`，包含字段信息如下：
        * uploadInfo: `object`，只有分片上传时才返回该字段
          * uploadInfo.id: 上传任务的唯一标识。
          * uploadInfo.url: 上传地址。
        * chunks: `Array<ProgressCompose>` 每个 `chunk` 的上传信息，只有分片上传有此字段
          * ProgressCompose 的信息如下
            * size: `number` chunk 的尺寸
            * loaded: `number` 已经发送完毕的尺寸
            * percent: `number` 进度比例，范围在 0 - 100
            * fromCache?: `boolean` 是否是来自缓存
        * total: 包含 `loaded`、`total`、`percent` 三个属性:
          * total.loaded: `number`，已上传大小，单位为字节。
          * total.total: `number`，本次上传的总量控制信息，单位为字节，注意这里的 total 跟文件大小并不一致。
          * total.percent: `number`，当前上传进度，范围：0～100。

      * error: 上传错误后触发；自动重试本身并不会触发该错误，而当重试次数到达上限后则可以触发。当不是 xhr 请求错误时，会把当前错误产生原因直接抛出，诸如 JSON 解析异常等；当产生 xhr 请求错误时，参数 err 的类型为 `QiniuError`, 对于请求错误，err 的类型为 `QiniuRequestError`(继承自`QiniuError`)，如果是由于非服务端原因发生错误时（例如断网、跨域等等），错误的类型为 `QiniuNetworkError`(继承自`QiniuRequestError`)。
        * `QiniuError`
          * name: `QiniuErrorName` 错误的类型。
          * message: `string` 错误的信息。
          * stack: `string` 调用堆栈信息。
        * `QiniuRequestError` 继承自 `QiniuError`
          * data: `any` 服务端返回的错误信息，如果不是标准的 `json` 格式，则该字段为 `undefined`。
          * reqId: `string` xhr 请求错误的 `X-Reqid`。
          * code: `number` 请求错误状态码，可查阅码值对应 [说明](https://developer.qiniu.com/kodo/api/3928/error-responses)。
          * isRequestError: 固定为 `true`，*不推荐使用，即将废弃*。
        * `QiniuNetworkError` 继承自 `QiniuRequestError`
          * reqId: 由于请求可能还未真正发出，所以可能无法收集到 `reqId`，该字段可能为 `''`。

      * complete: 接收上传完成后的后端返回信息，具体返回结构取决于后端 SDK 的配置，可参考 [上传策略](https://developer.qiniu.com/kodo/manual/1206/put-policy)。

    * subscription: 为一个带有 `unsubscribe` 方法的类实例，通过调用 `subscription.unsubscribe()` 停止当前文件上传。

* **bucket**: 上传的目标空间
* **file**: `File` 对象，上传的文件
* **key**: 文件资源名，为空字符串时则文件资源名也为空，为 `null` 或者 `undefined` 时则自动使用文件的 `hash` 作为文件名
* **token**: 上传验证信息，前端通过接口请求后端获得
* **config**: `object`，其中的每一项都为可选

    ```JavaScript
    const config = {
      useCdnDomain: true,
      region: qiniu.region.z2
    };
    ```

  * config.useCdnDomain: 表示是否使用 cdn 加速域名，为布尔值，`true` 表示使用，默认为 `false`。
  * config.disableStatisticsReport: 是否禁用日志报告，为布尔值，默认为 `false`。
  * config.uphost: 上传 `host`，类型为 `string[] | string`，如果指定一个非空数组或者非空字符串，则仅使用该数据作为上传 `host`，默认为 `[]`，传入多个 `host` 时，内部会在重试过程中根据情况自动切换不同的 `host`。
  * config.upprotocol: 自定义上传域名协议，值为 `https` 或者 `http`，默认为 `https`。
  * config.region: 选择上传域名区域；当为 `null` 或 `undefined` 时，自动分析上传域名区域，当指定了 `uphost` 时，此设置项无效。
  * config.retryCount: 上传自动重试次数（整体重试次数，而不是某个分片的重试次数）；默认 3 次（即上传失败后最多重试两次）。
  * config.concurrentRequestLimit: 分片上传的并发请求量，`number`，默认为3；因为浏览器本身也会限制最大并发量，所以最大并发量与浏览器有关。
  * config.checkByServer: 是否开启服务端文件签名校验，为布尔值；开启后在文件上传时会计算本地的文件签名，服务端会根据本地的签名与接收到的数据的签名进行比对，如果不相同、则说明文件可能存在问题，此时会返回错误（`code`: 406），默认为 `false`，不开启。
  * config.checkByMD5: 是否开启 `MD5` 校验，为布尔值；在断点续传时，开启 `MD5` 校验会将已上传的分片与当前分片进行 `MD5` 值比对，若不一致，则重传该分片，避免使用错误的分片。读取分片内容并计算 `MD5` 需要花费一定的时间，因此会稍微增加断点续传时的耗时，默认为 `false`，不开启。
  * config.forceDirect: 是否上传全部采用直传方式，为布尔值；为 `true` 时则上传方式全部为直传 form 方式，禁用断点续传，默认 `false`。
  * config.chunkSize: `number`，分片上传时每片的大小，必须为正整数，单位为 `MB`，且最大不能超过 1024，默认值 4。因为 chunk 数最大 10000，所以如果文件以你所设的 `chunkSize` 进行分片并且 chunk 数超过 10000，我们会把你所设的 `chunkSize` 扩大二倍，如果仍不符合则继续扩大，直到符合条件。
  * config.debugLogLevel: `INFO` | `WARN` | `ERROR` | `OFF`，允许程序在控制台输出日志，默认为 `OFF`，不输出任何日志，本功能仅仅用于本地调试，不建议在线上环境开启。

* **putExtra**: `object`，其中的每一项都为可选

    ```JavaScript
    const putExtra = {
      fname: "qiniu.txt",
      mimeType: "text/plain",
      customVars: { 'x:test': 'qiniu', ... },
      metadata: { 'x-qn-meta': 'qiniu', ... },
    };
    ```

  * fname: `string`，文件原始文件名，若未指定，则魔法变量中无法使用 fname、ext、suffix
  * customVars: `object`，用来放置自定义变量，变量名必须以 `x:` 开始，自定义变量格式及说明请参考 [文档](https://developer.qiniu.com/kodo/manual/1235/vars)
  * metadata: `object`，用来防止自定义 meta，变量名必须以 `x-qn-meta-`开始，自定义资源信息格式及说明请参考
    [文档](https://developer.qiniu.com/kodo/api/1252/chgm)
  * mimeType: `string`，指定所传的文件类型

### qiniu.region: object

* **qiniu.region.z0**: 代表华东区域
* **qiniu.region.z1**: 代表华北区域
* **qiniu.region.z2**: 代表华南区域
* **qiniu.region.na0**: 代表北美区域
* **qiniu.region.as0**: 代表新加坡区域

### qiniu.getUploadUrl(config: object, token: string): Promise

  接收参数为 `config` 对象，返回根据 `config` 里所配置信息的上传域名

  ```JavaScript
  qiniu.getUploadUrl(config, token).then(res => {}) // res 即为上传的 url
  ```

### qiniu.getHeadersForChunkUpload(token: string): object

  返回 `object`，包含用来获得分片上传设置的头信息，参数为 `token` 字符串；当分片上传时，请求需要带该函数返回的头信息

* **token**: 后端返回的上传验证信息

  ```JavaScript
  const headers = qiniu.getHeadersForChunkUpload(token)
  ```

### qiniu.deleteUploadedChunks(token: string, key: stting, uploadInfo: object): Promise<void>

  删除指定上传任务中已上传完成的片，`key` 为目标文件名，`uploadInfo` 可通过 `next` 的返回获取，`token` 由服务端生成

### qiniu.compressImage(file: File, options: object): Promise<CompressResult> (上传前图片压缩)

  **在 v3.3.3 版本之前，该压缩行为会根据图片的 `Orientation(设备角度)` 信息对图片进行旋转处理，详细的信息可以参考**
  [issue：关于 canvas 绘制图像的方向兼容处理](https://github.com/qiniu/js-sdk/issues/522 )

  ```JavaScript
  const imgLink = qiniu.compressImage(file, options).then(res => {
    // res : {
    //   dist: 压缩后输出的 Blob 对象或原始的 File 对象，具体看下面的 options 配置
    //   width: 压缩后的图片宽度
    //   height: 压缩后的图片高度
    // }
    }
  })
  ```

* file: 要压缩的源图片，为 `File` 对象，支持 `image/png`、`image/jpeg`、`image/bmp`、`image/webp` 这几种图片类型
* options: `object`
  * options.quality: `number`，图片压缩质量，在图片格式为 `image/jpeg` 或 `image/webp` 的情况下生效，其他格式不会生效，可以从 0 到 1 的区间内选择图片的质量。默认值 0.92
  * options.maxWidh: `number`，压缩图片的最大宽度值
  * options.maxHeight: `number`，压缩图片的最大高度值
    （注意：当 `maxWidth` 和 `maxHeight` 都不设置时，则采用原图尺寸大小）
  * options.noCompressIfLarger: `boolean`，为 `true` 时如果发现压缩后图片大小比原来还大，则返回源图片（即输出的 dist 直接返回了输入的 file）；默认 `false`，即保证图片尺寸符合要求，但不保证压缩后的图片体积一定变小
* CompressResult: `object`，包含如下字段：
  * dist: 压缩后输出的 Blob 对象或原始的 File 对象
  * width: 压缩后的图片宽度
  * height: 压缩后的图片高度

### qiniu.watermark(options: object, key?: string, domain?: string): string（水印）

  返回添加水印后的图片地址

* **key** : 文件资源名
* **domain**: 为七牛空间（bucket)对应的域名，选择某个空间后，可通过"空间设置->基本设置->域名设置"查看获取，前端可以通过接口请求后端得到

  ```JavaScript

  const imgLink = qiniu.watermark({
       mode: 1, // 图片水印
       image: 'http://www.b1.qiniudn.com/images/logo-2.png', // 图片水印的Url，mode = 1 时 **必需**
       dissolve: 50, // 透明度，取值范围1-100，非必需，下同
       gravity: 'SouthWest', // 水印位置，为以下参数 [NorthWest、North、NorthEast、West、Center、East、SouthWest、South、SouthEast] 之一
       dx: 100,  // 横轴边距，单位:像素(px)
       dy: 100 // 纵轴边距，单位:像素(px)
   }, key, domain)

  // imgLink 可以赋值给 html 的 img 元素的 src 属性，下同

  // 若未指定key，可以通过以下方式获得完整的 imgLink，下同
  // imgLink  =  '<domain>/<key>?' +  imgLink
  // <domain> 为七牛空间（bucket)对应的域名，选择某个空间后，可通过"空间设置->基本设置->域名设置"查看获取

  // 或者

  const imgLink = qiniu.watermark({
       mode: 2,  // 文字水印
       text: 'hello world !', // 水印文字，mode = 2 时 **必需**
       dissolve: 50,          // 透明度，取值范围1-100，非必需，下同
       gravity: 'SouthWest',  // 水印位置，同上
       fontsize: 500,         // 字体大小，单位: 缇
       font: '黑体',           // 水印文字字体
       dx: 100,               // 横轴边距，单位:像素(px)
       dy: 100,               // 纵轴边距，单位:像素(px)
       fill: '#FFF000'        // 水印文字颜色，RGB格式，可以是颜色名称
   }, key, domain)
  ```

  options包含的具体水印参数解释见 [水印（watermark）](https://developer.qiniu.com/dora/api/image-watermarking-processing-watermark)

### qiniu.imageView2(options: object, key?: string, domain?: string): string (缩略)

  返回处理后的图片url

  ```JavaScript
  const imgLink = qiniu.imageView2({
     mode: 3,       // 缩略模式，共 6 种 [0-5]
     w: 100,        // 具体含义由缩略模式决定
     h: 100,        // 具体含义由缩略模式决定
     q: 100,        // 新图的图像质量，取值范围：1-100
     format: 'png'  // 新图的输出格式，取值范围：jpg，gif，png，webp 等
   }, key, domain)
  ```

  options包含的具体缩略参数解释见 [图片基本处理（imageView2）](https://developer.qiniu.com/dora/api/basic-processing-images-imageview2)

### qiniu.imageMogr2(options: object, key?: string, domain?: string): string (图像高级处理)

  返回处理后的图片url

  ```JavaScript
  const imgLink = qiniu.imageMogr2({
     "auto-orient": true,      // 布尔值，是否根据原图EXIF信息自动旋正，便于后续处理，建议放在首位。
     strip: true,              // 布尔值，是否去除图片中的元信息
     thumbnail: '1000x1000'    // 缩放操作参数
     crop: '!300x400a10a10',   // 裁剪操作参数
     gravity: 'NorthWest',     // 裁剪锚点参数
     quality: 40,              // 图片质量，取值范围1-100
     rotate: 20,               // 旋转角度，取值范围1-360，缺省为不旋转。
     format: 'png',            // 新图的输出格式，取值范围：jpg，gif，png，webp等
     blur: '3x5'               // 高斯模糊参数
   }, key, domain)
  ```

  options包含的具体高级图像处理参数解释见 [图像高级处理（imageMogr2）](https://developer.qiniu.com/dora/api/the-advanced-treatment-of-images-imagemogr2)

### qiniu.imageInfo(key: string, domain: string): Promise

  ```JavaScript
  qiniu.imageInfo(key, domain).then(res => {})
  ```

  具体 imageInfo 解释见 [图片基本信息（imageInfo）](https://developer.qiniu.com/dora/api/pictures-basic-information-imageinfo)

### qiniu.exif(key: string, domain: string): Promise

  ```JavaScript
  qiniu.exif(key, domain).then(res => {})
  ```

  具体 exif 解释见 [图片 EXIF 信息（exif）](https://developer.qiniu.com/dora/api/photo-exif-information-exif)

### qiniu.pipeline(fopArr: array, key?: string, domain?: string): string

  ```JavaScript
  const fopArr = [{
      fop: 'watermark', // 指定watermark操作
      mode: 2,          // 此参数同watermark函数的参数，下同。
      text: 'hello world !',
      dissolve: 50,
      gravity: 'SouthWest',
      fontsize: 500,
      font : '黑体',
      dx: 100,
      dy: 100,
      fill: '#FFF000'
  },{
      fop: 'imageView2', // 指定imageView2操作
      mode: 3,           // 此参数同imageView2函数的参数，下同
      w: 100,
      h: 100,
      q: 100,
      format: 'png'
  },{
      fop: 'imageMogr2',  // 指定imageMogr2操作
      "auto-orient": true,  // 此参数同imageMogr2函数的参数，下同。
      strip: true,
      thumbnail: '1000x1000'
      crop: '!300x400a10a10',
      gravity: 'NorthWest',
      quality: 40,
      rotate: 20,
      format: 'png',
      blur:'3x5'
  }]

  // fopArr 可以为三种类型'watermark'、'imageMogr2'、'imageView2'中的任意1-3个
  // 例如只对'watermark'、'imageMogr2'进行管道操作，则如下即可
  // const fopArr = [{
  //    fop: 'watermark', // 指定watermark操作
  //    mode: 2, // 此参数同watermark函数的参数，下同。
  //    text: 'hello world !',
  //    dissolve: 50,
  //     gravity: 'SouthWest',
  //     fontsize: 500,
  //     font : '黑体',
  //     dx: 100,
  //     dy: 100,
  //     fill: '#FFF000'
  // },{
  //    fop: 'imageMogr2',  // 指定imageMogr2操作
  //    "auto-orient": true,  // 此参数同imageMogr2函数的参数，下同。
  //    strip: true,
  //    thumbnail: '1000x1000'
  //    crop: '!300x400a10a10',
  //    gravity: 'NorthWest',
  //    quality: 40,
  //    rotate: 20,
  //    format: 'png',
  //    blur:'3x5'
  // }];

  const imgLink = qiniu.pipeline(fopArr, key, domain))
  ```

  fopArr包含的具体管道操作解释见 [管道操作](https://developer.qiniu.com/dora/manual/processing-mechanism)

<a id="demo"></a>

### 运行示例

1. 进入 test 目录，按照目录下的 `config.json.example` 示例，创建 `config.json` 文件，其中，`Access Key` 和 `Secret Key` 按如下方式获取

   * [开通七牛开发者帐号](https://portal.qiniu.com/signup)
   * [登录七牛开发者自助平台，查看 AccessKey 和 SecretKey](https://portal.qiniu.com/user/key) 。

   ```javascript
   {
     "AccessKey": "<Your Access Key>",
     "SecretKey": "<Your Secret Key>",
     "Bucket": "<Your Bucket Name>",
     "Port": 9000,
     "UptokenUrl": "<Your Uptoken_Url>", // demo 启动后会在本地 /uptoken 上提供获取 uptoken 的接口，所以这里可以填 'token'
     "Domain": "<Your Bucket Domain>" // Bucket 的外链默认域名，在 Bucket 的内容管理里查看，如：'http://xxx.bkt.clouddn.com/'
   }
   ```

2. 进入项目根目录，执行 `npm install` 安装依赖库，然后打开两个终端，一个执行 `npm run serve` 跑 server， 一个执行 `npm run dev` 运行服务；demo1：`http://0.0.0.0:8080/test/demo1`；demo3：`http://0.0.0.0:8080/test/demo3`；demo1为测试上传功能的示例，demo3为测试图片压缩功能的示例；demo2 为测试 es6 语法的示例，进入 demo2 目录，执行 `npm install`，然后 `npm start` 运行 demo2；demo1、demo2 和 demo3 都共用一个 server，请注意 server 文件里的 `region` 设置跟 `config` 里的`region` 设置要保持一致。

<a id="note"></a>

### 说明

1. 如果您想了解更多七牛的上传策略，建议您仔细阅读 [七牛官方文档-上传](https://developer.qiniu.com/kodo/manual/upload-types)。另外，七牛的上传策略是在后端服务指定的.

2. 如果您想了解更多七牛的图片处理，建议您仔细阅读 [七牛官方文档-图片处理](https://developer.qiniu.com/dora/api/image-processing-api)

3. JS-SDK 示例生成 `token` 时，指定的 `Bucket Name` 为公开空间，所以可以公开访问上传成功后的资源。若您生成 `token` 时，指定的 `Bucket Name` 为私有空间，那您还需要在服务端进行额外的处理才能访问您上传的资源。具体参见 [下载凭证](https://developer.qiniu.com/kodo/manual/download-token)。JS-SDK 数据处理部分功能不适用于私有空间。

<a id="faq"></a>

### 常见问题

**1. 关于上传文件命名问题，可以参考：**

1. 上传的 scope 为 `bucket` 的形式，上传后文件资源名以设置的 `key` 为主，如果 `key` 为 `null` 或者 `undefined`，则文件资源名会以 hash 值作为资源名。
2. 上传的 scope 为 `bucket:key` 的形式，上传文件本地的名字需要和 scope 中的 `key` 是一致的，不然会报错 key doesn‘t match with scope。
3. 上传的 scope 为 `bucket`，但是 `token` 中有设定 `saveKey`，这种形式下客户端的 `key` 如果设定为 `null` 或者 `undefined`，则会以 `saveKey` 作为文件资源名，否则仍然是以 `key` 值作为资源名，并且上传的本地文件名也是需要和这个 `savekey` 文件名一致的。

**2. 限制上传文件的类型：**

通过在生成 `token` 时指定 [上传策略](https://developer.qiniu.com/kodo/1206/put-policy) 中的 `mimeLimit` 字段限定上传文件的类型，该功能由生成 `token` 的服务端 SDK 提供，请查看对应的服务端 SDK 文档。

### 贡献代码

1. 登录 <https://github.com>

2. Fork git@github.com:qiniu/js-sdk.git

3. 创建您的特性分支 (git checkout -b new-feature)

4. 提交您的改动 (git commit -am 'Added some features or fixed a bug')

5. 将您的改动记录提交到远程 git 仓库 (git push origin new-feature)

6. 然后到 github 网站的该 git 远程仓库的 new-feature 分支下发起 Pull Request

<a id="license"></a>

### 许可证

> Copyright (c) 2018 qiniu.com

### 基于 MIT 协议发布
