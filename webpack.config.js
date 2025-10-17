const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: './src/index.ts',
  mode: 'development',
  devtool: 'source-map',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.[contenthash].js',
    publicPath: './',
    clean: true,
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',
      filename: 'index.html',
      inject: 'body',
    }),
    // Generate 404.html for GitHub Pages SPA fallback
    new HtmlWebpackPlugin({
      template: './src/index.html',
      filename: '404.html',
      inject: 'body',
    }),
    // Copy static assets like favicon and images
    new CopyWebpackPlugin({
      patterns: [
        { from: 'public', to: '.' },
      ],
    }),
    new MiniCssExtractPlugin({
      filename: 'styles.[contenthash].css',
    }),
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),
      watch: true,
    },
    historyApiFallback: true,
    client: { overlay: true },
    watchFiles: ['src/**/*', 'public/**/*'],
    compress: true,
    port: 8080,
    hot: true,
    open: true,
  },
};
