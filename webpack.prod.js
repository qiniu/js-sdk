let webpack = require("webpack");
let TerserPlugin = require('terser-webpack-plugin');
let merge = require("webpack-merge");
let common = require("./webpack.common.js");
let path = require("path");

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
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        cache: true,
        parallel: true,
        sourceMap: true
      })
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      "process.env.NODE_ENV": JSON.stringify("production")
    })
  ]
});
