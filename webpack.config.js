'use strict'

const path = require('path')
const webpack = require('webpack')

module.exports = {
    entry: './lib/index.js',
    output: {
        filename: 'client.js',
        path: path.resolve(__dirname, 'bin')
    },
    module: {
        loaders: [
            {
                test: /\.js$/,
                exclude: /(node_modules|bower_components)/,
                loader: 'babel-loader',
                query: {
                    presets: ['es2015']
                }
            }
        ]
    },
    resolve: {
        alias: {
            'engine.io-client': path.resolve(__dirname, 'browser/engine.io.js')
        }
    },

    plugins: [
        new webpack.LoaderOptionsPlugin({minimize: true}),
        new webpack.optimize.UglifyJsPlugin({
            compress: {
                warnings: false
            }
        })
    ]
}
