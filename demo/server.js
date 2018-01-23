var qiniu = require("qiniu");
var express = require("express");
var util = require("util");
var config = require("./config.js");
var request = require("request");
var app = express();
app.use(express.static(__dirname + "/"));
var multiparty = require("multiparty");

var mac = new qiniu.auth.digest.Mac(config.AccessKey, config.SecretKey);
var config2 = new qiniu.conf.Config();
config2.zone = qiniu.zone.Zone_z2;
var formUploader = new qiniu.form_up.FormUploader(config2);
var putExtra = new qiniu.form_up.PutExtra();
var options = {
  scope: config.Bucket,
  deleteAfterDays: 7,
  returnBody:
    '{"key":"$(key)","hash":"$(etag)","fsize":$(fsize),"bucket":"$(bucket)","name":"$(x:name)"}'
};
var putPolicy = new qiniu.rs.PutPolicy(options);
var bucketManager = new qiniu.rs.BucketManager(mac, null);

app.get("/api/uptoken", function(req, res, next) {
  var token = putPolicy.uploadToken(mac);
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
  console.log("receive form.....");
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
        console.log(123);
        res.json(respBody);
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
