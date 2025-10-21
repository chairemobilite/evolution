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

// Note: These tests use jest.isolateModules to ensure projectConfig mutations don't leak between tests
// running in parallel across different test files. We use dynamic imports inside isolateModules to
// ensure each test gets a fresh module instance.
describe('I_I_StartedAtBeforeSurveyStartDate audit check', () => {
    const validUuid = uuidV4();

    describe('should pass in valid scenarios', () => {
        it.each([
            {
                description: 'interview startedAt is after survey start date',
                startDate: '2025-01-01T00:00:00-05:00' as ISODateTimeStringWithTimezoneOffset,
                startedAt: new Date('2025-06-01T12:00:00-05:00').getTime() / 1000,
                hasParadata: true
            },
            {
                description: 'interview startedAt equals survey start date',
                startDate: '2025-01-01T00:00:00-05:00' as ISODateTimeStringWithTimezoneOffset,
                startedAt: new Date('2025-01-01T00:00:00-05:00').getTime() / 1000,
                hasParadata: true
            },
            {
                description: 'survey start date is not configured',
                startDate: undefined,
                startedAt: new Date('2024-01-01T00:00:00-05:00').getTime() / 1000,
                hasParadata: true
            },
            {
                description: 'interview startedAt is missing',
                startDate: '2025-01-01T00:00:00-05:00' as ISODateTimeStringWithTimezoneOffset,
                startedAt: undefined,
                hasParadata: true
            },
            {
                description: 'interview has no paradata',
                startDate: '2025-01-01T00:00:00-05:00' as ISODateTimeStringWithTimezoneOffset,
                startedAt: undefined,
                hasParadata: false
            },
            {
                description: 'survey start date is invalid (should be treated as not configured)',
                startDate: 'invalid-date-string' as ISODateTimeStringWithTimezoneOffset,
                startedAt: new Date('2024-01-01T00:00:00-05:00').getTime() / 1000,
                hasParadata: true
            },
            {
                description: 'survey start date is malformed ISO string',
                startDate: '2025-00-00T25:99:99-05:00' as ISODateTimeStringWithTimezoneOffset,
                startedAt: new Date('2024-12-31T23:59:59-05:00').getTime() / 1000,
                hasParadata: true
            },
            {
                description: 'interview startedAt is NaN (should be treated as missing)',
                startDate: '2025-01-01T00:00:00-05:00' as ISODateTimeStringWithTimezoneOffset,
                startedAt: NaN,
                hasParadata: true
            },
            {
                description: 'interview startedAt is Infinity (should be treated as missing)',
                startDate: '2025-01-01T00:00:00-05:00' as ISODateTimeStringWithTimezoneOffset,
                startedAt: Infinity,
                hasParadata: true
            },
            {
                description: 'interview startedAt is -Infinity (should be treated as missing)',
                startDate: '2025-01-01T00:00:00-05:00' as ISODateTimeStringWithTimezoneOffset,
                startedAt: -Infinity,
                hasParadata: true
            }
        ])('$description', async ({ startDate, startedAt, hasParadata }) => {
            await jest.isolateModulesAsync(async () => {
                // Import modules inside isolateModules to get fresh instances
                const { default: projectConfig } = await import('evolution-common/lib/config/project.config');
                const { interviewAuditChecks } = await import('../../InterviewAuditChecks');

                // Set config for this test
                projectConfig.startDateTimeWithTimezoneOffset = startDate;

                const interview = createMockInterview();
                interview.paradata = hasParadata ? new InterviewParadata({ startedAt }) : undefined;
                const context: InterviewAuditCheckContext = { interview };

                const result = interviewAuditChecks.I_I_StartedAtBeforeSurveyStartDate(context);

                expect(result).toBeUndefined();
            });
        });
    });

    describe('should fail when interview startedAt is before survey start date', () => {
        it.each([
            {
                description: 'in same timezone',
                startDate: '2025-01-01T00:00:00-05:00' as ISODateTimeStringWithTimezoneOffset,
                startedAt: new Date('2024-12-31T23:59:59-05:00').getTime() / 1000
            },
            {
                description: 'across different timezones (UTC)',
                startDate: '2025-01-01T00:00:00-05:00' as ISODateTimeStringWithTimezoneOffset,
                startedAt: new Date('2025-01-01T04:59:59+00:00').getTime() / 1000 // 1 second before start date
            },
            {
                description: 'across different timezones (PST)',
                startDate: '2025-01-01T00:00:00-05:00' as ISODateTimeStringWithTimezoneOffset,
                startedAt: new Date('2024-12-31T20:59:59-08:00').getTime() / 1000 // Same as 2024-12-31T23:59:59-05:00
            },
            {
                description: 'across different timezones (JST)',
                startDate: '2025-01-01T00:00:00-05:00' as ISODateTimeStringWithTimezoneOffset,
                startedAt: new Date('2025-01-01T13:59:59+09:00').getTime() / 1000 // Same as 2024-12-31T23:59:59-05:00
            },
            {
                description: 'with positive timezone offset',
                startDate: '2025-01-01T00:00:00+02:00' as ISODateTimeStringWithTimezoneOffset,
                startedAt: new Date('2024-12-31T23:59:59+02:00').getTime() / 1000
            }
        ])('$description', async ({ startDate, startedAt }) => {
            await jest.isolateModulesAsync(async () => {
                // Import modules inside isolateModules to get fresh instances
                const { default: projectConfig } = await import('evolution-common/lib/config/project.config');
                const { interviewAuditChecks } = await import('../../InterviewAuditChecks');

                // Set config for this test
                projectConfig.startDateTimeWithTimezoneOffset = startDate;

                const interview = createMockInterview(undefined, validUuid);
                interview.paradata = new InterviewParadata({ startedAt });
                const context: InterviewAuditCheckContext = { interview };

                const result = interviewAuditChecks.I_I_StartedAtBeforeSurveyStartDate(context);

                expect(result).toEqual({
                    objectType: 'interview',
                    objectUuid: validUuid,
                    errorCode: 'I_I_StartedAtBeforeSurveyStartDate',
                    version: 1,
                    level: 'error',
                    message: 'Interview start time is before survey start date',
                    ignore: false
                });
            });
        });
    });

    describe('should pass with edge cases across timezones', () => {
        it.each([
            {
                description: 'UTC to EST - same instant',
                startDate: '2025-01-01T00:00:00-05:00' as ISODateTimeStringWithTimezoneOffset,
                startedAt: new Date('2025-01-01T05:00:00+00:00').getTime() / 1000 // Same as start date
            },
            {
                description: 'PST to EST - same instant',
                startDate: '2025-01-01T00:00:00-05:00' as ISODateTimeStringWithTimezoneOffset,
                startedAt: new Date('2024-12-31T21:00:00-08:00').getTime() / 1000 // Same as start date
            },
            {
                description: 'JST to EST - after start date',
                startDate: '2025-01-01T00:00:00-05:00' as ISODateTimeStringWithTimezoneOffset,
                startedAt: new Date('2025-01-01T15:00:00+09:00').getTime() / 1000 // 01:00:00-05:00 (after)
            },
            {
                description: 'positive timezone offset - after start date',
                startDate: '2025-01-01T00:00:00+02:00' as ISODateTimeStringWithTimezoneOffset,
                startedAt: new Date('2025-01-01T12:00:00+02:00').getTime() / 1000
            }
        ])('$description', async ({ startDate, startedAt }) => {
            await jest.isolateModulesAsync(async () => {
                // Import modules inside isolateModules to get fresh instances
                const { default: projectConfig } = await import('evolution-common/lib/config/project.config');
                const { interviewAuditChecks } = await import('../../InterviewAuditChecks');

                // Set config for this test
                projectConfig.startDateTimeWithTimezoneOffset = startDate;

                const interview = createMockInterview();
                interview.paradata = new InterviewParadata({ startedAt });
                const context: InterviewAuditCheckContext = { interview };

                const result = interviewAuditChecks.I_I_StartedAtBeforeSurveyStartDate(context);

                expect(result).toBeUndefined();
            });
        });
    });
});
