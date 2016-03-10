qiniu-js-sdk
============

基于七牛API及Plupload开发的前端JavaScript SDK

示例网站：[七牛JavaScript SDK 示例网站 - 配合七牛nodejs SDK ](http://jssdk.demo.qiniu.io/)
## 概述

本SDK适用于IE8+、Chrome、Firefox、Safari 等浏览器，基于 七牛云存储官方API 构建，其中上传功能基于 Plupload 插件封装。开发者使用本 SDK 可以方便的从浏览器端上传文件至七牛云存储，并对上传成功后的图片进行丰富的数据处理操作。本 SDK 可使开发者忽略上传底层实现细节，而更多的关注 UI 层的展现。

### 功能简介

* 上传
 * html5模式大于4M时可分块上传，小于4M时直传
 * Flash、html4模式直接上传
 * 继承了Plupload的功能，可筛选文件上传、拖曳上传等
* 下载(公开资源)
* 数据处理（图片）
 * imageView2（缩略图）
 * imageMogr2（高级处理，包含缩放、裁剪、旋转等）
 * imageInfo （获取基本信息）
 * exif      （获取图片EXIF信息）
 * watermark （文字、图片水印）
 * pipeline  （管道，可对imageView2、imageMogr2、watermark进行链式处理）

### SDK构成介绍
* Plupload ，建议 2.1.1 及以上版本
* qiniu.js，SDK主体文件，上传功能\数据处理实现

### 常见问题

七牛提供基于plupload插件封装上传的demo `http://jssdk.demo.qiniu.io/`，如果不需要plupload插件可以参考`https://github.com/iwillwen/qiniu.js/tree/develop`,这里主要针对基于plupload插件的方式讲解遇到的一些问题，通过参考plupload文档资料，可以对七牛的demo进行修改，以满足自己的业务需求，plupload插件的使用文档可以参考`http://www.cnblogs.com/2050/p/3913184.html`

**1.关于上传文件命名问题，可以参考：**
在main.js里面，unique_names是plupload插件下面的一个参数，当值为true时会为每个上传的文件生成一个唯一的文件名，这个是plupload插件自动生成的，如果设置成false，七牛这边是会以上传的原始名进行命名的。
1).上传的scope为bucket的形式，unique_names参数设置为false，上传后文件的key是本地的文件名abc.txt
2).上传的scope为bucket的形式，unique_names参数设置为true，plupload插件会忽略本地文件名，而且这个命名也是没有规律的，上传后文件的key是plupload插件生成的，比如Yc7DZRS1m73o.txt。
3).上传的scope为bucket:key的形式，上传文件本地的名字需要和scope中的key是一致的，不然会报错key doesn‘t match with scope, 注意，这种形式是不能设置unique_names为true的，因为即使上传文件本地名字为abc.txt,但是plupload会给这个文件赋值另外一个文件名。
4).上传的scope为bucket，但是token中有设定saveKey，这种形式save_key是应该设置为true，并且上传的本地文件名也是需要和这个savekey文件名一致的。
5).通过JS前端设置上传的key，在main.js文件里面设置如下：
```
 'Key': function(up, file) {
             var key = "";
            // do something with key
            return key
            }
```
这个默认是注销的，若想在前端对每个文件的key进行个性化处理，可以配置该函数
该配置必须要在 unique_names: false , save_key: false 时才生效
取消注销后，其优先级要高于：qiniu.js文件中getFileKey。

**2.设置自定义预览样式**
```
该设置在ui.js 文件里，默认为
var imageView =‘?imageView2/1/w/100/h/100’
可修改成 
var imageView = ‘样式符+样式名’
```

**3.关于设置取消上传可以参考：**
http://stackoverflow.com/questions/11014384/cancel-file-upload-listener
(文件plupload.dev.js  1950行  removeFile : function(file) 方法)

**4.限制上传文件的类型：**
 这里又分为两种方法：
 1).通过在token中设定mimeLimit字段限定上传文件的类型，示例
“image/*“表示只允许上传图片类型；
“image/jpeg;image/png”表示只允许上传jpg和png类型的图片；
“!application/json;text/plain”表示禁止上传json文本和纯文本。（注意最前面的感叹号）
 2).通过plupload中设定filter参数直接在JS前端限定，如下
```
//可以使用该参数来限制上传文件的类型，大小等，该参数以对象的形式传入，它包括三个属性：
        filters : {
            max_file_size : '100mb',
            prevent_duplicates: true,
            //Specify what files to browse for
             mime_types: [
            {title : "flv files", extensions : "flv"} //限定flv后缀上传格式上传
            {title : "Video files", extensions : "flv,mpg,mpeg,avi,wmv,mov,asf,rm,rmvb,mkv,m4v,mp4"}, //限定flv,mpg,mpeg,avi,wmv,mov,asf,rm,rmvb,mkv,m4v,mp4后缀格式上传
            {title : "Image files", extensions : "jpg,gif,png"}, //限定jpg,gif,png后缀上传
            {title : "Zip files", extensions : "zip"} //限定zip后缀上传
             ]
        },

```

**5.设置每次只能选择一个文件**
通过plupload插件中的multi_selection参数控制，如下
```
//设置一次只能选择一个文件
  multi_selection: false,
```

**6.设置取消上传，暂停上传**
在index.html中加入者两个控制按钮：
```
<a class="btn btn-default btn-lg " id="up_load"  href="#" >
     <span>确认上传</span>
</a>  
<a class="btn btn-default btn-lg " id="stop_load"  href="#" >
     <span>暂停上传</span>
</a> 
```
然后在main.js文件里面绑定这两个按钮，添加代码如下：
```
$('#up_load').on('click', function(){
   uploader.start();
});
$('#stop_load').on('click', function(){
   uploader.stop();
});
```

**7.取消分片上传**
 将main.js 里面 chunk_size: '4mb'设置chunk_size: '0mb' ，注意分片上传默认也只能是4M，如果设置一个别的分片的大小会出现上传失败。

**8.取消自动上传**
将main.js文件auto_start参数改成auto_start: false

**9.关于请求token出现跨域**
因为都是建议用户从后端SDK获取token，然后在main.js设置参数uptoken_url: '获取uptoken的url',   这里就有可能出现跨域的现象，此时在服务端添加 response.setHeader("Access-Control-Allow-Origin","*"); 相应头字段即可。

## 安装和运行程序
* 服务端准备

    本SDK依赖服务端颁发upToken，可以通过以下二种方式实现：
    *   利用[七牛服务端SDK](http://developer.qiniu.com/docs/v6/sdk/)构建后端服务
    *   利用七牛底层API构建服务，详见七牛[上传策略](http://developer.qiniu.com/docs/v6/api/reference/security/put-policy.html)和[上传凭证](http://developer.qiniu.com/docs/v6/api/reference/security/upload-token.html)


    后端服务应提供一个URL地址，供SDK初始化使用，前端通过Ajax请求该地址后获得upToken。Ajax请求成功后，服务端应返回如下格式的json：

    ```
        {
            "uptoken": "0MLvWPnyya1WtPnXFy9KLyGHyFPNdZceomL..."
        }
    ```
* 引入Plupload

    *   [Plupload下载](http://plupload.com/download)，建议 2.1.1 及以上版本

    *   引入`plupload.full.min.js`（产品环境）或 引入`plupload.dev.js`和`moxie.js`（开发调试）

* 引入qiniu.js
    *   获取SDK源码 `git clone git@github.com:qiniupd/qiniu-js-sdk.git`，`qiniu.js`位于`src`目录内

* 初始化上传

    ```javascript
    var uploader = Qiniu.uploader({
        runtimes: 'html5,flash,html4',    //上传模式,依次退化
        browse_button: 'pickfiles',       //上传选择的点选按钮，**必需**
        uptoken_url: '/uptoken',            //Ajax请求upToken的Url，**强烈建议设置**（服务端提供）
        // downtoken_url: '/downtoken',
        // Ajax请求downToken的Url，私有空间时使用,JS-SDK将向该地址POST文件的key和domain,服务端返回的JSON必须包含`url`字段，`url`值为该文件的下载地址
        // uptoken : '<Your upload token>', //若未指定uptoken_url,则必须指定 uptoken ,uptoken由其他程序生成
        // unique_names: true, // 默认 false，key为文件名。若开启该选项，SDK会为每个文件自动生成key（文件名）
        // save_key: true,   // 默认 false。若在服务端生成uptoken的上传策略中指定了 `sava_key`，则开启，SDK在前端将不对key进行任何处理
        domain: 'http://qiniu-plupload.qiniudn.com/',   //bucket 域名，下载资源时用到，**必需**
        get_new_uptoken: false,  //设置上传文件的时候是否每次都重新获取新的token
        container: 'container',           //上传区域DOM ID，默认是browser_button的父元素，
        max_file_size: '100mb',           //最大文件体积限制
        flash_swf_url: 'js/plupload/Moxie.swf',  //引入flash,相对路径
        max_retries: 3,                   //上传失败最大重试次数
        dragdrop: true,                   //开启可拖曳上传
        drop_element: 'container',        //拖曳上传区域元素的ID，拖曳文件或文件夹后可触发上传
        chunk_size: '4mb',                //分块上传时，每片的体积
        auto_start: true,                 //选择文件后自动上传，若关闭需要自己绑定事件触发上传,
        //x_vars : {
        //    自定义变量，参考http://developer.qiniu.com/docs/v6/api/overview/up/response/vars.html
        //    'time' : function(up,file) {
        //        var time = (new Date()).getTime();
                  // do something with 'time'
        //        return time;
        //    },
        //    'size' : function(up,file) {
        //        var size = file.size;
                  // do something with 'size'
        //        return size;
        //    }
        //},
        init: {
            'FilesAdded': function(up, files) {
                plupload.each(files, function(file) {
                    // 文件添加进队列后,处理相关的事情
                });
            },
            'BeforeUpload': function(up, file) {
                   // 每个文件上传前,处理相关的事情
            },
            'UploadProgress': function(up, file) {
                   // 每个文件上传时,处理相关的事情
            },
            'FileUploaded': function(up, file, info) {
                   // 每个文件上传成功后,处理相关的事情
                   // 其中 info 是文件上传成功后，服务端返回的json，形式如
                   // {
                   //    "hash": "Fh8xVqod2MQ1mocfI4S4KpRL6D98",
                   //    "key": "gogopher.jpg"
                   //  }
                   // 参考http://developer.qiniu.com/docs/v6/api/overview/up/response/simple-response.html

                   // var domain = up.getOption('domain');
                   // var res = parseJSON(info);
                   // var sourceLink = domain + res.key; 获取上传成功后的文件的Url
            },
            'Error': function(up, err, errTip) {
                   //上传出错时,处理相关的事情
            },
            'UploadComplete': function() {
                   //队列文件处理完毕后,处理相关的事情
            },
            'Key': function(up, file) {
                // 若想在前端对每个文件的key进行个性化处理，可以配置该函数
                // 该配置必须要在 unique_names: false , save_key: false 时才生效

                var key = "";
                // do something with key here
                return key
            }
        }
    });

    // domain 为七牛空间（bucket)对应的域名，选择某个空间后，可通过"空间设置->基本设置->域名设置"查看获取

    // uploader 为一个plupload对象，继承了所有plupload的方法，参考http://plupload.com/docs

    ```

    如果一个页面中有多个上传实例，可以如下操作
    ```javascript
    var option1 = {
        key : val ,
        ……
    };
    var uploader = Qiniu.uploader(option1);

    var Qiniu2 = new QiniuJsSDK();
    var option2 = {
        key : val ,
        ……
    };
    var uploader2 = Qiniu2.uploader(option2);

    ```

* 运行网站，通过点击`pickfiles`元素，选择文件后上传

* 对上传成功的图片进行数据处理

    *  watermark（水印）

    ```javascript

        // key 为每个文件上传成功后，服务端返回的json字段，即资源的最终名字，下同
        // key 可在每个文件'FileUploaded'事件被触发时获得

        var imgLink = Qiniu.watermark({
             mode: 1,  // 图片水印
             image: 'http://www.b1.qiniudn.com/images/logo-2.png', // 图片水印的Url，mode = 1 时 **必需**
             dissolve: 50,          // 透明度，取值范围1-100，非必需，下同
             gravity: 'SouthWest',  // 水印位置，为以下参数[NorthWest、North、NorthEast、West、Center、East、SouthWest、South、SouthEast]之一
             dx: 100,  // 横轴边距，单位:像素(px)
             dy: 100   // 纵轴边距，单位:像素(px)
         }, key);      // key 为非必需参数，下同

        // imgLink 可以赋值给 html 的 img 元素的 src 属性，下同

        // 若未指定key，可以通过以下方式获得完整的 imgLink，下同
        // imgLink  =  '<domain>/<key>?' +  imgLink
        // <domain> 为七牛空间（bucket)对应的域名，选择某个空间后，可通过"空间设置->基本设置->域名设置"查看获取

    ```

    或

    ```javascript

        var imgLink = Qiniu.watermark({
             mode: 2,  // 文字水印
             text: 'hello world !', // 水印文字，mode = 2 时 **必需**
             dissolve: 50,          // 透明度，取值范围1-100，非必需，下同
             gravity: 'SouthWest',  // 水印位置，同上
             fontsize: 500,         // 字体大小，单位: 缇
             font : '黑体',          // 水印文字字体
             dx: 100,  // 横轴边距，单位:像素(px)
             dy: 100,  // 纵轴边距，单位:像素(px)
             fill: '#FFF000'        // 水印文字颜色，RGB格式，可以是颜色名称
         }, key);

    ```
    具体水印参数解释见[水印（watermark）](http://developer.qiniu.com/docs/v6/api/reference/fop/image/watermark.html)
    *  imageView2

    ```javascript

        var imgLink = Qiniu.imageView2({
           mode: 3,  // 缩略模式，共6种[0-5]
           w: 100,   // 具体含义由缩略模式决定
           h: 100,   // 具体含义由缩略模式决定
           q: 100,   // 新图的图像质量，取值范围：1-100
           format: 'png'  // 新图的输出格式，取值范围：jpg，gif，png，webp等
         }, key);

    ```
    具体缩略参数解释见[图片处理（imageView2）](http://developer.qiniu.com/docs/v6/api/reference/fop/image/imageview2.html)
    *  imageMogr2

    ```javascript

        var imgLink = Qiniu.imageMogr2({
           auto-orient: true,  // 布尔值，是否根据原图EXIF信息自动旋正，便于后续处理，建议放在首位。
           strip: true,   // 布尔值，是否去除图片中的元信息
           thumbnail: '1000x1000'   // 缩放操作参数
           crop: '!300x400a10a10',  // 裁剪操作参数
           gravity: 'NorthWest',    // 裁剪锚点参数
           quality: 40,  // 图片质量，取值范围1-100
           rotate: 20,   // 旋转角度，取值范围1-360，缺省为不旋转。
           format: 'png',// 新图的输出格式，取值范围：jpg，gif，png，webp等
           blur:'3x5'    // 高斯模糊参数
         }, key);

    ```

    具体高级图像处理参数解释见[高级图像处理（imageMogr2）](http://developer.qiniu.com/docs/v6/api/reference/fop/image/imagemogr2.html)
    *  imageInfo

    ```javascript
        var imageInfoObj = Qiniu.imageInfo(key);
    ```
    具体 imageInfo 解释见[图片基本信息（imageInfo）](http://developer.qiniu.com/docs/v6/api/reference/fop/image/imageinfo.html)

    Ajax跨域限制，IE系列此函数只支持IE10+
    *  exif

    ```javascript
        var exifOjb = Qiniu.exif(key);
    ```

    具体 exif 解释见[图片EXIF信息（exif）](http://developer.qiniu.com/docs/v6/api/reference/fop/image/exif.html)

    Ajax跨域限制，IE系列此函数只支持IE10+
    *  pipeline(管道操作）

    ```javascript

        var fopArr = [{
            fop: 'watermark', // 指定watermark操作
            mode: 2, // 此参数同watermark函数的参数，下同。
            text: 'hello world !',
            dissolve: 50,
            gravity: 'SouthWest',
            fontsize: 500,
            font : '黑体',
            dx: 100,
            dy: 100,
            fill: '#FFF000'
        },{
            fop: 'imageView2',  // 指定imageView2操作
            mode: 3,  // 此参数同imageView2函数的参数，下同
            w: 100,
            h: 100,
            q: 100,
            format: 'png'
        },{
            fop: 'imageMogr2',  // 指定imageMogr2操作
            auto-orient: true,  // 此参数同imageMogr2函数的参数，下同。
            strip: true,
            thumbnail: '1000x1000'
            crop: '!300x400a10a10',
            gravity: 'NorthWest',
            quality: 40,
            rotate: 20,
            format: 'png',
            blur:'3x5'
        }];

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
        //    auto-orient: true,  // 此参数同imageMogr2函数的参数，下同。
        //    strip: true,
        //    thumbnail: '1000x1000'
        //    crop: '!300x400a10a10',
        //    gravity: 'NorthWest',
        //    quality: 40,
        //    rotate: 20,
        //    format: 'png',
        //    blur:'3x5'
        // }];


        var imgLink = Qiniu.pipeline(fopArr, key));

    ```
    具体管道操作解释见[管道操作](http://developer.qiniu.com/docs/v6/api/overview/fop/pipeline.html)

## 运行示例

直接运行本SDK示例网站的服务

*  安装 [Nodejs](http://nodejs.org/download/)、[npm](https://www.npmjs.org/)

*  获取源代码：
    `git clone git@github.com:qiniupd/qiniu-js-sdk.git`
*  进入`demo`目录,修改`config.js`，`Access Key`和`Secret Key` 按如下方式获取

    * [开通七牛开发者帐号](https://portal.qiniu.com/signup)
    * [登录七牛开发者自助平台，查看 AccessKey 和 SecretKey](https://portal.qiniu.com/setting/key) 。

        ```javascript

            module.exports = {
                'ACCESS_KEY': '<Your Access Key>',
                'SECRET_KEY': '<Your Secret Key>',
                'Bucket_Name': '<Your Bucket Name>',
                'Port': 18080,
                'Uptoken_Url': '<Your Uptoken_Url>',
                'Domain': '<Your Bucket Domain>'
            }

        ```

*  在根目录运行`make`启动

*  访问`http://127.0.0.1:18080/`或`http://localhost:18080/`

## 说明

1. 本SDK依赖Plupload，初始化之前请引入Plupload。

2. 本SDK依赖uptoken，可以通过提供Ajax请求地址 `uptoken_url` 或者直接设置 `uptoken` 实现，强烈建议前者。

3. 如果您想了解更多七牛的上传策略，建议您仔细阅读 [七牛官方文档-上传](http://developer.qiniu.com/docs/v6/api/reference/up/)。
   另外，七牛的上传策略是在后端服务指定的，本SDK的 setOption API 只是设置 Plupload的初始化参数，和上传策略无关。

4. 如果您想了解更多七牛的图片处理，建议您仔细阅读 [七牛官方文档-图片处理](http://developer.qiniu.com/docs/v6/api/reference/fop/image/)

5. 如果是 https 网站，上传地址为 https://up.qbox.me 否则使用 http://upload.qiniu.com

6. 本SDK示例生成upToken时，指定的`Bucket Name`为公开空间，所以可以公开访问上传成功后的资源。若您生成upToken时，指定的`Bucket Name`为私有空间，那您还需要在服务端进行额外的处理才能访问您上传的资源。具体参见[下载凭证](http://developer.qiniu.com/docs/v6/api/reference/security/download-token.html)。本SDK数据处理部分功能不适用于私有空间。

## 贡献代码

1. 登录 https://github.com

2. Fork git@github.com:qiniupd/qiniu-js-sdk.git

3. 创建您的特性分支 (git checkout -b new-feature)

4. 提交您的改动 (git commit -am 'Added some features or fixed a bug')

5. 将您的改动记录提交到远程 git 仓库 (git push origin new-feature)

6. 然后到 github 网站的该 git 远程仓库的 new-feature 分支下发起 Pull Request


## 许可证

> Copyright (c) 2014 qiniu.com

## 基于 GPL V2 协议发布:

> [www.gnu.org/licenses/gpl-2.0.html](http://www.gnu.org/licenses/gpl-2.0.html)


