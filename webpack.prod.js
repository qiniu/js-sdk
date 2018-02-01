var webpack = require("webpack");
var UglifyJSPlugin = require("uglifyjs-webpack-plugin");
var merge = require("webpack-merge");
var common = require("./webpack.common.js");
var path = require("path");
module.exports = merge(common, {
  devtool: "source-map",
  devServer: {
    disableHostCheck: true,
    progress: true,
    proxy: {
      "/api/*": {
        target: "http://0.0.0.0:9000",
        changeOrigin: true,
        secure: false
      }
    },
    host: "0.0.0.0",
    contentBase: path.join(__dirname, "./"),
    publicPath: "/dist/",
    hot: false,
    inline: false
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
