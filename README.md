qiniu-js-sdk
============

基于七牛API开发的前端JS SDK

一个基于 [七牛云存储](http://www.qiniu.com/)、 [七牛PHP SDK] (https://github.com/qiniu/php-sdk)及[Plupload](http://www.plupload.com/) 开发的上传Demo。
示例网站：[七牛Plupload上传Demo-配合PHP SDK](http://plupload.sinaapp.com/)

##依赖

1. Plupload 2.1.0
2. jQuery 1.9.1
3. PHP SDK v6.1.4


## 安装和运行程序

1. 获取源代码：
    `git clone git@github.com:SunLn/qiniu-phpsdk-plupload.git`

2. 编辑 `token.php` 文件,保存
```{php}
$bucket = '<Your Buckete Name>';
$accessKey = '<Your Access Key>';
$secretKey = '<Your Secret Key>';
```
3. 运行网站、选择文件后上传

## 说明

1. 本示例仅演示了如何通过Plupload、七牛PHP SDK上传文件至七牛空间，其中PHP SDK为Plupload颁发uptOken后，Plupload进行上传操作。

2. 如果您想了解更多七牛的上传策略，建议您仔细阅读七牛的官方文档 - [七牛官方文档-上传](http://developer.qiniu.com/docs/v6/api/reference/up/)

3. 通过[七牛Plupload上传Demo-配合PHP SDK](http://plupload.sinaapp.com/)上传文件后，可以通过访问  'http://qiniu-plupload.u.qiniudn.com/' + key 获取上传的资源

4. 代码及文档在进一步整理中,欢迎反馈问题或贡献代码


## 贡献代码

1. 登录 https://github.com
2. Fork https://github.com/SunLn/qiniu-phpsdk-plupload
3. 创建您的特性分支 (git checkout -b new-feature)
4. 提交您的改动 (git commit -am 'Added some features or fixed a bug')
5. 将您的改动记录提交到远程 git 仓库 (git push origin new-feature)
6. 然后到 github 网站的该 git 远程仓库的 new-feature 分支下发起 Pull Request
