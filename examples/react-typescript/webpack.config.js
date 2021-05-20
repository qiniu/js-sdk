const path = require('path')
const qiniu = require('qiniu')
const { HotModuleReplacementPlugin } = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const ESLintPlugin = require('eslint-webpack-plugin')

module.exports = {
  context: path.join(__dirname, 'src'),
  devtool: 'source-map',

  resolve: {
    extensions: ['.js', '.ts', '.tsx'],
  },
  entry: ['@babel/polyfill', './index.tsx'],

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
        const { assessKey, secretKey, bucketName, deadline } = JSON.parse(req.query.setting)
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
        loader: 'babel-loader',
        options: {
          presets: [
            '@babel/preset-env',
            '@babel/preset-react',
            '@babel/preset-typescript'
          ]
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
    new ESLintPlugin()
  ]
}
