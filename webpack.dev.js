var merge = require("webpack-merge");
var path = require("path");
var webpack = require("webpack");
var common = require("./webpack.common.js");
var OpenBrowserPlugin = require("open-browser-webpack-plugin");
module.exports = merge(common, {
  //devtool: "inline-source-map",
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
    // new OpenBrowserPlugin({ url: "http://0.0.0.0:8080/demo" }),
    // new webpack.HotModuleReplacementPlugin()
  ]
});
