/*
 * Copyright 2026, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { createAdminWebpackConfig } from '../webpackAdmin';
import { createCommonWebpackConfig } from '../webpackCommon';
import { createParticipantWebpackConfig } from '../webpackParticipant';

jest.mock('../webpackCommon', () => ({
    createCommonWebpackConfig: jest.fn()
}));

const mockedCreateCommonWebpackConfig = createCommonWebpackConfig as jest.MockedFunction<
    typeof createCommonWebpackConfig
>;

const createBaseParams = () => ({
    env: { NODE_ENV: 'test' },
    projectSrcDir: '/project/src',
    publicDirectory: '/project/public',
    config: {
        projectShortname: 'test',
        adminAuth: {}
    },
    includeDirectories: [],
    htmlPages: []
});

const getEntry = () => mockedCreateCommonWebpackConfig.mock.calls[0][0].entry;

beforeEach(() => {
    mockedCreateCommonWebpackConfig.mockReset();
});

describe('createParticipantWebpackConfig', () => {
    test('uses the participant entry directly when custom styles are omitted', () => {
        createParticipantWebpackConfig({
            ...createBaseParams(),
            participantEntryFile: '/project/participant.tsx'
        });

        expect(getEntry()).toBe('/project/participant.tsx');
    });

    test('adds custom styles to the participant entry when provided', () => {
        createParticipantWebpackConfig({
            ...createBaseParams(),
            participantEntryFile: '/project/participant.tsx',
            customStylesFilePath: '/project/styles.scss'
        });

        expect(getEntry()).toEqual(['/project/participant.tsx', '/project/styles.scss']);
    });

    test('uses both entry files directly when custom styles are omitted', () => {
        createParticipantWebpackConfig({
            ...createBaseParams(),
            participantEntryFile: '/project/participant.tsx',
            surveyEndedEntryFile: '/project/survey-ended.tsx'
        });

        expect(getEntry()).toEqual({
            survey: '/project/participant.tsx',
            'survey-ended': '/project/survey-ended.tsx'
        });
    });

    test('adds custom styles to both entry files when provided', () => {
        createParticipantWebpackConfig({
            ...createBaseParams(),
            participantEntryFile: '/project/participant.tsx',
            surveyEndedEntryFile: '/project/survey-ended.tsx',
            customStylesFilePath: '/project/styles.scss'
        });

        expect(getEntry()).toEqual({
            survey: ['/project/participant.tsx', '/project/styles.scss'],
            'survey-ended': ['/project/survey-ended.tsx', '/project/styles.scss']
        });
    });
});

describe('createAdminWebpackConfig', () => {
    test('uses the admin entry directly when custom styles are omitted', () => {
        createAdminWebpackConfig({
            ...createBaseParams(),
            adminEntryFile: '/project/admin.tsx'
        });

        expect(getEntry()).toBe('/project/admin.tsx');
    });

    test('adds custom styles to the admin entry when provided', () => {
        createAdminWebpackConfig({
            ...createBaseParams(),
            adminEntryFile: '/project/admin.tsx',
            customStylesFilePath: '/project/styles.scss'
        });

        expect(getEntry()).toEqual(['/project/admin.tsx', '/project/styles.scss']);
    });
});
