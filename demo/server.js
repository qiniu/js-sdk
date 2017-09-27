var qiniu = require('qiniu');
var express = require('express');
var config = require('./config.js');
var app = express();

app.configure(function() {
  app.use(express.static(__dirname + '/'));
});

app.set('views', __dirname + '/views');
app.engine('html', require('ejs').renderFile);

app.use(express.urlencoded());
app.use('/bower_components', express.static(__dirname + '/../bower_components'));
app.use('/src', express.static(__dirname + '/../src'));
app.use('/dist', express.static(__dirname + '/../dist'));

var mac = new qiniu.auth.digest.Mac(config.AccessKey, config.SecretKey);
var options = {
  scope: config.Bucket,
  deleteAfterDays: 7,
};
var putPolicy = new qiniu.rs.PutPolicy(options);
var bucketManager = new qiniu.rs.BucketManager(mac, null);

app.get('/uptoken', function(req, res, next) {
  var token = putPolicy.uploadToken(mac);
  res.header("Cache-Control", "max-age=0, private, must-revalidate");
  res.header("Pragma", "no-cache");
  res.header("Expires", 0);
  if (token) {
    res.json({
      uptoken: token
    });
  }
});

app.post('/downtoken', function(req, res) {

  var key = req.body.key;
  var domain = req.body.domain;

  //trim '/' if the domain's last char is '/'
  if (domain.lastIndexOf('/') === domain.length - 1) {
    domain = domain.substr(0, domain.length - 1);
  }

  var deadline = 3600 + Math.floor(Date.now() / 1000);
  var privateDownUrl = bucketManager.privateDownloadUrl(domain, key,
    deadline);
  res.json({
    url: privateDownUrl,
  });

});

app.get('/', function(req, res) {
  res.render('index.html', {
    domain: config.Domain,
    uptoken_url: config.UptokenUrl
  });
});

app.get('/multiple', function(req, res) {
  res.render('multiple.html', {
    domain: config.Domain,
    uptoken_url: config.UptokenUrl
  });
});

app.get('/formdata', function(req, res) {
  var token = putPolicy.uploadToken(mac);
  res.render('formdata.html', {
    domain: config.Domain,
    uptoken: token
  });
});

app.get('/performance', function(req, res) {
  var token = putPolicy.uploadToken(mac);
  res.render('performance.html', {
    uptoken: token
  });
});


app.listen(config.Port, function() {
  console.log('Listening on port %d\n', config.Port);
  console.log(
    '▽ ▽ ▽ ▽ ▽ ▽ ▽ ▽ ▽ ▽ ▽ ▽ ▽  Demos  ▽ ▽ ▽ ▽ ▽ ▽ ▽ ▽ ▽ ▽ ▽ ▽ ▽ ▽ ▽ ▽');
  console.log(
    ' ▹▹▹▹▹▹▹▹▹▹▹▹▹▹▹▹  Upload: http://127.0.0.1:%d   ◁ ◁ ◁ ◁ ◁ ◁ ◁',
    config.Port);
  console.log(
    ' ▹▹▹▹▹▹▹  Multiple upload: http://127.0.0.1:%d/multiple  ◁ ◁ ◁',
    config.Port);
  console.log(
    ' ▹▹▹▹▹▹▹  Formdata upload: http://127.0.0.1:%d/formdata  ◁ ◁ ◁',
    config.Port);
  console.log(
    ' ▹▹▹▹▹▹▹  Up  Performance: http://127.0.0.1:%d/performance ◁ ◁',
    config.Port);
  console.log(
    '△ △ △ △ △ △ △ △ △ △ △ △ △ △ △ △ △ △ △ △ △ △ △ △ △ △ △ △ △ △ △ △ △\n'
  );
});
