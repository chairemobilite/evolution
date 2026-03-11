/*
 * Copyright 2026, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
// eslint-disable-next-line n/no-unpublished-import
import type { Configuration } from 'webpack';

import { createCommonWebpackConfig, ParticipantWebpackConfigParams } from './webpackCommon';

export const createParticipantWebpackConfig = (params: ParticipantWebpackConfigParams): Configuration => {
    const currentNodeEnv = params.env.NODE_ENV || process.env.NODE_ENV;
    const isProduction = currentNodeEnv === 'production';

    const entry =
        params.surveyEndedEntryFile !== undefined
            ? {
                survey: [params.participantEntryFile, params.customStylesFilePath],
                'survey-ended': [params.surveyEndedEntryFile || '', params.customStylesFilePath]
            }
            : [params.participantEntryFile, params.customStylesFilePath];
    // Use [name] in output filename only if there are multiple entry points
    const namePartOfOutputFilename = params.surveyEndedEntryFile !== undefined ? '[name]' : 'survey';

    // Name of the output files to generate
    const outputFilename = isProduction
        ? `${namePartOfOutputFilename}-${params.config.projectShortname}-bundle-${currentNodeEnv}.[contenthash].js`
        : `${namePartOfOutputFilename}-${params.config.projectShortname}-bundle-${currentNodeEnv}.dev.js`;
    const outputCssFileName = isProduction
        ? `survey-${params.config.projectShortname}-styles.[contenthash].css`
        : `survey-${params.config.projectShortname}-styles.dev.css`;

    return createCommonWebpackConfig({
        env: params.env,
        projectSrcDir: params.projectSrcDir,
        publicDirectory: params.publicDirectory,
        config: params.config,
        entry,
        bundleRelativePath: 'survey',
        outputFilename,
        outputCssFileName,
        includeDirectories: params.includeDirectories,
        projectLocalesFilePath: params.projectLocalesFilePath,
        htmlPages: params.htmlPages,
        extraEnvs: params.extraEnvs || {}
    });
};
