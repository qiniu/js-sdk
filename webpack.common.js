var path = require("path");
var es3ifyPlugin = require("es3ify-webpack-plugin");

module.exports = {
  entry: "./src/index.js",
  output: {
    filename: "qiniu.min.js",
    library: "qiniu",
    libraryTarget: "umd",
    path: path.resolve(__dirname, "dist"),
    publicPath: "/dist/"
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader"
        }
      }
    ]
  },
  plugins: [new es3ifyPlugin()]
};
