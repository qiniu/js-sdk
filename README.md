qiniu-js-sdk
============

基于七牛API及Plupload开发的前端JavaScript SDK

示例网站：[七牛Plupload上传Demo-配合PHP SDK](http://plupload.sinaapp.com/)

##依赖

1. Plupload 2.1.1
2.
3. PHP SDK v6.1.4


## 安装和运行程序

1. 获取源代码：
    `git clone https://github.com/SunLn/qiniu-js-sdk.git`

2. 利用[七牛服务端SDK](http://developer.qiniu.com/docs/v6/sdk/)构建后端服务，提供一个api URL地址供前端初始化uptoken

3. 在页面引入Plupload，及qiniu.js,初始化SDK,保存

	```{javascript}
        var Q = new Qiniu({
            runtimes: 'html5,flash,html4', //上传方式,依次退化
            browse_button: 'pickfiles', //上传选择的点选按钮，必须
            uptoken_url: '/token', //请求uptoken的Url，必须（第二步提供）
            domain: 'http://qiniu-plupload.qiniudn.com/',//buckete 域名，下载资源时用到，必须
            container: 'container',//上传区域DOM ID，默认是browser_button的父元素，
            drop_element: 'container', //拖曳上传区域元素的ID
            max_file_size: '100mb', //最大文件体积限制
            flash_swf_url: 'js/plupload/Moxie.swf',//引入flash
            max_retries: 3,//上传失败最大重试次数
            dragdrop: true, //开启可拖曳上传
            chunk_size: '4mb',//分片上传时，每片的体积
            auto_start: true, //选择文件后自动上传，若关闭需要自己绑定事件触发上传
            init: {
                'FilesAdded': function(up, files) {
                    plupload.each(files, function(file) {
                        //文件添加进队列后,处理相关的事情
                    });
                },
                'BeforeUpload': function(up, file) {
                   //每个文件上传前,处理相关的事情
                },
                'UploadProgress': function(up, file) {
                    //每个文件上传时,处理相关的事情
                },
                'FileUploaded': function(up, file, info) {
                   //每个文件上传成功后,处理相关的事情
                },
                'Error': function(up, err, errTip) {
                    //上传出错时,处理相关的事情
                },
                'UploadComplete': function() {
                    //队列文件处理完毕后,处理相关的事情
                }
            }
        });
    ```
4. 运行网站、访问该页面，选择文件后上传

## API使用手册 (Todo 详细使用说明)

*  初始化

*  watermark

*  imageView2

*  imageMogr2

*  imageInfo

*  exif

*  pipeline

## 说明

1. 本SDK依赖Plupload，初始化之前请引入Plupload插件

2. 本SDK依赖服务端提供uptoken，所以必须构建后端服务

3. 如果您想了解更多七牛的上传策略，建议您仔细阅读七牛的官方文档 - [七牛官方文档-上传](http://developer.qiniu.com/docs/v6/api/reference/up/)

4. 如果您想了解更多七牛的图片处理，建议您仔细阅读七牛的官方文档 - [七牛官方文档-图片处理](http://developer.qiniu.com/docs/v6/api/reference/fop/image/)

5. 代码及文档在进一步整理中,欢迎反馈问题或贡献代码

## 贡献代码

1. 登录 https://github.com
2. Fork https://github.com/SunLn/qiniu-js-sdk.git
3. 创建您的特性分支 (git checkout -b new-feature)
4. 提交您的改动 (git commit -am 'Added some features or fixed a bug')
5. 将您的改动记录提交到远程 git 仓库 (git push origin new-feature)
6. 然后到 github 网站的该 git 远程仓库的 new-feature 分支下发起 Pull Request
