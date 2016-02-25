var path = require('path');
var webpack = require('webpack');
var ExtractTextPlugin = require('extract-text-webpack-plugin');
var HtmlWebpackPlugin = require('html-webpack-plugin');

var ROOT_PATH = path.resolve(__dirname);
var nodeModulesDir = path.join(ROOT_PATH, 'node_modules');

//Common configuration settings
module.exports = {
  entry: [path.resolve(ROOT_PATH, 'src/app/index.jsx')],
  resolve: {
    extensions: ['', '.js', '.jsx'],
    modulesDirectories: ['node_modules'],
    alias: {
      i18next: 'i18next/lib/index.js'
    }
  },
  output: {
    path: path.resolve(ROOT_PATH, 'www'),
    filename: 'bundle.js'
  },
  module: {
    loaders: [
      {
        test: /\.(js|jsx)$/,
        loader: 'babel?optional[]=runtime&stage=0',
        include: path.resolve(ROOT_PATH, 'src/app')
      },
      {
        test: /\.json/,
        loader: 'json-loader'
      },
      {
        test: /\.png.*$/,
        loaders: ['url-loader?limit=100000&mimetype=image/png'],
        exclude: /node_modules/
      },
      {
          test: /\.css$/,
          loader: ExtractTextPlugin.extract('style-loader', 'css-loader')
      },
      {
        test: /\.scss$/,
        loader: ExtractTextPlugin.extract('css!sass')
      },
      {
        test: /\.(jpe|jpg|gif|woff|woff2|eot|ttf|svg)(\?.*$|$)/,
        loader: 'file'
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
     template: './index.html',
     inject: 'body'
    }),
    new ExtractTextPlugin('style.css', {
      allChunks: true
    })
  ]
};
