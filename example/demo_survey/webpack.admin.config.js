const fs                      = require('fs');
const path                    = require('path');
const webpack                 = require('webpack');
const MiniCssExtractPlugin    = require("mini-css-extract-plugin");
const CopyWebpackPlugin       = require('copy-webpack-plugin');
const HtmlWebpackPlugin       = require('html-webpack-plugin');
const { CleanWebpackPlugin }  = require("clean-webpack-plugin");
const CompressionPlugin       = require('compression-webpack-plugin');

require('chaire-lib-backend/lib/config/dotenv.config');

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

const configuration = require('chaire-lib-backend/lib/config/server.config');
const config = configuration.default ? configuration.default : configuration;

// Public directory from which files are served
const publicDirectory = path.join(__dirname, '..', '..', 'public');
const bundleOutputPath = path.join(publicDirectory, 'dist', config.projectShortname, 'admin');

const appIncludeName = 'survey';

module.exports = (env) => {
  console.log(`building js for project ${config.projectShortname}`);
  
  const isProduction = env === 'production';
  console.log('process.env.NODE_ENV', process.env.NODE_ENV);

  const languages = config.languages || ['fr', 'en'];
  const momentLanguagesFilter = `/${languages.join("|")}/`;

  const entryFileName =  './lib/admin/app-admin.js';
  const customStylesFilePath  = `${__dirname}/lib/styles/styles.scss`;
  const customLocalesFilePath = `${__dirname}/locales`;
  const entry                 = [entryFileName, customStylesFilePath];
  const includeDirectories    = [
    path.join(__dirname, 'lib', 'admin'),
    path.join(__dirname, 'lib', 'survey'),
    
    path.join(__dirname, 'locales'),
    path.join(__dirname, 'assets')
  ];

  return {
    node: {
        Buffer: false,
        process: true,
    },
    mode: process.env.NODE_ENV,
    entry: entry,
    output: {
      path: bundleOutputPath,
      filename: isProduction ? `survey-admin-${config.projectShortname}-bundle-${env}.[contenthash].js` : `survey-admin-${config.projectShortname}-bundle-${env}.dev.js`,
      publicPath: '/dist/'
    },
    watchOptions: {
      ignored: ['node_modules/**'],
      aggregateTimeout: 600
    },
    module: {
      rules: [
        {
          loader: 'babel-loader',
          test: /\.jsx?$/,
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react'],
          },
          include: includeDirectories
        },
        {
          use: 'json-loader',
          test: /\.geojson$/,
          include: includeDirectories
        },
        { 
          test: /\.(ttf|woff2|woff|eot|svg)$/,
          loader: 'url-loader',
          options: {
            limit: 100000
          }
        },
        {
          test: /\.glsl$/,
          use: 'ts-shader-loader'
        },
        {
          test: /\.s?css$/,
          use: [
            MiniCssExtractPlugin.loader,
            {
              loader: 'css-loader',
              options: {
                sourceMap: true
              }
            },
            {
              loader: 'sass-loader',
              options: {
                sourceMap: true,
              }
            }
          ]
        },
        {
          test: /locales/,
          loader: '@alienfast/i18next-loader',
          options: { 
            basenameAsNamespace: true,
            overrides: (fs.existsSync(customLocalesFilePath) ? [customLocalesFilePath] : [])
          }
        },
        {
            test: /\.js$/,
            enforce: 'pre',
            loader: 'source-map-loader',
            include: includeDirectories
        },
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
          include: ["/node_modules/evolution-frontend/src", "/node_modules/evolution-common/src"]
        },
      ]
    },
    plugins: [
      new CleanWebpackPlugin({
        dry: !isProduction,
        verbose: true,
        cleanAfterEveryBuildPatterns: ['**/*', '!images/**', '!*.html'],
      }),
      new HtmlWebpackPlugin({
        title: process.env.DEFAULT_TITLE || 'Evolution - Admin',
        noindex: true, // we should never index the admin dashboard
        filename: path.join(`index-survey-${config.projectShortname}${env === 'test' ? `_${env}` : ''}.html`),
        template: path.join(__dirname, '..', '..', 'public', 'index.html'),
      }),
      new MiniCssExtractPlugin({
        filename: isProduction ? `survey-${config.projectShortname}-styles.[contenthash].css` : `survey-${config.projectShortname}-styles.dev.css`//,
      }),
      new webpack.DefinePlugin({
        'process.env': {
          'IS_BROWSER'                  : JSON.stringify(true),
          'HOST'                        : JSON.stringify(process.env.HOST),
          'TRROUTING_HOST'              : JSON.stringify(process.env.TRROUTING_HOST),
          'APP_NAME'                    : JSON.stringify(appIncludeName),
          'PROJECT_SHORTNAME'           : JSON.stringify(config.projectShortname),
          'PROJECT_SOURCE'              : JSON.stringify(process.env.PROJECT_SOURCE),
          'NODE_ENV'                    : JSON.stringify(process.env.NODE_ENV),
          'IS_TESTING'                  : JSON.stringify(env === 'test'),
          'GOOGLE_API_KEY'              : JSON.stringify(process.env.GOOGLE_API_KEY),
          'MAPBOX_ACCESS_TOKEN'         : JSON.stringify(process.env.MAPBOX_ACCESS_TOKEN),
          'MAPBOX_USER_ID'              : JSON.stringify(process.env.MAPBOX_USER_ID || config.mapboxUserId),
          'MAPBOX_STYLE_ID'             : JSON.stringify(process.env.MAPBOX_STYLE_ID || config.mapboxStyleId),
          'PROJECT_SAMPLE'              : JSON.stringify(process.env.PROJECT_SAMPLE),
          'MAILCHIMP_API_KEY'           : JSON.stringify(process.env.MAILCHIMP_API_KEY),
          'MAILCHIMP_LIST_ID'           : JSON.stringify(process.env.MAILCHIMP_LIST_ID),
          'PHOTON_OSM_SEARCH_API_URL'   : JSON.stringify(process.env.PHOTON_OSM_SEARCH_API_URL)

        },
        '__CONFIG__': JSON.stringify({
            ...config
        })
      }),
      new webpack.optimize.AggressiveMergingPlugin(),//Merge chunks 
      new CompressionPlugin({
        filename: "[path].gz[query]",
        algorithm: "gzip",
        test: /\.js$|\.css$/,
        threshold: 0,
        minRatio: 0.8
      }),
      new webpack.ContextReplacementPlugin(/moment[\/\\]locale$/, new RegExp(momentLanguagesFilter)),
      new CopyWebpackPlugin(
        {
          patterns: [
            {
              context: path.join(__dirname, '..', '..', 'node_modules', 'evolution-frontend', 'lib', 'assets'),
              from: "**/*",
              to: "",
              noErrorOnMissing: true
            },
            {
              context: path.join(__dirname, '..', '..', 'node_modules', 'evolution-legacy', 'lib', 'assets'),
              from: "**/*",
              to: "",
              noErrorOnMissing: true
            },
            { 
              context: path.join(__dirname, 'assets',),
              from: "**/*",
              to: "",
              noErrorOnMissing: true
            }
          ]
        }
      )
    ],
    resolve: {
      modules: ['node_modules'],
      extensions: ['.json', '.js', '.jsx', '.css', '.scss', '.ts', '.tsx'],
    },
    devtool: isProduction ? 'cheap-source-map' : 'eval-source-map',
    devServer: {
      contentBase: publicDirectory,
      historyApiFallback: true,
      publicPath: '/dist/' + config.projectShortname
    }
  };
};
