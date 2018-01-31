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
    host: "0.0.0.0", // Use this rather than localhost so we can access from a VM for browser testing
    contentBase: path.join(__dirname, "./"),
    publicPath: "/dist/",
    hot: false,
    inline: false
  },
  plugins: [
    new UglifyJSPlugin({
      sourceMap: true
    }),
    new webpack.DefinePlugin({
      "process.env.NODE_ENV": JSON.stringify("production")
    })
  ]
});
