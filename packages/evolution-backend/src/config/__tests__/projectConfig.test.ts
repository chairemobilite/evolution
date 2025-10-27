/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { InterviewResponse } from 'evolution-common/lib/services/questionnaire/types';
import { InterviewListAttributes, InterviewStatusAttributesBase } from 'evolution-common/lib/services/questionnaire/types';

const interview: InterviewListAttributes = {
    id: 1,
    uuid: 'arbitrary',
    participant_id: 4,
    is_valid: true,
    is_completed: true,
    response: { accessCode: 'notsure', foo: 'bar', household: { size: 0 } } as unknown as InterviewResponse,
    corrected_response: {},
    username: 'test',
    facebook: false,
    google: false,
    audits: { 'errorMsg': 2, 'errorMsg2': 5 }
};

const nullResponseInterview = {
    id: 1,
    uuid: 'arbitrary',
    participant_id: 4,
    is_valid: true,
    is_completed: true,
    response: null,
    corrected_response: null,
    username: 'test',
    facebook: false,
    google: false
};

// Note: These tests use jest.isolateModulesAsync to ensure projectConfig mutations don't leak between tests
// running in parallel across different test files. We use await import() inside isolateModulesAsync to get
// fresh module instances per test, ensuring each test has an isolated projectConfig state.
describe('Validation List Filter', () => {
    describe('when hasAccessCode is false', () => {
        test('should not include accessCode in response', async () => {
            await jest.isolateModulesAsync(async () => {
                const commonProjectConfig = (await import('evolution-common/lib/config/project.config')).default;
                const { default: projectConfig } = await import('../projectConfig');

                commonProjectConfig.hasAccessCode = false;

                const interviewStatus = projectConfig.validationListFilter(interview);
                expect(interviewStatus).toEqual(expect.objectContaining({
                    id: interview.id,
                    uuid: interview.uuid,
                    is_valid: interview.is_valid,
                    is_validated: undefined,
                    is_completed: interview.is_completed,
                    username: interview.username,
                    facebook: interview.facebook,
                    google: interview.google,
                    response: { household: { size: 0 }, _isCompleted: undefined, _validationComment: undefined },
                    audits: interview.audits
                }));
                expect((interviewStatus.response as InterviewResponse).accessCode).toBeUndefined();
            });
        });

        test('should not include accessCode with null values for response', async () => {
            await jest.isolateModulesAsync(async () => {
                const commonProjectConfig = (await import('evolution-common/lib/config/project.config')).default;
                const { default: projectConfig } = await import('../projectConfig');

                commonProjectConfig.hasAccessCode = false;

                const interviewStatus = projectConfig.validationListFilter(nullResponseInterview as unknown as InterviewListAttributes);
                expect(interviewStatus).toEqual(expect.objectContaining({
                    id: interview.id,
                    uuid: interview.uuid,
                    is_valid: interview.is_valid,
                    is_validated: undefined,
                    is_completed: interview.is_completed,
                    username: interview.username,
                    facebook: interview.facebook,
                    google: interview.google,
                    response: { household: { size: undefined }, _isCompleted: undefined, _validationComment: undefined }
                }));
                expect((interviewStatus.response as InterviewResponse).accessCode).toBeUndefined();
            });
        });
    });

    describe('when hasAccessCode is true', () => {
        test('should include accessCode in response', async () => {
            await jest.isolateModulesAsync(async () => {
                const commonProjectConfig = (await import('evolution-common/lib/config/project.config')).default;
                const { default: projectConfig } = await import('../projectConfig');

                commonProjectConfig.hasAccessCode = true;

                const interviewStatus = projectConfig.validationListFilter(interview);
                expect(interviewStatus).toEqual(expect.objectContaining({
                    id: interview.id,
                    uuid: interview.uuid,
                    is_valid: interview.is_valid,
                    is_validated: undefined,
                    is_completed: interview.is_completed,
                    username: interview.username,
                    facebook: interview.facebook,
                    google: interview.google,
                    response: { accessCode: 'notsure', household: { size: 0 }, _isCompleted: undefined, _validationComment: undefined },
                    audits: interview.audits
                }));
            });
        });

        test('should include accessCode with null values for response', async () => {
            await jest.isolateModulesAsync(async () => {
                const commonProjectConfig = (await import('evolution-common/lib/config/project.config')).default;
                const { default: projectConfig } = await import('../projectConfig');

                commonProjectConfig.hasAccessCode = true;

                const interviewStatus = projectConfig.validationListFilter(nullResponseInterview as unknown as InterviewListAttributes);
                expect(interviewStatus).toEqual(expect.objectContaining({
                    id: interview.id,
                    uuid: interview.uuid,
                    is_valid: interview.is_valid,
                    is_validated: undefined,
                    is_completed: interview.is_completed,
                    username: interview.username,
                    facebook: interview.facebook,
                    google: interview.google,
                    response: { accessCode: undefined, household: { size: undefined }, _isCompleted: undefined, _validationComment: undefined }
                }));
            });
        });
    });

    test('Add project specific filter', async () => {
        await jest.isolateModulesAsync(async () => {
            const commonProjectConfig = (await import('evolution-common/lib/config/project.config')).default;
            const { default: projectConfig, defaultConfig, setProjectConfig } = await import('../projectConfig');

            commonProjectConfig.hasAccessCode = true;

            setProjectConfig({ validationListFilter: (interview: InterviewListAttributes) => {
                const status = defaultConfig.validationListFilter(interview) as InterviewStatusAttributesBase;
                // Add custom field to response
                (status.response as unknown as { foo: string }).foo = (interview.response as unknown as { foo: string }).foo;
                return status;
            } });

            const interviewStatus = projectConfig.validationListFilter(interview);
            expect(interviewStatus).toEqual(expect.objectContaining({
                id: interview.id,
                uuid: interview.uuid,
                is_valid: interview.is_valid,
                is_validated: undefined,
                is_completed: interview.is_completed,
                username: interview.username,
                facebook: interview.facebook,
                google: interview.google,
                response: { accessCode: 'notsure', foo: 'bar', household: { size: 0 }, _isCompleted: undefined, _validationComment: undefined },
                audits: interview.audits
            }));
        });
    });
});

describe('Transition API configuration', () => {
    test('Default value should not be set', async () => {
        await jest.isolateModulesAsync(async () => {
            // Undefine all environment variables
            delete process.env.TRANSITION_API_URL;
            delete process.env.TRANSITION_API_USERNAME;
            delete process.env.TRANSITION_API_PASSWORD;

            const { default: projectConfig, setProjectConfig } = await import('../projectConfig');

            setProjectConfig({
                // Nothing to set
            });
            expect(projectConfig.transitionApi).toBeUndefined();
        });
    });

    test('Should use environment variables if set', async () => {
        await jest.isolateModulesAsync(async () => {
            process.env.TRANSITION_API_URL = 'https://transition.from.env';
            process.env.TRANSITION_API_USERNAME = 'username.env';
            process.env.TRANSITION_API_PASSWORD = 'password.env';

            const { default: projectConfig, setProjectConfig } = await import('../projectConfig');

            setProjectConfig({
                // Nothing to set
            });
            expect(projectConfig.transitionApi).toEqual({
                url: 'https://transition.from.env',
                username: 'username.env',
                password: 'password.env'
            });

            // Cleanup
            delete process.env.TRANSITION_API_URL;
            delete process.env.TRANSITION_API_USERNAME;
            delete process.env.TRANSITION_API_PASSWORD;
        });
    });

    test('Missing password, should not be set', async () => {
        await jest.isolateModulesAsync(async () => {
            process.env.TRANSITION_API_URL = 'https://transition.from.env';
            process.env.TRANSITION_API_USERNAME = 'username.env';

            const { default: projectConfig, setProjectConfig } = await import('../projectConfig');

            setProjectConfig({
                // Nothing to set
            });
            expect(projectConfig.transitionApi).toBeUndefined();

            // Cleanup
            delete process.env.TRANSITION_API_URL;
            delete process.env.TRANSITION_API_USERNAME;
        });
    });

    test('Should use the values specified in the config if set', async () => {
        await jest.isolateModulesAsync(async () => {
            delete process.env.TRANSITION_API_URL;
            delete process.env.TRANSITION_API_USERNAME;
            delete process.env.TRANSITION_API_PASSWORD;

            const { default: projectConfig, setProjectConfig } = await import('../projectConfig');

            setProjectConfig({
                transitionApi: {
                    url: 'http://transition',
                    username: 'user',
                    password: 'password'
                }
            });
            expect(projectConfig.transitionApi).toEqual({
                url: 'http://transition',
                username: 'user',
                password: 'password'
            });
        });
    });

    test('Should use values in config if both environment and config set', async () => {
        await jest.isolateModulesAsync(async () => {
            process.env.TRANSITION_API_URL = 'https://transition.from.env';
            process.env.TRANSITION_API_USERNAME = 'username.env';
            process.env.TRANSITION_API_PASSWORD = 'password.env';

            const { default: projectConfig, setProjectConfig } = await import('../projectConfig');

            setProjectConfig({
                transitionApi: {
                    url: 'http://transition',
                    username: 'user',
                    password: 'password'
                }
            });
            expect(projectConfig.transitionApi).toEqual({
                url: 'http://transition',
                username: 'user',
                password: 'password'
            });

            // Cleanup
            delete process.env.TRANSITION_API_URL;
            delete process.env.TRANSITION_API_USERNAME;
            delete process.env.TRANSITION_API_PASSWORD;
        });
    });
});
