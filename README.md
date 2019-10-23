# Qiniu-JavaScript-SDK

基于七牛 API 开发的前端 JavaScript SDK

## 当前版本为 2.x，查看 1.x 的文档请点击[这里](https://github.com/qiniu/js-sdk/tree/1.x)

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
JS-SDK 兼容支持 H5 File API 的浏览器，在低版本浏览器下，需要额外的插件如 plupload，JS-SDK 提供了一些接口可以结合插件来进行上传工作，注意：(在低版本浏览器需要引入 [babel-polyfill](https://babeljs.cn/docs/usage/polyfill/) 来解决 sdk 里某些语法或者属性浏览器不能识别的问题)。

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

Qiniu-JavaScript-SDK 的示例 [Demo](http://jssdk-v2.demo.qiniu.io) 中的服务器端部分是基于[ Node.js 服务器端 SDK ](https://developer.qiniu.com/kodo/sdk/nodejs) 开发的。

- [JavaScript SDK 在线示例](http://jssdk-v2.demo.qiniu.io/)
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

* 在使用 JS-SDK 之前，您必须先注册一个七牛帐号，并登录控制台获取一对有效的 `AccessKey` 和 `SecretKey`，您可以阅读[ 快速入门 ](https://developer.qiniu.com/kodo/manual/console-quickstart)和[ 安全机制 ](https://developer.qiniu.com/kodo/manual/security#security) 以进一步了解如何正确使用和管理密钥 。

* JS-SDK 依赖服务端颁发 `token`，可以通过以下二种方式实现：

  * 利用[七牛服务端 SDK ](https://developer.qiniu.com/sdk#sdk)构建后端服务
  * 利用七牛底层 API 构建服务，详见七牛[上传策略](https://developer.qiniu.com/kodo/manual/put-policy)和[上传凭证](https://developer.qiniu.com/kodo/manual/upload-token)

  前端通过接口请求以获得 `token` 信息

<a id="install"></a>

## 引入

支持以下几种安装方式

* 直接使用静态文件地址：

  ```
  https://unpkg.com/qiniu-js@<version>/dist/qiniu.min.js
  ```
  通过sctipt标签引入该文件，会在全局生成名为 `qiniu` 的对象

* 使用 NPM 安装

  NPM 的全称是 Node Package Manager，是一个[ NodeJS ](https://nodejs.org)包管理和分发工具，已经成为了非官方的发布 Node 模块（包）的标准。如果需要更详细的关于 NPM 的使用说明，您可以访问[ NPM 官方网站](https://www.npmjs.com)，或对应的[中文网站](http://www.npmjs.com.cn/)

  ```
  npm install qiniu-js
  ```
  ```Javascript
  var qiniu = require('qiniu-js')
  // or
  import * as qiniu from 'qiniu-js'
  ```

* 通过源码编译

`git clone git@github.com:qiniu/js-sdk.git`，进入项目根目录执行 `npm install` ，执行 `npm run build`，即可在dist 目录生成 `qiniu.min.js`。

<a id="usage"></a>

## 使用

`qiniu.upload` 返回一个 `observable` 对象用来控制上传行为，`observable` 对像通过 `subscribe` 方法可以被 `observer` 所订阅，订阅同时会开始触发上传，同时返回一个 `subscription` 对象，该对象有一个 `unsubscribe` 方法取消订阅，同时终止上传行为。对于不支持 sdk 的浏览器可以参考 demo1 中用插件处理和 form 直传的方式； 一般 form 提交常常会导致网页跳转，demo1 中 form 直传通过加入 iframe，并结合后端 sdk 上传来解决网页跳转问题，实现 form 无刷新上传。分片上传时，JS-SDK支持断点续传功能，会把已上传片的后端返回值ctx信息存储到本地，有效期为一天，超过一天后，当继续上传该文件时会清除掉本地存储信息重新上传。

### Example

文件上传：

```JavaScript

var observable = qiniu.upload(file, key, token, putExtra, config)

var subscription = observable.subscribe(observer) // 上传开始
// or
var subscription = observable.subscribe(next, error, complete) // 这样传参形式也可以

subscription.unsubscribe() // 上传取消
```
图片上传前压缩：

```JavaScript
let options = {
  quality: 0.92,
  noCompressIfLarger: true
  // maxWidth: 1000,
  // maxHeight: 618
}
qiniu.compressImage(file, options).then(data => {
  var observable = qiniu.upload(data.dist, key, token, putExtra, config)
  var subscription = observable.subscribe(observer) // 上传开始
})
```
## API Reference Interface

### qiniu.upload(file: blob, key: string, token: string, putExtra: object, config: object): observable

  * **observable**: 为一个带有 subscribe 方法的类实例

    * observable.subscribe(observer: object): subscription

      * observer: `observer` 为一个 `object`，用来设置上传过程的监听函数，有三个属性 `next`、`error`、`complete`:

        ```JavaScript
        var observer = {
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
        * next: 接收上传进度信息，res是一个带有 `total` 字段的 `object`，包含`loaded`、`total`、`percent`三个属性，提供上传进度信息。
          * total.loaded: `number`，已上传大小，单位为字节。
          * total.total: `number`，本次上传的总量控制信息，单位为字节，注意这里的 total 跟文件大小并不一致。
          * total.percent: `number`，当前上传进度，范围：0～100。

        * error: 上传错误后触发；自动重试本身并不会触发该错误，而当重试次数到达上限后则可以触发。当不是 xhr 请求错误时，会把当前错误产生原因直接抛出，诸如 JSON 解析异常等；当产生 xhr 请求错误时，参数 err 为一个包含 `code`、`message`、`isRequestError` 三个属性的 `object`：
          * err.isRequestError: 用于区分是否 xhr 请求错误；当 xhr 请求出现错误并且后端通过 HTTP 状态码返回了错误信息时，该参数为 `true`；否则为 `undefined` 。
          * err.reqId: `string`，xhr请求错误的 `X-Reqid`。
          * err.code: `number`，请求错误状态码，只有在 `err.isRequestError` 为 true 的时候才有效。可查阅码值对应[说明](https://developer.qiniu.com/kodo/api/3928/error-responses)。
          * err.message: `string`，错误信息，包含错误码，当后端返回提示信息时也会有相应的错误信息。

        * complete: 接收上传完成后的后端返回信息，具体返回结构取决于后端sdk的配置，可参考[上传策略](https://developer.qiniu.com/kodo/manual/1206/put-policy)。

      * subscription: 为一个带有 `unsubscribe` 方法的类实例，通过调用 `subscription.unsubscribe()` 停止当前文件上传。

  * **file**: `Blob` 对象，上传的文件
  * **key**: 文件资源名
  * **token**: 上传验证信息，前端通过接口请求后端获得
  * **config**: `object`

    ```JavaScript
    var config = {
      useCdnDomain: true,
      region: qiniu.region.z2
    };
    ```

    * config.useCdnDomain: 表示是否使用 cdn 加速域名，为布尔值，`true` 表示使用，默认为 `false`。
    * config.disableStatisticsReport: 是否禁用日志报告，为布尔值，默认为 `false`。
    * config.uphost: 上传 `host`，类型为 `string`， 如果设定该参数则优先使用该参数作为上传地址，默认为 `null`。
    * config.region: 选择上传域名区域；当为 `null` 或 `undefined` 时，自动分析上传域名区域。
    * config.retryCount: 上传自动重试次数（整体重试次数，而不是某个分片的重试次数）；默认 3 次（即上传失败后最多重试两次）。
    * config.concurrentRequestLimit: 分片上传的并发请求量，`number`，默认为3；因为浏览器本身也会限制最大并发量，所以最大并发量与浏览器有关。
    * config.checkByMD5: 是否开启 MD5 校验，为布尔值；在断点续传时，开启 MD5 校验会将已上传的分片与当前分片进行 MD5 值比对，若不一致，则重传该分片，避免使用错误的分片。读取分片内容并计算 MD5 需要花费一定的时间，因此会稍微增加断点续传时的耗时，默认为 false，不开启。
    * config.forceDirect: 是否上传全部采用直传方式，为布尔值；为 `true` 时则上传方式全部为直传 form 方式，禁用断点续传，默认 `false`。

  * **putExtra**:

    ```JavaScript
    var putExtra = {
      fname: "",
      params: {},
      mimeType: [] || null
    };
    ```

    * fname: `string`，文件原文件名
    * params: `object`，用来放置自定义变量，自定义变量格式请参考[文档](https://developer.qiniu.com/kodo/manual/1235/vars)
    * mimeType: `null || array`，用来限制上传文件类型，为 `null` 时表示不对文件类型限制；限制类型放到数组里：
    `["image/png", "image/jpeg", "image/gif"]`

### qiniu.createMkFileUrl(url: string, size: number, key: string, putExtra: object): string

  返回创建文件的 url；当分片上传时，我们需要把分片返回的 ctx 信息拼接后通过该 url 上传给七牛以创建文件。

  * **url**: 上传域名，可以通过qiniu.getUploadUrl()获得
  * **size**: 文件大小
  * **key**: 文件资源名
  * **putExtra**: 同上

  ```JavaScript
  var requestUrl = qiniu.createMkFileUrl(
    uploadUrl,
    file.size,
    key,
    putExtra
  );
  ```

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
  var headers = qiniu.getHeadersForChunkUpload(token)
  ```

### qiniu.getHeadersForMkFile(token: string): object

  返回 `object`，包含用来获得文件创建的头信息，参数为 `token` 字符串；当分片上传完需要把 ctx 信息传给七牛用来创建文件时，请求需要带该函数返回的头信息

  ```JavaScript
  var headers = qiniu.getHeadersForMkFile(token)
  ```

### qiniu.getResumeUploadedSize(file: blob): number
  断点续传时返回文件之前已上传的字节数，为 0 代表当前并无该文件的断点信息

### qiniu.filterParams(params: object): array

  返回[[k, v],...]格式的数组，k 为自定义变量 `key` 名，v 为自定义变量值，用来提取 `putExtra.params` 包含的自定义变量

  ```JavaScript
  var customVarList = qiniu.filterParams(putExtra.params)

  for (var i = 0; i < customVarList.length; i++) {
    var k = customVarList[i]
    multipart_params_obj[k[0]] = k[1]
  }
  ```
### qiniu.compressImage(file: blob, options: object) : Promise (上传前图片压缩)

  ```JavaScript
  var imgLink = qiniu.compressImage(file, options).then(res => {
    // res : {
    //   dist: 压缩后输出的 blob 对象，或原始的 file，具体看下面的 options 配置
    //   width: 压缩后的图片宽度
    //   height: 压缩后的图片高度
    // }
    }
  })
  ```
  * file: 要压缩的源图片，为 `blob` 对象，支持 `image/png`、`image/jpeg`、`image/bmp`、`image/webp` 这几种图片类型
  * options: `object`
    * options.quality: `number`，图片压缩质量，在图片格式为 `image/jpeg` 或 `image/webp` 的情况下生效，其他格式不会生效，可以从 0 到 1 的区间内选择图片的质量。默认值 0.92
    * options.maxWidh: `number`，压缩图片的最大宽度值
    * options.maxHeight: `number`，压缩图片的最大高度值
    （注意：当 `maxWidth` 和 `maxHeight` 都不设置时，则采用原图尺寸大小）
    * options.noCompressIfLarger: `boolean`，为 `true` 时如果发现压缩后图片大小比原来还大，则返回源图片（即输出的 dist 直接返回了输入的 file）；默认 `false`，即保证图片尺寸符合要求，但不保证压缩后的图片体积一定变小

### qiniu.watermark(options: object, key: string, domain: string): string（水印）

  返回添加水印后的图片地址
  * **key** : 文件资源名
  * **domain**: 为七牛空间（bucket)对应的域名，选择某个空间后，可通过"空间设置->基本设置->域名设置"查看获取，前端可以通过接口请求后端得到

  ```JavaScript

  var imgLink = qiniu.watermark({
       mode: 1, // 图片水印
       image: 'http://www.b1.qiniudn.com/images/logo-2.png', // 图片水印的Url，mode = 1 时 **必需**
       dissolve: 50, // 透明度，取值范围1-100，非必需，下同
       gravity: 'SouthWest', // 水印位置，为以下参数[NorthWest、North、NorthEast、West、Center、East、SouthWest、South、SouthEast]之一
       dx: 100,  // 横轴边距，单位:像素(px)
       dy: 100 // 纵轴边距，单位:像素(px)
   }, key, domain) // key 为非必需参数，下同

  // imgLink 可以赋值给 html 的 img 元素的 src 属性，下同

  // 若未指定key，可以通过以下方式获得完整的 imgLink，下同
  // imgLink  =  '<domain>/<key>?' +  imgLink
  // <domain> 为七牛空间（bucket)对应的域名，选择某个空间后，可通过"空间设置->基本设置->域名设置"查看获取

  // 或者

  var imgLink = qiniu.watermark({
       mode: 2,  // 文字水印
       text: 'hello world !', // 水印文字，mode = 2 时 **必需**
       dissolve: 50,          // 透明度，取值范围1-100，非必需，下同
       gravity: 'SouthWest',  // 水印位置，同上
       fontsize: 500,         // 字体大小，单位: 缇
       font: '黑体',           // 水印文字字体
       dx: 100,               // 横轴边距，单位:像素(px)
       dy: 100,               // 纵轴边距，单位:像素(px)
       fill: '#FFF000'        // 水印文字颜色，RGB格式，可以是颜色名称
   }, key,domain)
  ```

  options包含的具体水印参数解释见[水印（watermark）](https://developer.qiniu.com/dora/api/image-watermarking-processing-watermark)

### qiniu.imageView2(options: object, key: string, domain: string): string (缩略)

  返回处理后的图片url

  ```JavaScript
  var imgLink = qiniu.imageView2({
     mode: 3,       // 缩略模式，共6种[0-5]
     w: 100,        // 具体含义由缩略模式决定
     h: 100,        // 具体含义由缩略模式决定
     q: 100,        // 新图的图像质量，取值范围：1-100
     format: 'png'  // 新图的输出格式，取值范围：jpg，gif，png，webp等
   }, key, domain)
  ```

  options包含的具体缩略参数解释见[图片基本处理（imageView2）](https://developer.qiniu.com/dora/api/basic-processing-images-imageview2)

### qiniu.imageMogr2(options: object, key: string, domain: string): string (图像高级处理)

  返回处理后的图片url

  ```JavaScript
  var imgLink = qiniu.imageMogr2({
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

  options包含的具体高级图像处理参数解释见[图像高级处理（imageMogr2）](https://developer.qiniu.com/dora/api/the-advanced-treatment-of-images-imagemogr2)

### qiniu.imageInfo(key: string, domain: string): Promise

  ```JavaScript
  qiniu.imageInfo(key, domain).then(res => {})
  ```

  具体 imageInfo 解释见[图片基本信息（imageInfo）](https://developer.qiniu.com/dora/api/pictures-basic-information-imageinfo)

### qiniu.exif(key: string, domain: string): Promise

  ```JavaScript
  qiniu.exif(key, domain).then(res => {})
  ```

  具体 exif 解释见[图片 EXIF 信息（exif）](https://developer.qiniu.com/dora/api/photo-exif-information-exif)

### qiniu.pipeline(fopArr: array, key: string, domain: string): string

  ```JavaScript
  var fopArr = [{
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
  // var fopArr = [{
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

  var imgLink = qiniu.pipeline(fopArr, key, domain))
  ```

  fopArr包含的具体管道操作解释见[管道操作](https://developer.qiniu.com/dora/manual/processing-mechanism)

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
2. 进入项目根目录，执行 `npm install` 安装依赖库，然后打开两个终端，一个执行 `npm run serve` 跑 server， 一个执行 `npm run dev` 运行服务；demo1：`http://0.0.0.0:8080/test/demo1`；demo3：`http://0.0.0.0:8080/test/demo3`；demo1为测试上传功能的示例，demo3为测试图片压缩功能的示例；demo2 为测试 es6 语法的示例，进入 demo2 目录，执行 `npm install`，然后 `npm start` 运行 demo2；demo1、demo2 和 demo3 都共用一个 server，请注意 server 文件里的 `region` 设置跟 `config` 里的` region` 设置要保持一致。


<a id="note"></a>

### 说明

1. 如果您想了解更多七牛的上传策略，建议您仔细阅读 [七牛官方文档-上传](https://developer.qiniu.com/kodo/manual/upload-types)。另外，七牛的上传策略是在后端服务指定的.

2. 如果您想了解更多七牛的图片处理，建议您仔细阅读 [七牛官方文档-图片处理](https://developer.qiniu.com/dora/api/image-processing-api)

3. JS-SDK 示例生成 `token` 时，指定的 `Bucket Name` 为公开空间，所以可以公开访问上传成功后的资源。若您生成 `token` 时，指定的 `Bucket Name` 为私有空间，那您还需要在服务端进行额外的处理才能访问您上传的资源。具体参见[下载凭证](https://developer.qiniu.com/kodo/manual/download-token)。JS-SDK 数据处理部分功能不适用于私有空间。

<a id="faq"></a>

### 常见问题

**1. 关于上传文件命名问题，可以参考：**

1. 上传的 scope 为 `bucket` 的形式，上传后文件资源名以设置的 `key` 为主，如果 `key` 为 `null` 或者 `undefined`，则文件资源名会以 hash 值作为资源名。
2. 上传的 scope 为 `bucket:key` 的形式，上传文件本地的名字需要和 scope 中的 `key` 是一致的，不然会报错 key doesn‘t match with scope。
3. 上传的 scope 为 `bucket`，但是 `token` 中有设定 `saveKey`，这种形式下客户端的 `key` 如果设定为 `null` 或者 `undefined`，则会以 `saveKey` 作为文件资源名，否则仍然是以 `key` 值作为资源名，并且上传的本地文件名也是需要和这个 `savekey` 文件名一致的。

**2. 限制上传文件的类型：**

这里又分为两种方法：

1. 通过在 `token` 中设定 `mimeLimit` 字段限定上传文件的类型，该设定是在后端 sdk 设置，请查看相应的 sdk 文档，示例
 ```JavaScript
"image/\*": 表示只允许上传图片类型；
"image/jpeg;image/png": 表示只允许上传 jpg 和 png 类型的图片；
"!application/json;text/plain": 表示禁止上传 json 文本和纯文本。（注意最前面的感叹号）
```
2. 通过 `putExtra` 的 `mimeType` 参数直接在前端限定

### 贡献代码

1. 登录 https://github.com

2. Fork git@github.com:qiniu/js-sdk.git

3. 创建您的特性分支 (git checkout -b new-feature)

4. 提交您的改动 (git commit -am 'Added some features or fixed a bug')

5. 将您的改动记录提交到远程 git 仓库 (git push origin new-feature)

6. 然后到 github 网站的该 git 远程仓库的 new-feature 分支下发起 Pull Request

<a id="license"></a>

### 许可证

> Copyright (c) 2018 qiniu.com

### 基于 MIT 协议发布
