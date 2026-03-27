const path = require('path')
const webpack = require('webpack')
const { HotModuleReplacementPlugin } = webpack
const HtmlWebpackPlugin = require('html-webpack-plugin')
const WebpackBar = require('webpackbar')

const htmlTemp = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title state-data-title="">七牛云 - JS SDK 示例 V3</title>
    <meta name="viewport" content="initial-scale=1.0,width=device-width">
    <link rel="shortcut icon" href="https://qiniu.staticfile.org/favicon.ico" type="image/vnd.microsoft.icon">
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`

module.exports = {
  context: path.join(__dirname, 'src'),
  devtool: 'source-map',

  resolve: {
    extensions: ['.js', '.ts', '.tsx'],
    alias: {
      buffer: require.resolve('buffer/'),
      stream: require.resolve('stream-browserify')
    },
    // Webpack 5 不再默认注入 Node 内置模块；create-hmac / 部分依赖会访问 process、crypto
    fallback: {
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
      buffer: require.resolve('buffer/'),
      process: require.resolve('process/browser')
    }
  },
  entry: {
    main: './index.tsx',
    worker: './upload.worker.ts',
  },
  output: {
    filename: '[name].bundle.js',
    path: path.join(__dirname, 'dist'),
    // Webpack 5 默认 publicPath 为 'auto'，会在运行时解析脚本 URL；
    // 与 defer 的 script 标签组合时，部分浏览器无法解析，会抛
    // "Automatic publicPath is not supported in this browser"，整页白屏。
    publicPath: '/'
  },

  devServer: {
    port: 7777,
    host: '0.0.0.0'
  },

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.less$/,
        use: [
          "style-loader",
          {
            loader: 'css-loader',
            options: {
              modules: {
                localIdentName: '[name]@[local]:[hash:base64:5]'
              }
            }
          },
          "less-loader"
        ]
      },
      {
        test: /\.(png|jpg|gif|svg)$/,
        loader: 'file-loader',
        options: {
          name: 'static/img/[name].[ext]?[hash]',
          esModule: false
        }
      }
    ]
  },

  plugins: [
    // 浏览器里没有全局 process；未注入时会在运行时报 process is not defined，页面白屏
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer']
    }),
    new HtmlWebpackPlugin({
      // 只注入主入口：worker 由 `new Worker('/worker.bundle.js')` 单独加载，不应作为普通脚本执行
      chunks: ['main'],
      inject: 'body',
      templateContent: htmlTemp
    }),
    new HotModuleReplacementPlugin(),
    new WebpackBar()
  ]
}
