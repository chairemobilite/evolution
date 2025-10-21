/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import type { InterviewAuditCheckContext } from '../../../AuditCheckContexts';
import { InterviewParadata } from 'evolution-common/lib/services/baseObjects/interview/InterviewParadata';
import { ISODateTimeStringWithTimezoneOffset } from 'evolution-common/lib/utils/DateTimeUtils';
import { createMockInterview } from './testHelper';

// Note: These tests use jest.isolateModulesAsync to ensure projectConfig mutations don't leak between tests
// running in parallel across different test files. We use await import() inside isolateModulesAsync to get
// fresh module instances per test, ensuring each test has an isolated projectConfig state.
describe('I_I_StartedAtAfterSurveyEndDate audit check', () => {
    const validUuid = uuidV4();

    describe('should pass in valid scenarios', () => {
        it.each([
            {
                description: 'interview startedAt is before survey end date',
                endDate: '2025-12-31T23:59:59-05:00' as ISODateTimeStringWithTimezoneOffset,
                startedAt: new Date('2025-06-01T12:00:00-05:00').getTime() / 1000,
                hasParadata: true
            },
            {
                description: 'interview startedAt equals survey end date',
                endDate: '2025-12-31T23:59:59-05:00' as ISODateTimeStringWithTimezoneOffset,
                startedAt: new Date('2025-12-31T23:59:59-05:00').getTime() / 1000,
                hasParadata: true
            },
            {
                description: 'interview startedAt equals survey end date across different timezones',
                endDate: '2025-12-31T23:59:59-05:00' as ISODateTimeStringWithTimezoneOffset,
                startedAt: new Date('2026-01-01T04:59:59+00:00').getTime() / 1000, // Same instant as 2025-12-31T23:59:59-05:00
                hasParadata: true
            },
            {
                description: 'survey end date is not configured',
                endDate: undefined,
                startedAt: new Date('2026-12-31T23:59:59-05:00').getTime() / 1000,
                hasParadata: true
            },
            {
                description: 'interview startedAt is missing',
                endDate: '2025-12-31T23:59:59-05:00' as ISODateTimeStringWithTimezoneOffset,
                startedAt: undefined,
                hasParadata: true
            },
            {
                description: 'interview has no paradata',
                endDate: '2025-12-31T23:59:59-05:00' as ISODateTimeStringWithTimezoneOffset,
                startedAt: undefined,
                hasParadata: false
            },
            {
                description: 'survey end date is invalid (should be treated as not configured)',
                endDate: 'invalid-date-string' as ISODateTimeStringWithTimezoneOffset,
                startedAt: new Date('2026-12-31T23:59:59-05:00').getTime() / 1000,
                hasParadata: true
            },
            {
                description: 'survey end date is malformed ISO string',
                endDate: '2025-13-45T99:99:99-05:00' as ISODateTimeStringWithTimezoneOffset,
                startedAt: new Date('2025-06-01T12:00:00-05:00').getTime() / 1000,
                hasParadata: true
            },
            {
                description: 'interview startedAt is NaN (should be treated as missing)',
                endDate: '2025-12-31T23:59:59-05:00' as ISODateTimeStringWithTimezoneOffset,
                startedAt: NaN,
                hasParadata: true
            },
            {
                description: 'interview startedAt is Infinity (should be treated as missing)',
                endDate: '2025-12-31T23:59:59-05:00' as ISODateTimeStringWithTimezoneOffset,
                startedAt: Infinity,
                hasParadata: true
            },
            {
                description: 'interview startedAt is -Infinity (should be treated as missing)',
                endDate: '2025-12-31T23:59:59-05:00' as ISODateTimeStringWithTimezoneOffset,
                startedAt: -Infinity,
                hasParadata: true
            }
        ])('$description', async ({ endDate, startedAt, hasParadata }) => {
            await jest.isolateModulesAsync(async () => {
                // Import modules inside isolateModules to get fresh instances
                const { default: projectConfig } = await import('evolution-common/lib/config/project.config');
                const { interviewAuditChecks } = await import('../../InterviewAuditChecks');

                // Set config for this test
                projectConfig.endDateTimeWithTimezoneOffset = endDate;

                const interview = createMockInterview();
                interview.paradata = hasParadata ? new InterviewParadata({ startedAt }) : undefined;
                const context: InterviewAuditCheckContext = { interview };

                const result = interviewAuditChecks.I_I_StartedAtAfterSurveyEndDate(context);

                expect(result).toBeUndefined();
            });
        });
    });

    describe('should fail when interview startedAt is after survey end date', () => {
        it.each([
            {
                description: 'in same timezone',
                endDate: '2025-12-31T23:59:59-05:00' as ISODateTimeStringWithTimezoneOffset,
                startedAt: new Date('2026-01-01T00:00:00-05:00').getTime() / 1000
            },
            {
                description: 'across different timezones (UTC)',
                endDate: '2025-12-31T23:59:59-05:00' as ISODateTimeStringWithTimezoneOffset,
                startedAt: new Date('2026-01-01T05:00:00+00:00').getTime() / 1000 // 1 second after end date
            },
            {
                description: 'across different timezones (PST)',
                endDate: '2025-12-31T23:59:59-05:00' as ISODateTimeStringWithTimezoneOffset,
                startedAt: new Date('2025-12-31T21:00:00-08:00').getTime() / 1000 // Same as 2026-01-01T00:00:00-05:00
            },
            {
                description: 'across different timezones (JST)',
                endDate: '2025-12-31T23:59:59-05:00' as ISODateTimeStringWithTimezoneOffset,
                startedAt: new Date('2026-01-01T14:00:00+09:00').getTime() / 1000 // Same as 2026-01-01T00:00:00-05:00
            },
            {
                description: 'with positive timezone offset',
                endDate: '2025-12-31T23:59:59+02:00' as ISODateTimeStringWithTimezoneOffset,
                startedAt: new Date('2026-01-01T00:00:00+02:00').getTime() / 1000
            }
        ])('$description', async ({ endDate, startedAt }) => {
            await jest.isolateModulesAsync(async () => {
                // Import modules inside isolateModules to get fresh instances
                const { default: projectConfig } = await import('evolution-common/lib/config/project.config');
                const { interviewAuditChecks } = await import('../../InterviewAuditChecks');

                // Set config for this test
                projectConfig.endDateTimeWithTimezoneOffset = endDate;

                const interview = createMockInterview(undefined, validUuid);
                interview.paradata = new InterviewParadata({ startedAt });
                const context: InterviewAuditCheckContext = { interview };

                const result = interviewAuditChecks.I_I_StartedAtAfterSurveyEndDate(context);

                expect(result).toEqual({
                    objectType: 'interview',
                    objectUuid: validUuid,
                    errorCode: 'I_I_StartedAtAfterSurveyEndDate',
                    version: 1,
                    level: 'error',
                    message: 'Interview start time is after survey end date',
                    ignore: false
                });
            });
        });
    });

    describe('should pass with edge cases across timezones', () => {
        it.each([
            {
                description: 'UTC to EST - same instant',
                endDate: '2025-12-31T23:59:59-05:00' as ISODateTimeStringWithTimezoneOffset,
                startedAt: new Date('2026-01-01T04:59:59+00:00').getTime() / 1000 // Same as end date
            },
            {
                description: 'PST to EST - same instant',
                endDate: '2025-12-31T23:59:59-05:00' as ISODateTimeStringWithTimezoneOffset,
                startedAt: new Date('2025-12-31T20:59:59-08:00').getTime() / 1000 // Same as end date
            },
            {
                description: 'JST to EST - before end date',
                endDate: '2025-12-31T23:59:59-05:00' as ISODateTimeStringWithTimezoneOffset,
                startedAt: new Date('2026-01-01T13:00:00+09:00').getTime() / 1000 // 23:00:00-05:00 (before)
            },
            {
                description: 'positive timezone offset - before end date',
                endDate: '2025-12-31T23:59:59+02:00' as ISODateTimeStringWithTimezoneOffset,
                startedAt: new Date('2025-12-31T20:00:00+02:00').getTime() / 1000
            }
        ])('$description', async ({ endDate, startedAt }) => {
            await jest.isolateModulesAsync(async () => {
                // Import modules inside isolateModules to get fresh instances
                const { default: projectConfig } = await import('evolution-common/lib/config/project.config');
                const { interviewAuditChecks } = await import('../../InterviewAuditChecks');

                // Set config for this test
                projectConfig.endDateTimeWithTimezoneOffset = endDate;

                const interview = createMockInterview();
                interview.paradata = new InterviewParadata({ startedAt });
                const context: InterviewAuditCheckContext = { interview };

                const result = interviewAuditChecks.I_I_StartedAtAfterSurveyEndDate(context);

                expect(result).toBeUndefined();
            });
        });
    });
});
