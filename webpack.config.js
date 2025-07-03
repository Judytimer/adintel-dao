const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    mode: isProduction ? 'production' : 'development',
    devtool: isProduction ? 'source-map' : 'cheap-module-source-map',
    
    entry: {
      background: './src/extension/background.ts',
      content: './src/extension/content.ts',
      popup: './src/extension/popup.ts'
    },
    
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      clean: true,
      // Chrome extensions need this format
      chunkFormat: 'array-push',
    },
    
    resolve: {
      extensions: ['.ts', '.js'],
      alias: {
        '@modules': path.resolve(__dirname, 'src/modules'),
        '@extension': path.resolve(__dirname, 'src/extension'),
        '@types': path.resolve(__dirname, 'src/types')
      }
    },
    
    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          use: {
            loader: 'ts-loader',
            options: {
              transpileOnly: !isProduction,
              compilerOptions: {
                sourceMap: true
              }
            }
          }
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader']
        }
      ]
    },
    
    plugins: [
      new CopyWebpackPlugin({
        patterns: [
          {
            from: 'src/extension/manifest.json',
            to: 'manifest.json'
          },
          {
            from: 'src/extension/popup.html',
            to: 'popup.html'
          },
          {
            from: 'shared-code/chrome-extension-base/assets',
            to: 'assets'
          }
        ]
      })
    ],
    
    optimization: {
      minimize: isProduction,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            compress: {
              drop_console: isProduction,
              drop_debugger: isProduction,
            },
            format: {
              comments: false,
            },
          },
          extractComments: false,
        }),
      ],
      // Don't split chunks for chrome extensions
      splitChunks: false,
      // Keep runtime in each chunk for chrome extensions
      runtimeChunk: false,
    },
    
    // Chrome extension specific settings
    performance: {
      hints: false, // Chrome extensions have their own size limits
    },
    
    watch: !isProduction,
    watchOptions: {
      ignored: /node_modules/
    }
  };
};