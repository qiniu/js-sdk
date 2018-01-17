var webpack = require("webpack");
const path = require("path");
var ExtractTextPlugin = require("extract-text-webpack-plugin");
var OpenBrowserPlugin = require("open-browser-webpack-plugin");
var es3ifyPlugin = require("es3ify-webpack-plugin");
var pluginData = [
  new OpenBrowserPlugin({ url: "http://0.0.0.0:8080/demo" }),
  new webpack.ProvidePlugin({
    $: "jquery",
    jQuery: "jquery",
    "window.jQuery": "jquery"
  }),
  new es3ifyPlugin()
];

module.exports = {
  entry: "./src/index.js",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "qiniu.min.js",
    library: "qiniu",
    libraryTarget: "umd",
    publicPath: "/dist/"
  },
  module: {
    loaders: [
      //.css 文件使用 style-loader 和 css-loader 来处理
      {
        test: /\.css$/,
        loader: ExtractTextPlugin.extract("style", "css!sass")
      },
      //.js 文件使用 babel-loader 来编译处理
      {
        test: /\.scss$/,
        loader: ExtractTextPlugin.extract("style", "css!sass", {
          publicPath: "../"
        })
      },
      {
        test: /\.js$/,
        loader: "babel-loader?presets[]=es2015",
        query: {
          presets: ["es2015-loose"]
        }
      },
      //{ test: /\.js$/,loader: 'jsx-loader?harmony' }, { test: /\.gif/, loader: "url-loader?limit=10000&mimetype=image/gif" }
      {
        test: /\.(png|jpg|gif)$/,
        loader: "url-loader?limit=10000&name=img/[hash:8].[name].[ext]"
      }
    ]
  },
  resolve: {
    extensions: [".js", ".jsx"]
  },
  plugins: pluginData,
  devServer: {
    historyApiFallback: true,
    hot: false,
    inline: true,
    host: "0.0.0.0",
    disableHostCheck: true,
    progress: true,
    proxy: {
      "/api/*": {
        target: "http://0.0.0.0:9000",
        changeOrigin: true,
        secure: false
      }
    }
  }
};
