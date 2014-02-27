var conf = require('./conf');
var util = require('./util');
var rpc = require('./rpc');
var fs = require('fs');
var getCrc32 = require('crc32');
var url = require('url');
var mime = require('mime');
var formstream = require('formstream');

exports.UNDEFINED_KEY = '?'
exports.PutExtra = PutExtra;
exports.PutRet = PutRet;
exports.put = put;
exports.putWithoutKey = putWithoutKey;
exports.putFile = putFile;
exports.putFileWithoutKey = putFileWithoutKey;

// @gist PutExtra
function PutExtra(params, mimeType, crc32, checkCrc) {
  this.paras = params || {};
  this.mimeType = mimeType || null;
  this.crc32 = crc32 || null;
  this.checkCrc = checkCrc || 0;
}
// @endgist

function PutRet(hash, key) {
  this.hash = hash || null;
  this.key = key || null;
}

// onret: callback function instead of ret
function put(uptoken, key, body, extra, onret) {
  if(!extra) {
    extra = new PutExtra();
  }
  if (!extra.mimeType) {
    extra.mimeType = 'application/octet-stream';
  }

  if(!key) {
    key = exports.UNDEFINED_KEY;
  }

  var form = getMultipart(uptoken, key, body, extra);

  rpc.postMultipart(conf.UP_HOST, form, onret);
}

function putWithoutKey(uptoken, body, extra, onret) {
  put(uptoken, null, body, extra, onret);
}

function getMultipart(uptoken, key, body, extra) {

  var form = formstream();

  form.field('token', uptoken);
  if(key != exports.UNDEFINED_KEY) {
    form.field('key', key);
  }
  var buf = Buffer.isBuffer(body) ? body : new Buffer(body);
  form.buffer('file', buf, key, extra.mimeType);

  //extra['checkcrc']
  if (extra.checkCrc == 1) {
    var bodyCrc32 = getCrc32(body);
    extra.crc32 = '' + parseInt(bodyCrc32, 16);
  }

  if(extra.checkCrc) {
    form.field('crc32', extra.crc32);
  }

  for (var k in extra.params) {
    form.field(k, extra.params[k]);
  }

  return form;
}

function putFile(uptoken, key, loadFile, extra, onret) {
  fs.readFile(loadFile, function(err, data) {
    if(err) {
      onret({code: -1, error: err.toString()}, {});
      return;
    }

    if(!extra) {
      extra = new PutExtra();
    }

    if(!extra.mimeType) {
      extra.mimeType = mime.lookup(loadFile);
    }
    put(uptoken, key, data, extra, onret);
  });
}

function putFileWithoutKey(uptoken, loadFile, extra, onret) {
  putFile(uptoken, null, loadFile, extra, onret);
}
