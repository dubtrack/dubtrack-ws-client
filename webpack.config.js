'use strict'

const path = require('path')
const webpack = require('webpack')

module.exports = {
    entry: './lib/index.js',
    output: {
        filename: 'client.js',
        path: path.resolve(__dirname, 'bin')
    },
    externals: {
        global: glob()
    },
    module: {
        loaders: [
            {
                test: /\.js$/,
                exclude: /(node_modules|bower_components|browser)/,
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

/**
 * Populates `global`.
 *
 * @api private
 */

function glob() {
    return 'typeof self !== "undefined" ? self : ' +
      'typeof window !== "undefined" ? window : ' +
      'typeof global !== "undefined" ? global : {}';
}
