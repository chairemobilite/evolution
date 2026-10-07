/*
 * Copyright 2026, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import type { Home } from 'evolution-common/lib/services/baseObjects/Home';
import type { PreData } from 'evolution-common/lib/types/shared';
import { interviewAuditChecks } from '../../InterviewAuditChecks';
import { createMockInterview } from './testHelper';

const issuedCodeAudit = (objectUuid: string) => ({
    objectType: 'interview',
    objectUuid,
    errorCode: 'I_I_AccessCodeFromList',
    version: 1,
    level: 'error',
    message: 'Access code has no associated address in the sample (might be wrong)',
    ignore: false
});

describe('I_I_AccessCodeFromList', () => {
    const interviewUuid = uuidV4();

    test.each([
        {
            description: 'preData means the code was issued: accepted',
            accessCode: '1234-5678',
            preData: { AccessCode: '1234-5678', Address: '123 rue Principale' } as PreData,
            omitHome: false,
            expected: undefined
        },
        {
            description: 'access code without preData: error',
            accessCode: '1234-5678',
            preData: undefined,
            omitHome: false,
            expected: issuedCodeAudit(interviewUuid)
        },
        {
            description: 'empty preData: error',
            accessCode: '1234-5678',
            preData: {} as PreData,
            omitHome: false,
            expected: issuedCodeAudit(interviewUuid)
        },
        {
            description: 'no home: error',
            accessCode: '1234-5678',
            preData: undefined,
            omitHome: true,
            expected: issuedCodeAudit(interviewUuid)
        },
        {
            description: 'blank access code: accepted',
            accessCode: '',
            preData: undefined,
            omitHome: false,
            expected: undefined
        },
        {
            description: 'missing access code: accepted',
            accessCode: undefined,
            preData: undefined,
            omitHome: false,
            expected: undefined
        }
    ])('$description', ({ accessCode, preData, omitHome, expected }) => {
        const result = interviewAuditChecks.I_I_AccessCodeFromList({
            interview: createMockInterview({ accessCode }, interviewUuid),
            home: omitHome ? undefined : ({ preData } as Home)
        });
        expect(result).toEqual(expected);
    });
});
