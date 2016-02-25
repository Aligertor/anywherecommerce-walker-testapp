var webpackConfig = require('./webpack.config.js');
var ExtractTextPlugin = require('extract-text-webpack-plugin');
// Karma configuration
// Generated on Thu Nov 06 2014 14:10:34 GMT+0100 (Mitteleuropäische Zeit)

module.exports = function(config) {
    config.set({

        // base path that will be used to resolve all patterns (eg. files, exclude)
        basePath: '',

        // How long does Karma wait for a browser to reconnect (in ms).
        browserDisconnectTimeout: 61000,

        // How long will Karma wait for a message from a browser before disconnecting from it (in ms).
        browserNoActivityTimeout: 61000,

        // frameworks to use
        // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
        frameworks: ['jasmine'],


        // list of files / patterns to load in the browser
        files: [
             {pattern: 'src/app/assets/images/*.png', watched: false, included: false, served: true},
            'src/test/tests.bundle.js'
        ],

        proxies: {
            '/img/': '/src/app/assets/images/'
        },


        // list of files to exclude
        exclude: [],


        // preprocess matching files before serving them to the browser
        // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
        preprocessors: {
            'src/test/tests.bundle.js': ['webpack']
        },

        webpack: {
            devtool: 'inline-source-map',
            progress: true,
            module: {
                loaders: [
                    {
                        exclude: /node_modules/,
                        loader: 'babel-loader',
                        test: /\.(js|jsx)$/,
                    },
                    {
                        test: /\.(png|jpg)$/,
                        loader: 'url-loader?limit=8192'
                    },
                    {
                        test: /\.(jpe|jpg|gif|woff|woff2|eot|ttf|svg)(\?.*$|$)/,
                        loader: 'file'
                    },
                    {
                        test: /\.css$/,
                        loader: ExtractTextPlugin.extract('style-loader', 'css-loader')
                    },
                    {
                        test: /\.scss$/,
                        loader: ExtractTextPlugin.extract('css!sass')
                    }
                ],
            },
            plugins: [
                new ExtractTextPlugin('style.css', {
                  allChunks: true
                })
            ]
        },


        // test results reporter to use
        // possible values: 'dots', 'progress'
        // available reporters: https://npmjs.org/browse/keyword/karma-reporter
        reporters: ['progress'],


        // web server port
        port: 9876,


        // enable / disable colors in the output (reporters and logs)
        colors: true,


        // level of logging
        // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
        logLevel: config.LOG_INFO,


        // enable / disable watching file and executing tests whenever any file changes
        autoWatch: true,


        // start these browsers
        // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
        browsers: ['Chrome_unsecure'],


        // Continuous Integration mode
        // if true, Karma captures browsers, runs the tests and exits
        singleRun: true,


        // Customized launcher
        customLaunchers: {
            Chrome_unsecure: {
                base: 'Chrome',
                flags: ['--disable-web-security']
            }
        }

    }); //config.set
}; // module.exports