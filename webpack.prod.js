var webpack = require("webpack");
var UglifyJSPlugin = require("uglifyjs-webpack-plugin");
var merge = require("webpack-merge");
var common = require("./webpack.common.js");
var path = require("path");
module.exports = merge(common, {
  mode: "production",
  devtool: "source-map",
  entry: './lib/index.js',
  output: {
    filename: 'qiniu.min.js',
    library: 'qiniu',
    libraryTarget: 'umd',
    path: path.resolve(__dirname, 'dist'),
    publicPath: '/dist/'
  },
  plugins: [
    new UglifyJSPlugin({
      sourceMap: true,
      uglifyOptions:{
        output: {
          comments: false,
          beautify: false
        }
      }
    }),
    new webpack.DefinePlugin({
      "process.env.NODE_ENV": JSON.stringify("production")
    })
  ]
});
