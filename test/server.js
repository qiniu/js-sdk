let qiniu = require("qiniu");
let express = require("express");
let util = require("util");
let path = require("path")
let request = require("request");
let app = express();
app.use(express.static(__dirname + "/"));
let multiparty = require("multiparty");

let fs=require('fs');
let config=JSON.parse(fs.readFileSync(path.resolve(__dirname,"config.json")));

let mac = new qiniu.auth.digest.Mac(config.AccessKey, config.SecretKey);
let config2 = new qiniu.conf.Config();
// 这里主要是为了用 node sdk 的 form 直传，结合 demo 中 form 方式来实现无刷新上传
config2.zone = qiniu.zone.Zone_z2;
let formUploader = new qiniu.form_up.FormUploader(config2);
let putExtra = new qiniu.form_up.PutExtra();
let options = {
  scope: config.Bucket,
// 上传策略设置文件过期时间，正式环境中要谨慎使用，文件在存储空间保存一天后删除
  deleteAfterDays: 1, 
  returnBody:
    '{"key":"$(key)","hash":"$(etag)","fsize":$(fsize),"bucket":"$(bucket)","name":"$(x:name)"}'
};

let putPolicy = new qiniu.rs.PutPolicy(options);
let bucketManager = new qiniu.rs.BucketManager(mac, null);

app.get("/api/uptoken", function(req, res, next) {
  let token = putPolicy.uploadToken(mac);
  res.header("Cache-Control", "max-age=0, private, must-revalidate");
  res.header("Pragma", "no-cache");
  res.header("Expires", 0);
  if (token) {
    res.json({
      uptoken: token,
      domain: config.Domain
    });
  }
});

app.post("/api/transfer", function(req, res) {
  var form = new multiparty.Form();
  form.parse(req, function(err, fields, files) {
    var path = files.file[0].path;
    var token = fields.token[0];
    var key = fields.key[0];
    formUploader.putFile(token, key, path, putExtra, function(
      respErr,
      respBody,
      respInfo
    ) {
      if (respErr) {
        console.log(respErr);
        throw respErr;
      }
      if (respInfo.statusCode == 200) {
        res.send('<script>window.parent.showRes('+JSON.stringify(respBody)+')</script>');
      } else {
        console.log(respInfo.statusCode);
        console.log(respBody);
      }
    });
  });
});

app.listen(config.Port, function() {
  console.log("Listening on port %d\n", config.Port);
  console.log(
    "▽ ▽ ▽ ▽ ▽ ▽ ▽ ▽ ▽ ▽ ▽ ▽ ▽  Demos  ▽ ▽ ▽ ▽ ▽ ▽ ▽ ▽ ▽ ▽ ▽ ▽ ▽ ▽ ▽ ▽"
  );
  console.log(
    "△ △ △ △ △ △ △ △ △ △ △ △ △ △ △ △ △ △ △ △ △ △ △ △ △ △ △ △ △ △ △ △ △\n"
  );
});
