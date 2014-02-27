
var url = require('url');
var conf = require('../conf');
var util = require('../util');

exports.Mac = Mac;

function Mac(accessKey, secretKey) {
  this.accessKey = accessKey || conf.ACCESS_KEY;
  this.secretKey = secretKey || conf.SECRET_KEY;
}

//Mac.prototype._sign = function(data) {
//  return util.hmacSha1(data, this.secretKey);
//}
//
//Mac.prototype.sign = function(data) {
//  return this.accessKey + ':' + this._sign(data);
//}
//
//Mac.prototype.signWithData = function(b) {
//  var data = util.urlsafeBase64Encode(b);
//  var sign = this._sign(data);
//  return this.accessKey + ':' + sign + ':' + data;
//}
//
//Mac.prototype.sign_request = function(path, body, content_type) {
//  var u = url.parse(path);
//  var path = u.path;
//  var data = path + '\n';
//
//  if (body) {
//    data += body;
//  }
//
//  return this.access + ':' + this._sign(data);
//}
//

