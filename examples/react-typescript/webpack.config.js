const path = require('path')
const qiniu = require('qiniu')
const { HotModuleReplacementPlugin } = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const ESLintPlugin = require('eslint-webpack-plugin')
const WebpackBar = require('webpackbar')

module.exports = {
  context: path.join(__dirname, 'src'),
  devtool: 'source-map',

  resolve: {
    extensions: ['.js', '.ts', '.tsx'],
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
    contentBase: './dist',
    before: function (app) {
      app.get('/api/token', function (req, res) {
        const dataString = decodeURIComponent(req.query.setting)
        const { assessKey, secretKey, bucketName, deadline } = JSON.parse(dataString)
        const putPolicy = new qiniu.rs.PutPolicy({ scope: bucketName, deadline })
        var mac = new qiniu.auth.digest.Mac(assessKey, secretKey)
        res.send(putPolicy.uploadToken(mac))
      })
    }
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
      templateContent: '<!DOCTYPE html><html><body><div id="root"></div></body></html>',
      inject: 'head'
    }),
    new HotModuleReplacementPlugin(),
    new ESLintPlugin(),
    new WebpackBar()
  ]
}
