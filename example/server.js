var qiniu = require('qiniu');
var express = require('express');
var config = require('./config.js');
var app = express();

app.configure(function() {
    app.use(express.static(__dirname + '/'));
});

app.use(function(req, res, next) {
    req.headers['if-none-match'] = 'no-match-for-this';
    next();
});

app.get('/token', function(req, res, next) {
    console.log("=====================>>>>token");
    var token = uptoken.token();
    res.header("Cache-Control", "max-age=0, private, must-revalidate");
    res.header("Pragma", "no-cache");
    res.header("Expires", 0);
    if (token) {
        res.json({
            uptoken: token
        })
    }
});

app.get('/', function(req, res) {
    res.setHeader('Pragma', 'no-cache');
    res.sendfile(__dirname + '/index.html')
});

qiniu.conf.ACCESS_KEY = config.ACCESS_KEY;
qiniu.conf.SECRET_KEY = config.SECRET_KEY;

var uptoken = new qiniu.rs.PutPolicy(config.Bucket_Name);


app.listen(config.Port);



console.log('server runing at localhost: ' + config.Port)
