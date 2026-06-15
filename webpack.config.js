/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const packageJson = require('./package.json');
const webpack = require("webpack");
const CopyPlugin = require('copy-webpack-plugin');
const ZipPlugin = require('zip-webpack-plugin');

module.exports = (env, argv) => {
  const isDev = argv.mode === 'development';

  return {
    entry: {
      worker: './src/background/worker.ts',
      popup: './src/ui/popup.ts',
      options: './src/ui/options.ts',
      offscreen: './src/ui/offscreen.ts',
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'js/[name].js',
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
          use: ['style-loader', 'css-loader'],
        },
      ],
    },
    plugins: [
      new CopyPlugin({
        patterns: [
          {
            from: 'src/manifest.json', to: 'manifest.json', transform(content) {
              const manifest = JSON.parse(content.toString());
              manifest.version = packageJson.version;
              return JSON.stringify(manifest, null, 2);
            }
          },
          { from: 'src/_locales', to: '_locales' },
          { from: 'src/skin', to: 'skin' },
          { from: 'src/ui/popup.html', to: 'popup.html' },
          { from: 'src/ui/options.html', to: 'options.html' },
          { from: 'src/ui/offscreen.html', to: 'offscreen.html' },
          { from: 'src/license.txt', to: 'license.txt' },
        ],
      }),
      ... isDev ? [] : [new ZipPlugin({
        filename: `ZimbraMailNotifier-v${packageJson.version}.zip`,
        path: '../release',
        exclude: [
          /\.DS_Store$/,
          /__MACOSX/,
        ]
      })]
    ],
    devtool: isDev ? 'cheap-source-map' : false,
    optimization: {
      minimize: !isDev,
    },
  };
};
