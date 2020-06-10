var path = require("path");
var OpenBrowserPlugin = require("open-browser-webpack-plugin");
var es3ifyPlugin = require("es3ify-webpack-plugin");

module.exports = {
  entry: "./index.js",
  output: {
    filename: "boundle.js",
    path: path.resolve(__dirname, "dist/"),
    publicPath: "/test/"
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        include: [path.resolve(__dirname, "./index.js")],
        use: {
          loader: "babel-loader"
        }
      }
    ]
  },
  plugins:[
    new es3ifyPlugin(),
    new OpenBrowserPlugin({ url: 'http://0.0.0.0:8000/' })
  ],
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
    port: 8000,
    contentBase: path.join(__dirname, "./"),
    publicPath: "/dist/",
    hot: true,
    inline: false
  }
};
