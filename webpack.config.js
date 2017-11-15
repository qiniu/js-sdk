var path = require('path');
var webpack = require('webpack');


module.exports = {
    entry: path.resolve(__dirname, 'src/qiniu.js'),
    output: {
        path: path.resolve(__dirname, 'dist/'),
        filename: 'qiniu.min.js',
    },
    devtool: 'inline-source-map',
    plugins: [
        new webpack.optimize.UglifyJsPlugin({
            compress: {
                warnings: false
            }
        }),
    ]
};
