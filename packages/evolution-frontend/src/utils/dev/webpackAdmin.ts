/*
 * Copyright 2026, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
// eslint-disable-next-line n/no-unpublished-import
import type { Configuration } from 'webpack';

import { AdminWebpackConfigParams, createCommonWebpackConfig } from './webpackCommon';

const applyAdminAuthToConfig = (config: any): any => {
    // For the admin app, the adminAuth should replace the auth configuration
    // FIXME This is the kind of config that should come from the server, not be inserted in the client in webpack
    if (!config.adminAuth) {
        console.warn(
            'Configuration error: you need to specify the adminAuth key in the config.js file. Will use default values.'
        );
        config.adminAuth = {
            localLogin: {
                registerWithPassword: true,
                registerWithEmailOnly: true,
                confirmEmail: false,
                forgotPasswordPage: true
            }
        };
    }
    config.auth = config.adminAuth;
    delete config.adminAuth;
    return config;
};

export const createAdminWebpackConfig = (params: AdminWebpackConfigParams): Configuration => {
    const currentNodeEnv = params.env.NODE_ENV || process.env.NODE_ENV;
    const isProduction = currentNodeEnv === 'production';

    // Update config to replace the auth config with the admin auth config
    const updatedConfig = applyAdminAuthToConfig(params.config);

    const entry = [params.adminEntryFile, params.customStylesFilePath];

    // Name of the output file to generate
    const outputFilename = isProduction
        ? `survey-admin-${updatedConfig.projectShortname}-bundle-${currentNodeEnv}.[contenthash].js`
        : `survey-admin-${updatedConfig.projectShortname}-bundle-${currentNodeEnv}.dev.js`;
    const outputCssFileName = isProduction
        ? `survey-${updatedConfig.projectShortname}-styles.[contenthash].css`
        : `survey-${updatedConfig.projectShortname}-styles.dev.css`;

    return createCommonWebpackConfig({
        env: params.env,
        projectSrcDir: params.projectSrcDir,
        publicDirectory: params.publicDirectory,
        config: updatedConfig,
        entry,
        bundleRelativePath: 'admin',
        outputFilename,
        outputCssFileName,
        includeDirectories: params.includeDirectories,
        projectLocalesFilePath: params.projectLocalesFilePath,
        htmlPages: params.htmlPages,
        extraEnvs: params.extraEnvs || {}
    });
};
