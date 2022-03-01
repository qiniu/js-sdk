const path = require('path')
const { HotModuleReplacementPlugin } = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const ESLintPlugin = require('eslint-webpack-plugin')
const WebpackBar = require('webpackbar')

const htmlTemp = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title state-data-title="">七牛云 - JS SDK 示例 V3</title>
    <meta name="viewport" content="initial-scale=1.0,width=device-width">
    <link rel="shortcut icon" href="https://qiniu.staticfile.org/favicon.ico" type="image/vnd.microsoft.icon">
    <script src="//cdn.jsdelivr.net/npm/eruda"></script>
    <script>eruda.init();</script>
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
  entry: ['./index.tsx'],

  output: {
    filename: 'bundle.js',
    path: path.join(__dirname, 'dist')
  },

  devServer: {
    port: 7777,
    inline: true,
    host: '0.0.0.0',
    stats: 'errors-only',
    contentBase: './dist'
  },

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        loader: 'esbuild-loader',
        options: {
          loader: 'tsx',
          target: 'es2015',
          tsconfigRaw: require('./tsconfig.json')
        }
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
      templateContent: htmlTemp,
      inject: 'head'
    }),
    new HotModuleReplacementPlugin(),
    new ESLintPlugin(),
    new WebpackBar()
  ]
}
