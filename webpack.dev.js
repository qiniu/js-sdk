const merge = require('webpack-merge')
const path = require('path')
const common = require('./webpack.common.js')

module.exports = merge(common, {
  mode: "development",
  devServer: {
    disableHostCheck: true,
    progress: true,
    hot: false,
    proxy: {
      '/api/*': {
        target: 'http://0.0.0.0:9000',
        changeOrigin: true,
        secure: false
      }
    },
    host: '0.0.0.0',
    contentBase: path.join(__dirname, './'),
    publicPath: '/dist/',
    inline: false
  }
})
