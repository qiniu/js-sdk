var qiniu = require('qiniu');
var express = require('express');
var config = require('./config.js');
var app = express();

app.configure(function() {
    app.use(express.static(__dirname + '/'));
});


app.use(express.urlencoded());

app.get('/uptoken', function(req, res, next) {
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

function downloadUrl(domain, key, mac) {
    var baseUrl = qiniu.rs.makeBaseUrl(domain, key);
    console.log(baseUrl)
    var policy = new qiniu.rs.GetPolicy();
    return policy.makeRequest(baseUrl, mac);
}

app.post('/downtoken', function(req, res) {
    // console.log(req.query)
    // console.log(req)
    res.header("Cache-Control", "max-age=0, private, must-revalidate");
    res.header("Pragma", "no-cache");
    res.header("Expires", 0);
    console.log(req.body);
    var key = req.body.key,
        domain = req.body.domain;
    console.log('key>>>>>>', key)
    console.log('key>>>>>>', domain)
    var mac = {
        'secretKey': config.SECRET_KEY
    }
    var token = downloadUrl(domain, key, mac);
    if (token) {
        res.json({
            downtoken: token
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


app.listen(config.Port, function() {
    console.log('Listening on port %d', config.Port);
});
