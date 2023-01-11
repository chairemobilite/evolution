const fs                      = require('fs');
const path                    = require('path');
const webpack                 = require('webpack');
const MiniCssExtractPlugin    = require("mini-css-extract-plugin");
const CopyWebpackPlugin       = require('copy-webpack-plugin');
const HtmlWebpackPlugin       = require('html-webpack-plugin');
const { CleanWebpackPlugin }  = require("clean-webpack-plugin");
//const UglifyJsPlugin         = require('uglifyjs-webpack-plugin');
const CompressionPlugin       = require('compression-webpack-plugin');
//const WebpackCdnPlugin        = require('webpack-cdn-plugin');
//const HtmlWebpackPrefixPlugin = require('html-webpack-prefix-plugin');

require('chaire-lib-backend/lib/config/dotenv.config');

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

const configuration = require('chaire-lib-backend/lib/config/server.config');
const config = configuration.default ? configuration.default : configuration;

const appIncludeName = 'survey';

module.exports = (env) => {
  console.log(`building js for project ${config.projectShortname}`);
  
  const isProduction = env === 'production';
  console.log('process.env.NODE_ENV', process.env.NODE_ENV);

  const languages = config.languages || ['fr', 'en'];
  const momentLanguagesFilter = `/${languages.join("|")}/`;

  // TODO For now, expect the custom files to be in the example, but it won't be the case for long, the project will do the webpack or add a config
  const customStylesFilePath  = path.join(__dirname, '..', '..', 'example', config.projectShortname, `src`, `styles`, `styles.scss`);
  const customLocalesFilePath = path.join(__dirname, '..', '..', 'example', config.projectShortname, `locales`);
  const entryFileName =  './app-survey.js';
  const entry                 = fs.existsSync(customStylesFilePath) ? [entryFileName, customStylesFilePath] : [entryFileName];
  const includeDirectories    = [
    path.join(__dirname, 'src', 'config', 'shared'),
    path.join(__dirname, 'src', 'actions', 'shared'),
    path.join(__dirname, 'src', 'components', 'shared'),
    path.join(__dirname, 'src', 'helpers', 'shared'),
    path.join(__dirname, 'src', 'routers', 'shared'),
    path.join(__dirname, 'src', 'store', 'shared'),

    path.join(__dirname, 'src', 'config', 'admin'),
    path.join(__dirname, 'src', 'actions', 'admin'),
    path.join(__dirname, 'src', 'components', 'admin'),
    path.join(__dirname, 'src', 'helpers', 'admin'),
    path.join(__dirname, 'src', 'reducers', 'admin'),
    path.join(__dirname, 'src', 'routers', 'admin'),
    path.join(__dirname, 'src', 'store', 'admin'),

    path.join(__dirname, 'src', 'config', appIncludeName),
    path.join(__dirname, 'src', 'actions', appIncludeName),
    path.join(__dirname, 'src', 'components', appIncludeName),
    path.join(__dirname, 'src', 'helpers', appIncludeName),
    path.join(__dirname, 'src', 'reducers', appIncludeName),
    path.join(__dirname, 'src', 'routers', appIncludeName),
    path.join(__dirname, 'src', 'store', appIncludeName),

    path.join(__dirname, `app-${appIncludeName}.js`),
    path.join(__dirname, '..', '..', 'locales')
  ];

  if (config.projectShortname !== 'demo_survey')
  {
    includeDirectories.push(path.join(__dirname, '..', '..', 'example', 'demo_survey', 'src'));
  }
  includeDirectories.push(path.join(__dirname, '..', '..', 'example', config.projectShortname, 'src'));
  includeDirectories.push(path.join(__dirname, '..', '..', 'example', config.projectShortname, 'locales'));
  includeDirectories.push(path.join(__dirname, '..', '..', 'example', config.projectShortname, 'assets'));

  return {

    mode: process.env.NODE_ENV,
    entry: entry,
    output: {
      path: path.join(__dirname, '..', '..', 'public', 'dist', config.projectShortname),
      filename: isProduction ? `survey-${config.projectShortname}-bundle-${env}.[contenthash].js` : `survey-${config.projectShortname}-bundle-${env}.dev.js`,
      publicPath: '/dist/'
    },
    watchOptions: {
      ignored: ['node_modules/**'],
      aggregateTimeout: 600
    },
    //externals: { knex: 'commonjs knex' },
    module: {
      //loaders: [{
      //    // use `test` to split a single file
      //    // or `include` to split a whole folder
      //  test: /.*/,
      //    include: [path.resolve(__dirname, 'survey')],
      //    loader: 'bundle?lazy&name=survey'
      //}],
      rules: [
        {
          loader: 'babel-loader',
          test: /\.jsx?$/,
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react'],
            //plugins: ["@babel/plugin-transform-spread"]
          },
          include: includeDirectories
          //exclude: excludeDirectories
        },
        {
          loader: 'json-loader',
          test: /\.geojson$/,
          //options: {
            //presets: ['@babel/preset-env', '@babel/preset-react'],
            //plugins: ["@babel/plugin-transform-spread"]
          //},
          include: includeDirectories
          //exclude: excludeDirectories
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
          loader: 'webpack-glsl-loader'
        },
        {
          test: /\.s?css$/,
          use: [
            MiniCssExtractPlugin.loader,
            {
              loader: 'css-loader',
              options: {
                sourceMap: true//,
                //limit: 100000
              }
            },
            {
              loader: 'sass-loader',
              options: {
                //data: "$projectShortname: " + config.projectShortnames + ";",
                sourceMap: true,
                //limit: 100000
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
          include: ["/node_modules/transition-frontend/src", "/node_modules/transition-common/src"]
        },
      ]
    },
    //optimization: {
    //  minimizer: [
    //    new UglifyJsPlugin({
    //      test: /\.js($|\?)/i,
    //      uglifyOptions: {
    //        compress: true,
    //        mangle: true
    //      }
    //    })
    //  ]
    //},
    plugins: [
      new CleanWebpackPlugin({
        dry: !isProduction,
        verbose: true,
        //cleanStaleWebpackAssets: true,
        //cleanOnceBeforeBuildPatterns: ['**/*', '!images/**', '!*.html'],
        cleanAfterEveryBuildPatterns: ['**/*', '!images/**', '!*.html'],
      }),
      new HtmlWebpackPlugin({
        filename: path.join(`index-survey-${config.projectShortname}${env === 'test' ? `_${env}` : ''}.html`),
        template: path.join(__dirname, '..', '..', 'public', 'index.html'),
        //prefix: 'https://cdn.com'//,
        //chunks: ['main']
        //CDN: "http://blabla.cdn"
      }),
      //new HtmlWebpackPrefixPlugin(),
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
      //new WebpackCdnPlugin({
      //  modules: [
      //    {
      //      name: 'react'
      //    }
      //  ],
      //  publicPath: '/node_modules'
      //}),
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
              context: path.join(__dirname, '..', 'node_modules', 'evolution-frontend', 'lib', 'assets'),
              from: "**/*",
              to: "",
              noErrorOnMissing: true
            },
            { 
              context: path.join(__dirname, 'src', 'assets', 'shared'),
              from: "**/*",
              to: "",
              noErrorOnMissing: true
            },
            {
              context: path.join(__dirname, 'src', 'assets', appIncludeName),
              from: "**/*",
              to: "",
              noErrorOnMissing: true
            },
            {
              context: path.join(__dirname, '..', '..', 'example', config.projectShortname, 'assets'),
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
      //alias: {
      //  reactSelectize: path.join(__dirname, '/node_modules/react-selectize/themes'),
      //}
    },
    devtool: isProduction ? 'cheap-source-map' : 'eval-source-map',
    devServer: {
      contentBase: path.join(__dirname, '..', '..', 'public'),
      historyApiFallback: true,
      publicPath: '/dist/' + config.projectShortname
    }
  };
};
