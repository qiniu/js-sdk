var qiniu = require('qiniu');
var express = require('express');
var config = require('./config.js');
var app = express();

app.configure(function() {
    app.use(express.static(__dirname + '/../'));
});


app.set('views', __dirname + '/../views');

app.engine('html', require('ejs').renderFile);

app.use(express.urlencoded());


app.get('/', function(req, res) {
    res.render('index.html');
});


app.get('/docs', function(req, res) {
    res.render('docs.html');
});

app.get('/demo', function(req, res) {
    res.render('demo.html');
});


app.get('/faq', function(req, res) {
    res.render('faq.html');
});


app.post('/uptoken', function(req, res, next) {
    var name = req.body.name,
        size = req.body.size,
        domain = req.body.bucket_domain,
        type = req.body.type;
    var token = uptoken.token();
    res.header("Cache-Control", "max-age=0, private, must-revalidate");
    res.header("Pragma", "no-cache");
    res.header("Expires", 0);
    if (token) {
        res.json({
            uptoken: token
        });
    }
});

app.get('/private_uptoken', function(req, res, next) {
    var token = privateUptoken.token();
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

    var key = req.body.key,
        domain = req.body.domain;

    //trim 'http://'
    if (domain.indexOf('http://') != -1) {
        domain = domain.substr(7);
    }
    //trim 'https://'
    if (domain.indexOf('https://') != -1) {
        domain = domain.substr(8);
    }
    //trim '/' if the domain's last char is '/'
    if (domain.lastIndexOf('/') === domain.length - 1) {
        domain = domain.substr(0, domain.length - 1);
    }

    var baseUrl = qiniu.rs.makeBaseUrl(domain, key);
    var deadline = 3600 + Math.floor(Date.now() / 1000);

    baseUrl += '?e=' + deadline;
    var signature = qiniu.util.hmacSha1(baseUrl, config.SECRET_KEY);
    var encodedSign = qiniu.util.base64ToUrlSafe(signature);
    var downloadToken = config.ACCESS_KEY + ':' + encodedSign;

    if (downloadToken) {
        res.json({
            downtoken: downloadToken,
            url: baseUrl + '&token=' + downloadToken
        })
    }
});

app.get('/demo/unique_name', function(req, res) {
    res.render('demo/unique_name.html', {
        domain: config.Public_Bucket_Domain,
        uptoken_url: config.Public_Uptoken_Url
    });
});

app.get('/demo/x_vals', function(req, res) {
    res.render('demo/x_vals.html', {
        domain: config.Public_Bucket_Domain,
        uptoken_url: config.Public_Uptoken_Url
    });
});

app.get('/demo/not_auto_start', function(req, res) {
    res.render('demo/not_auto_start.html', {
        domain: config.Public_Bucket_Domain,
        uptoken_url: config.Public_Uptoken_Url
    });
});

app.get('/demo/check_md5', function(req, res) {
    res.render('demo/check_md5.html', {
        domain: config.Public_Bucket_Domain,
        uptoken_url: config.Public_Uptoken_Url
    });
});


app.get('/demo/private_bucket', function(req, res) {
    res.render('demo/private_bucket.html', {
        domain: config.Private_Bucket_Domain,
        uptoken_url: config.Private_Uptoken_Url
    });
});

qiniu.conf.ACCESS_KEY = config.ACCESS_KEY;
qiniu.conf.SECRET_KEY = config.SECRET_KEY;

var uptoken = new qiniu.rs.PutPolicy(config.Public_Bucket_Name);
var privateUptoken = new qiniu.rs.PutPolicy(config.Private_Bucket_Name);


app.listen(config.Port, function() {
    console.log('Listening on port %d', config.Port);
});
