var path = require('path');
var webpack = require('webpack');
var OpenBrowserPlugin = require('open-browser-webpack-plugin');


module.exports = {
    entry: path.resolve(__dirname, 'src/qiniu-module.js'),
    output: {
        path: path.resolve(__dirname, 'example/dist/'),
        filename: 'qiniu.js',
    },
    plugins: [
        new webpack.optimize.UglifyJsPlugin({
            compress: {
                warnings: false
            }
        }),
        new OpenBrowserPlugin({url: 'http://localhost:7777/'})
    ]
};