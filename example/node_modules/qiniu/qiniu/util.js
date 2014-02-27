var fs = require('fs');
var url = require('url');
var path = require('path');
var crypto = require('crypto');
var conf = require('./conf');

// ------------------------------------------------------------------------------------------
// func encode

exports.urlsafeBase64Encode = function(jsonFlags) {
  var encoded = new Buffer(jsonFlags).toString('base64');
  return exports.base64ToUrlSafe(encoded);
}

exports.base64ToUrlSafe = function(v) {
  return v.replace(/\//g, '_').replace(/\+/g, '-');
}

exports.hmacSha1 = function(encodedFlags, secretKey) {
  /*
   *return value already encoded with base64
  * */
  var hmac = crypto.createHmac('sha1', secretKey);
  hmac.update(encodedFlags);
  return hmac.digest('base64');
}

// ------------------------------------------------------------------------------------------
// func generateAccessToken

exports.generateAccessToken = function(uri, body) {
  var u = url.parse(uri);
  var path = u.path;
  var access = path + '\n';

  if (body) {
    access += body;
  }

  var digest = exports.hmacSha1(access, conf.SECRET_KEY);
  var safeDigest = exports.base64ToUrlSafe(digest);
  return 'QBox ' + conf.ACCESS_KEY + ':' + safeDigest;
}
