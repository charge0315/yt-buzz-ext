const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const ZipPlugin = require('zip-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    mode: isProduction ? 'production' : 'development',
    devtool: isProduction ? false : 'inline-source-map',
    entry: {
      background: './src/background.new.js',
      popup: './src/popup.js',
      options: './src/options.js',
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      clean: true,
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                [
                  '@babel/preset-env',
                  {
                    targets: {
                      chrome: '88',
                    },
                  },
                ],
              ],
            },
          },
        },
      ],
    },
    plugins: [
      new CopyPlugin({
        patterns: [
          {
            from: 'manifest.json',
            to: 'manifest.json',
            transform(content) {
              const manifest = JSON.parse(content);
              // Update background script path in manifest
              manifest.background.service_worker = 'background.js';
              return JSON.stringify(manifest, null, 2);
            },
          },
          { from: 'public', to: 'public' },
          { from: '_locales', to: '_locales' },
          { from: 'README.md', to: 'README.md' },
        ],
      }),
      ...(isProduction
        ? [
            new ZipPlugin({
              path: path.resolve(__dirname, 'dist'),
              filename: 'yt-buzz-ext.zip',
            }),
          ]
        : []),
    ],
    optimization: {
      minimize: isProduction,
    },
    resolve: {
      extensions: ['.js'],
    },
  };
};
