/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const packageJson = require('./package.json');
const webpack = require('webpack');
const CopyPlugin = require('copy-webpack-plugin');
const ZipPlugin = require('zip-webpack-plugin');

module.exports = (env = {}, argv) => {
  const isDev = argv.mode === 'development';
  const browser = env.browser === 'firefox' ? 'firefox' : 'chrome';
  const isFirefox = browser === 'firefox';

  console.log(`Building for: ${browser} (${isDev ? 'development' : 'production'})`);

  // Chrome needs the offscreen entry point; Firefox does not.
  const entry = {
    worker:  './src/background/worker.ts',
    popup:   './src/ui/popup.ts',
    options: './src/ui/options.ts',
    ...(!isFirefox && { offscreen: './src/ui/offscreen.ts' }),
  };

  // Pick the right manifest depending on the target browser.
  const manifestSrc = isFirefox ? 'src/manifest.firefox.json' : 'src/manifest.chrome.json';

  const copyPatterns = [
    {
      from: manifestSrc,
      to: 'manifest.json',
      transform(content) {
        const manifest = JSON.parse(content.toString());
        manifest.version = packageJson.version;
        return JSON.stringify(manifest, null, 2);
      },
    },
    { from: 'src/_locales', to: '_locales' },
    { from: 'src/skin',     to: 'skin' },
    { from: 'src/ui/popup.html',   to: 'popup.html' },
    { from: 'src/ui/options.html', to: 'options.html' },
    { from: 'src/license.txt',     to: 'license.txt' },
    // offscreen.html only needed for Chrome
    ...(!isFirefox ? [{ from: 'src/ui/offscreen.html', to: 'offscreen.html' }] : []),
  ];

  const zipFilename = `ZimbraMailNotifier-v${packageJson.version}-${browser}.zip`;

  return {
    entry,
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
      // Expose the target browser to the TypeScript source so runtime
      // feature detection can be double-checked at build time if needed.
      new webpack.DefinePlugin({
        'process.env.TARGET_BROWSER': JSON.stringify(browser),
      }),
      new CopyPlugin({ patterns: copyPatterns }),
      ...(!isDev
        ? [
            new ZipPlugin({
              filename: zipFilename,
              path: '../release',
              exclude: [/\.DS_Store$/, /__MACOSX/, /\.map$/],
            }),
          ]
        : []),
    ],
    devtool: isDev ? 'cheap-source-map' : false,
    optimization: {
      minimize: !isDev,
    },
  };
};
