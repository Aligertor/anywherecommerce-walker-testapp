var merge = require('webpack-merge');
var path = require('path');
var webpack = require('webpack');

var common = require('./webpack.config.js');

var ROOT_PATH = path.resolve(__dirname);

module.exports = merge(common, {
  entry: {
    app: path.resolve(ROOT_PATH, 'src/app/index.jsx')
  },
  output: {
    path: path.resolve(ROOT_PATH, 'www'),
    filename: 'bundle.js'
  },
  devtool: 'source-map',
  plugins: [
    new webpack.DefinePlugin({
      'process.env': {
        'NODE_ENV': JSON.stringify('production')
      }
    }),
    new webpack.optimize.UglifyJsPlugin({
      compress: {
        warnings: false
      }
    }),
    new webpack.optimize.DedupePlugin()
  ]
});