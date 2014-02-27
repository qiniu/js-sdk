
var libpath = process.env.QINIU_COV ? './lib-cov' : './qiniu';

module.exports = {
  io: require(libpath + '/io.js'),
  rs: require(libpath + '/rs.js'),
  rsf: require(libpath + '/rsf.js'),
  fop: require(libpath + '/fop.js'),
  conf: require(libpath + '/conf.js'),
};
