var qiniu = require('qiniu');
var express = require('express');
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
    console.log(token);
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

qiniu.conf.ACCESS_KEY = '0MLvWPnyya1WtPnXFy9KLyGHyFPNdZceomLVk0c9';
qiniu.conf.SECRET_KEY = 'o5itRgrXxoD6XQ5wDWKQ7h--eWvWyQVKcsIURuEV';

var uptoken = new qiniu.rs.PutPolicy('qiniu-plupload');


app.listen(18080);



console.log('server runing at localhost:' + 3000)
