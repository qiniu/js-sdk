const path = require('path')
const { HotModuleReplacementPlugin } = require('webpack')
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
      buffer: require.resolve("buffer/"),
      stream: require.resolve("stream-browserify")
    },
  },
  entry: {
    main: './index.tsx',
    worker: './upload.worker.ts',
  },
  output: {
    filename: '[name].bundle.js',
    path: path.join(__dirname, 'dist')
  },

  devServer: {
    port: 7777,
    host: '0.0.0.0',
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
    new HtmlWebpackPlugin({
      inject: 'head',
      templateContent: htmlTemp
    }),
    new HotModuleReplacementPlugin(),
    new WebpackBar()
  ]
}
