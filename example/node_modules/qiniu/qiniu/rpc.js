var urllib = require('urllib');
var util = require('./util');
var conf = require('./conf');

exports.postMultipart = postMultipart;
exports.postWithForm = postWithForm;
exports.postWithoutForm = postWithoutForm;

function postMultipart(uri, form, onret) {
  post(uri, form, form.headers(), onret);
}

function postWithForm(uri, form, token, onret) {
  var headers = {
    'Content-Type': 'application/x-www-form-urlencoded'
  };
  if (token) {
    headers['Authorization'] = token;
  }
  post(uri, form, headers, onret);
}

function postWithoutForm(uri, token, onret) {
  var headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  if (token) {
    headers['Authorization'] = token;
  }
  post(uri, null, headers, onret);
}

function post(uri, form, headers, onresp) {
  headers = headers || {};
  headers['User-Agent'] = headers['User-Agent'] || conf.USER_AGENT;

  var content = null;
  if (Buffer.isBuffer(form) || typeof form === 'string') {
    content = form;
    form = null;
  }

  var req = urllib.request(uri, {
    headers: headers,
    method: 'POST',
    content: content,
    dataType: 'json',
    timeout: conf.RPC_TIMEOUT,
  }, function (err, result, res) {
    if (err) {
      err.code = res && res.statusCode || -1;
    }
    onresp(err, result, res);
  });

  if (form) {
    form.pipe(req);
  }
}

