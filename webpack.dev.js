const merge = require('webpack-merge')
const path = require('path')
const common = require('./webpack.common.js')

module.exports = merge(common, {
  mode: "development",
  entry: './src/index.ts',
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  output: {
    filename: 'qiniu.min.js',
    library: 'qiniu',
    libraryTarget: 'umd',
    path: path.resolve(__dirname, 'webpack'),
  },
  devServer: {
    disableHostCheck: true,
    progress: true,
    hot: true,
    proxy: {
      '/api/*': {
        target: 'http://0.0.0.0:9000',
        changeOrigin: true,
        secure: false
      }
    },
    host: '0.0.0.0',
    contentBase: path.join(__dirname, './'),
    publicPath: '/webpack/',
    inline: false
  }
})
