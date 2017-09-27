var path = require('path');
var webpack = require('webpack');
var OpenBrowserPlugin = require('open-browser-webpack-plugin');


module.exports = {
    entry: path.resolve(__dirname, 'src/qiniu.js'),
    output: {
        path: path.resolve(__dirname, 'dist/'),
        filename: 'qiniu.min.js',
    },
    plugins: [
        new webpack.optimize.UglifyJsPlugin({
            compress: {
                warnings: false
            }
        }),
        //new OpenBrowserPlugin({url: 'http://localhost:7777/'})
    ]
};
