var path = require("path");
var es3ifyPlugin = require("es3ify-webpack-plugin");

module.exports = {
  entry: './src/index.ts',
  output: {
    filename: 'qiniu.min.js',
    library: 'qiniu',
    libraryTarget: 'umd',
    path: path.resolve(__dirname, 'dist'),
    publicPath: '/dist/'
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  plugins: [new es3ifyPlugin()], // TODO: 测试完毕后看是否需要
  resolve: {
    extensions: ['.ts', '.js']
  }
}
