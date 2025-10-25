/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import type { InterviewAuditCheckContext } from '../../../AuditCheckContexts';
import { createMockInterview } from './testHelper';

// Note: These tests use jest.isolateModulesAsync to ensure projectConfig mutations don't leak between tests
// running in parallel across different test files. We use await import() inside isolateModulesAsync to get
// fresh module instances per test, ensuring each test has an isolated projectConfig state.
describe('I_M_AccessCode audit check', () => {
    const validUuid = uuidV4();

    describe('should pass when access code is present', () => {
        it.each([
            {
                description: 'access code is required and present',
                accessCode: '1234-5678',
                isRequired: true
            },
            {
                description: 'access code is not required and present',
                accessCode: '1234-5678',
                isRequired: false
            },
            {
                description: 'access code is not required and missing',
                accessCode: undefined,
                isRequired: false
            },
            {
                description: 'access code is not required and null',
                accessCode: null,
                isRequired: false
            },
            {
                description: 'access code is not required and empty string',
                accessCode: '',
                isRequired: false
            }
        ])('$description', async ({ accessCode, isRequired }) => {
            await jest.isolateModulesAsync(async () => {
                // Import modules inside isolateModules to get fresh instances
                const { default: projectConfig } = await import('evolution-common/lib/config/project.config');
                const { interviewAuditChecks } = await import('../../InterviewAuditChecks');

                // Set config for this test
                projectConfig.requiredFieldsBySurveyObject = {
                    ...projectConfig.requiredFieldsBySurveyObject,
                    interview: isRequired ? ['accessCode'] : []
                };

                const interview = createMockInterview({ accessCode: accessCode as string | undefined });
                const context: InterviewAuditCheckContext = { interview };

                const result = interviewAuditChecks.I_M_AccessCode(context);

                expect(result).toBeUndefined();
            });
        });
    });

    describe('should fail when access code is required and missing', () => {
        it.each([
            {
                description: 'access code is undefined',
                accessCode: undefined
            },
            {
                description: 'access code is null',
                accessCode: null
            },
            {
                description: 'access code is empty string',
                accessCode: ''
            },
            {
                description: 'access code is whitespace only',
                accessCode: '   '
            },
            {
                description: 'access code is tab character',
                accessCode: '\t'
            },
            {
                description: 'access code is newline character',
                accessCode: '\n'
            }
        ])('$description', async ({ accessCode }) => {
            await jest.isolateModulesAsync(async () => {
                // Import modules inside isolateModules to get fresh instances
                const { default: projectConfig } = await import('evolution-common/lib/config/project.config');
                const { interviewAuditChecks } = await import('../../InterviewAuditChecks');

                // Set config to require access code
                projectConfig.requiredFieldsBySurveyObject = {
                    ...projectConfig.requiredFieldsBySurveyObject,
                    interview: ['accessCode']
                };

                const interview = createMockInterview({ accessCode: accessCode as string | undefined }, validUuid);
                const context: InterviewAuditCheckContext = { interview };

                const result = interviewAuditChecks.I_M_AccessCode(context);

                expect(result).toEqual({
                    objectType: 'interview',
                    objectUuid: validUuid,
                    errorCode: 'I_M_AccessCode',
                    version: 1,
                    level: 'error',
                    message: 'Access code is missing',
                    ignore: false
                });
            });
        });
    });
});

