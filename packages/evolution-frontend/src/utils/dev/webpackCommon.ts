/*
 * Copyright 2026, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import fs from 'fs';
import path from 'path';
// eslint-disable-next-line n/no-unpublished-import
import type { Configuration, WebpackPluginInstance } from 'webpack';
// eslint-disable-next-line n/no-unpublished-import
import webpack from 'webpack';
// eslint-disable-next-line n/no-unpublished-import
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
// eslint-disable-next-line n/no-unpublished-import
import CopyWebpackPlugin from 'copy-webpack-plugin';
// eslint-disable-next-line n/no-unpublished-import
import HtmlWebpackPlugin from 'html-webpack-plugin';
// eslint-disable-next-line n/no-unpublished-import
import { CleanWebpackPlugin } from 'clean-webpack-plugin';
// eslint-disable-next-line n/no-unpublished-import
import CompressionPlugin from 'compression-webpack-plugin';

export type ParticipantWebpackConfigParams = CommonWebpackConfigParams & {
    /** The path to the participant app's entry file */
    participantEntryFile: string;
    /** The path to the survey-ended entry file. Leave undefined if no survey end date */
    surveyEndedEntryFile?: string;
    /** The custom style file path */
    customStylesFilePath: string;
    /** Extra environment variables to be injected into the build: they will be available in the build using `process.env` */
    extraEnvs?: Record<string, unknown>;
};

export type AdminWebpackConfigParams = CommonWebpackConfigParams & {
    /** The path to the admin app's entry file */
    adminEntryFile: string;
    /** The custom style file path */
    customStylesFilePath: string;
    /** Extra environment variables to be injected into the build: they will be available in the build using `process.env` */
    extraEnvs?: Record<string, unknown>;
};

export type CommonWebpackConfigParams = {
    /** the env object received by the command line, should have precedence over process.env */
    env: Record<string, unknown>;
    /** The directory containing the sources of the project */
    projectSrcDir: string;
    /** The public directory where the built files will be outputted */
    publicDirectory: string;
    /**
     * The project's configuration
     * FIXME: Properly type
     * */
    config: any;
    /** An array of directories from the project to include with the build, should include assets, locales and lib directories */
    includeDirectories: string[];
    /** The path containing the project specific locales */
    projectLocalesFilePath?: string;
    /** An array of HTML pages to generate */
    htmlPages: HtmlWebpackPlugin.Options[];
};

type WebpackGenerationConfigParams = CommonWebpackConfigParams & {
    entry: any;
    bundleRelativePath: string;
    outputFilename: string;
    outputCssFileName: string;
    extraEnvs: Record<string, unknown>;
};

const stringifyEnvValues = (envs: Record<string, unknown>) => {
    return Object.fromEntries(Object.entries(envs).map(([key, value]) => [key, JSON.stringify(value)]));
};

export const createCommonWebpackConfig = (params: WebpackGenerationConfigParams): Configuration => {
    const currentNodeEnv = params.env.NODE_ENV || process.env.NODE_ENV;
    const isProduction = currentNodeEnv === 'production';

    console.log(`building js for project ${params.config.projectShortname} for env ${currentNodeEnv}`);

    // Determine which style loader to use
    const styleLoader = isProduction ? MiniCssExtractPlugin.loader : 'style-loader';
    // Get root directories of evolution-frontend and chaire-lib-frontend for assets and locales file paths
    const evolutionFrontendRoot = path.dirname(require.resolve('evolution-frontend/package.json'));
    const chaireLibFrontendRoot = path.dirname(require.resolve('chaire-lib-frontend/package.json'));

    // Determine if there is project locales path to override evolution's
    const evolutionLocaleFiles = path.join(evolutionFrontendRoot, '..', '..', 'locales');
    const hasProjectLocales =
        params.projectLocalesFilePath !== undefined && fs.existsSync(params.projectLocalesFilePath);

    // Determine which languages to use
    const languages = params.config.languages || ['fr', 'en'];
    const momentLanguagesFilter = `/${languages.join('|')}/`;

    // Path where build files will be outputted in the public directory
    const outputPath = path.join(
        params.publicDirectory,
        'dist',
        params.config.projectShortname,
        params.bundleRelativePath
    );

    // Define environment variables to be used in the build, including the project configuration
    const definePluginValues: Record<string, any> = {
        'process.env': {
            IS_BROWSER: JSON.stringify(true),
            HOST: JSON.stringify(process.env.HOST),
            APP_NAME: JSON.stringify('survey'),
            IS_TESTING: JSON.stringify(currentNodeEnv === 'test'),
            GOOGLE_API_KEY: JSON.stringify(process.env.GOOGLE_API_KEY),
            ...stringifyEnvValues(params.extraEnvs)
        },
        __CONFIG__: JSON.stringify({
            ...params.config
        })
    };

    if (hasProjectLocales) {
        definePluginValues['__CUSTOM_LOCALES_PATH__'] = JSON.stringify(params.projectLocalesFilePath);
    }

    return {
        // Controls which information to display (see https://webpack.js.org/configuration/stats/)
        stats: {
            errorDetails: true,
            children: true
        },
        node: {
            // global will be deprecated at next major release, see where it is being used
            global: 'warn'
        },
        mode: process.env.NODE_ENV,
        // The entry point file(s) for the bundle(s), or an object of entry points for multiple bundles
        entry: params.entry,
        output: {
            path: outputPath,
            filename: params.outputFilename,
            publicPath: '/dist/'
        },
        watchOptions: {
            // In dev, watch evolution-frontend and evolution-common so CSS/TS changes trigger rebuild
            // Exclude lib/styles from evolution-frontend since we use alias to point to src/styles
            ignored: isProduction
                ? // In production, ignore all node_modules to avoid rebuilding the whole project
                new RegExp('node_modules/')
                : // Ignore all node_modules except evolution-frontend and evolution-common,
            // and also specifically ignore the lib/styles directory of evolution-frontend
            // (which we override via an alias to our src/styles).
                new RegExp(
                    `(node_modules\\/(?!evolution-frontend|evolution-common)|${path
                        .join(evolutionFrontendRoot, 'lib', 'styles')
                        .replace(/\\/g, '/')
                        .replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')})`
                ),
            aggregateTimeout: 600
        },
        module: {
            rules: [
                {
                    // Make sure to load geojson files from the project with the json loader
                    use: 'json-loader',
                    test: /\.geojson$/,
                    include: params.includeDirectories
                },
                {
                    // FIXME Confirm what copilot says this: For fonts and icons, use asset module to automatically choose between inlining and separate files based on size (default 8kb)
                    test: /\.(ttf|woff2|woff|eot|svg)$/,
                    type: 'asset'
                },
                {
                    // FIXME Do we have glsl shaders in Evolution? If not, we should remove this rule
                    test: /\.glsl$/,
                    use: 'ts-shader-loader'
                },
                {
                    // Load SCSS files
                    test: /\.s?css$/,
                    use: [
                        styleLoader, // In dev, style-loader injects CSS via <style> so SCSS changes apply after reload without a separate .css file
                        {
                            loader: 'css-loader',
                            options: {
                                sourceMap: true
                            }
                        },
                        {
                            loader: 'sass-loader',
                            options: {
                                sourceMap: true
                            }
                        }
                    ]
                },
                {
                    // Build locales keys into the webpack, and allow overriding them with a project specific locales file
                    test: /locales/,
                    loader: '@alienfast/i18next-loader',
                    options: {
                        basenameAsNamespace: true,
                        // The custom locales will override evolution's
                        overrides: hasProjectLocales ? [evolutionLocaleFiles] : []
                    }
                },
                {
                    // FIXME: Confirm what copilot says: Process source maps from dependencies, but only for included directories to avoid processing the whole node_modules
                    test: /\.js$/,
                    enforce: 'pre',
                    loader: 'source-map-loader',
                    include: params.includeDirectories
                },
                {
                    // FIXME Does not seem to work for evolution-frontend and evolution-common.
                    // Load TypeScript files, but only from the project and evolution-frontend and evolution-common source to avoid processing the whole node_modules
                    test: /\.tsx?$/,
                    use: 'ts-loader',
                    exclude: /node_modules(?!\/(evolution-frontend|evolution-common)\/src)/
                }
            ]
        },
        plugins: [
            // Remove any previously generated or intermediary files after production builds
            new CleanWebpackPlugin({
                dry: !isProduction,
                verbose: true,
                cleanAfterEveryBuildPatterns: ['**/*', '!images/**', '!icons/**', '!*.html']
            }),
            // Create the HTML file to serve the webpack bundles, using the provided template and injecting the generated bundles
            ...params.htmlPages.map((htmlPage) => new HtmlWebpackPlugin(htmlPage)),
            // Extract CSS in production in separate files, but keep it in the JS bundle in dev for faster builds and hot reload
            // FIXME This may not be required in dev mode
            new MiniCssExtractPlugin({
                filename: params.outputCssFileName
            }),
            // Define environment variables to be used in the build, including the project configuration
            new webpack.DefinePlugin(definePluginValues),
            // FIXME Confirm what copilot says: Merge chunks in production to reduce the number of generated files and optimize loading, but keep chunks separate in dev for faster builds and better debugging
            new webpack.optimize.AggressiveMergingPlugin(), // Merge chunks
            // Compress JS and CSS files to reduce bundle size
            new CompressionPlugin({
                filename: '[path][base].gz[query]',
                algorithm: 'gzip',
                test: /\.js$|\.css$/,
                threshold: 0,
                minRatio: 0.8
            }),
            // FIXME: Confirm what copilot says:Only include moment locales for the languages used in the project to reduce bundle size
            new webpack.ContextReplacementPlugin(/moment[/\\]locale$/, new RegExp(momentLanguagesFilter)),
            // Copy static assets from the project and from evolution-frontend and chaire-lib-frontend to the output directory
            new CopyWebpackPlugin({
                patterns: [
                    {
                        context: path.join(chaireLibFrontendRoot, 'lib', 'assets'),
                        from: '**/*',
                        to: '',
                        noErrorOnMissing: true
                    },
                    {
                        context: path.join(evolutionFrontendRoot, 'lib', 'assets'),
                        from: '**/*',
                        to: '',
                        noErrorOnMissing: true
                    },
                    {
                        context: path.join(params.projectSrcDir, 'assets'),
                        from: '**/*',
                        to: '',
                        noErrorOnMissing: true
                    }
                ]
            })
        ] as WebpackPluginInstance[],
        resolve: {
            mainFields: ['browser', 'main', 'module'],
            modules: ['node_modules'],
            extensions: ['.json', '.js', '.ts', '.tsx'],
            // In dev, read SCSS from evolution-frontend source so changes apply without running copy-files
            alias: isProduction
                ? {}
                : {
                    [path.join(evolutionFrontendRoot, 'lib', 'styles')]: path.join(
                        evolutionFrontendRoot,
                        'src',
                        'styles'
                    )
                },
            // These modules are not used in the frontend, don't try to resolve them as they are nodejs only and don't have a browser counterpart
            fallback: { path: false, buffer: false }
        },
        devtool: isProduction ? 'cheap-source-map' : 'eval-source-map',
        // FIXME: What does this do? Do we need this?
        devServer: {
            contentBase: params.publicDirectory,
            historyApiFallback: true,
            publicPath: '/dist/' + params.config.projectShortname
        }
    } as Configuration;
};
