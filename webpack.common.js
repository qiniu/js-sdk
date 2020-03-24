var path = require("path");
module.exports = {
  entry: "./src/index.ts",
  output: {
    filename: "qiniu.min.js",
    library: "qiniu",
    libraryTarget: "umd",
    path: path.resolve(__dirname, "dist"),
    publicPath: __dirname + "/dist/"
  },
  module: {
    rules: [
      {
        test: /\.ts?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.js']
  }
}
