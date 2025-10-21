/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { interviewAuditChecks } from '../../InterviewAuditChecks';
import type { InterviewAuditCheckContext } from '../../../AuditCheckContexts';
import { InterviewParadata } from 'evolution-common/lib/services/baseObjects/interview/InterviewParadata';
import { createMockInterview } from './testHelper';

describe('I_M_StartedAt audit check', () => {
    const validUuid = uuidV4();

    describe('should pass when startedAt is present', () => {
        it.each([
            {
                description: 'interview has valid startedAt timestamp',
                startedAt: 1625097600
            },
            {
                description: 'interview has startedAt timestamp of 0',
                startedAt: 0
            }
        ])('$description', ({ startedAt }) => {
            const interview = createMockInterview();
            interview.paradata = new InterviewParadata({ startedAt });
            const context: InterviewAuditCheckContext = { interview };

            const result = interviewAuditChecks.I_M_StartedAt(context);

            expect(result).toBeUndefined();
        });
    });

    describe('should fail when startedAt is missing', () => {
        it.each([
            {
                description: 'interview missing startedAt',
                hasParadata: true,
                startedAt: undefined
            },
            {
                description: 'interview has no paradata',
                hasParadata: false,
                startedAt: undefined
            },
            {
                description: 'interview has null startedAt',
                hasParadata: true,
                startedAt: null
            },
            {
                description: 'interview has null startedAt with no paradata',
                hasParadata: false,
                startedAt: null
            },
            {
                description: 'interview has negative startedAt timestamp',
                hasParadata: true,
                startedAt: -1234567890
            },
            {
                description: 'interview has negative startedAt timestamp with no paradata',
                hasParadata: false,
                startedAt: -1234567890
            },
            {
                description: 'interview has NaN startedAt',
                hasParadata: true,
                startedAt: NaN
            },
            {
                description: 'interview has NaN startedAt with no paradata',
                hasParadata: false,
                startedAt: NaN
            },
            {
                description: 'interview has Infinity startedAt',
                hasParadata: true,
                startedAt: Infinity
            },
            {
                description: 'interview has Infinity startedAt with no paradata',
                hasParadata: false,
                startedAt: Infinity
            },
            {
                description: 'interview has -Infinity startedAt',
                hasParadata: true,
                startedAt: -Infinity
            },
            {
                description: 'interview has -Infinity startedAt with no paradata',
                hasParadata: false,
                startedAt: -Infinity
            }
        ])('$description', ({ hasParadata, startedAt }) => {
            const interview = createMockInterview(undefined, validUuid);
            interview.paradata = hasParadata
                ? new InterviewParadata({ startedAt: startedAt as number | undefined })
                : undefined;
            const context: InterviewAuditCheckContext = { interview };

            const result = interviewAuditChecks.I_M_StartedAt(context);

            expect(result).toMatchObject({
                objectType: 'interview',
                objectUuid: validUuid,
                errorCode: 'I_M_StartedAt',
                version: 1,
                level: 'error',
                message: 'Interview start time is missing',
                ignore: false
            });
        });
    });
});

