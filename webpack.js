var path = require("path")
var webpack = require("webpack")
var TerserPlugin = require('terser-webpack-plugin')

const mode = process.env.NODE_ENV // production、development
const target = process.env.TARGET // browser、miniprogram

const common = {
  mode,
  entry: './src/index.ts',
  resolve: {
    extensions: ['.ts', '.js']
  }
}

if (mode === 'development') {
  common.module = {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  }
  common.output = {
    filename: 'qiniu.min.js',
    library: 'qiniu',
    libraryTarget: 'umd',
    path: path.resolve(__dirname, 'webpack'),
  }
  common.devServer = {
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
}

if (mode === 'production') {
  common.devtool = "source-map"
  common.entry = './lib/index.js'

  if (target === 'browser') {
    common.output = {
      filename: 'qiniu.min.js',
      library: 'qiniu',
      libraryTarget: 'umd',
      path: path.resolve(__dirname, 'dist'),
      publicPath: '/dist/'
    }
  }

  if (target === 'miniprogram') {
    common.output = {
      filename: 'index.js',
      library: 'qiniu',
      libraryTarget: 'umd',
      path: path.resolve(__dirname, 'mp'),
      publicPath: '/mp/'
    }
  }

  common.optimization = {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        cache: true,
        parallel: true,
        sourceMap: true
      })
    ]
  },
    common.plugins = [
      new webpack.DefinePlugin({
        "process.env.NODE_ENV": JSON.stringify("production")
      })
    ]
}

module.exports = common
