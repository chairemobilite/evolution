/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { interviewAuditChecks } from '../../InterviewAuditChecks';
import { createContextWithInterview } from './testHelper';
import type { InterviewLoginMethod } from 'evolution-common/lib/services/baseObjects/interview/Interview';

const loginMethodChecks: {
    method: InterviewLoginMethod;
    errorCode: string;
    message: string;
}[] = [
    { method: 'email', errorCode: 'I_F_loginMethodIsEmail', message: 'Login method is email' },
    { method: 'anonymous', errorCode: 'I_F_loginMethodIsAnonymous', message: 'Login method is anonymous' },
    { method: 'google', errorCode: 'I_F_loginMethodIsGoogle', message: 'Login method is Google' },
    {
        method: 'interviewer',
        errorCode: 'I_F_loginMethodIsInterviewer',
        message: 'The interview was started by an interviewer'
    },
    { method: 'byField', errorCode: 'I_F_loginMethodIsByField', message: 'Login method is by field' },
    { method: 'unknown', errorCode: 'I_F_loginMethodIsUnknown', message: 'Login method is unknown' }
];

describe('I_F_loginMethodIs[LOGIN_METHOD] audit checks', () => {
    const validUuid = uuidV4();

    test.each([
        ...loginMethodChecks.map(({ method, errorCode, message }) => ({
            description: `login method is ${method}`,
            loginMethod: method as InterviewLoginMethod | undefined,
            expectedErrorCode: errorCode,
            expectedMessage: message
        })),
        {
            description: 'login method is unset',
            loginMethod: undefined,
            expectedErrorCode: undefined,
            expectedMessage: undefined
        }
    ])('$description fires only the matching login-method audit', ({
        loginMethod,
        expectedErrorCode,
        expectedMessage
    }) => {
        const context = createContextWithInterview({ loginMethod }, validUuid);
        const matchingResults = loginMethodChecks
            .map(({ errorCode }) => ({ errorCode, result: interviewAuditChecks[errorCode](context) }))
            .filter(({ result }) => result !== undefined);

        if (expectedErrorCode === undefined) {
            expect(matchingResults).toHaveLength(0);
            return;
        }

        expect(matchingResults).toHaveLength(1);
        expect(matchingResults[0].errorCode).toBe(expectedErrorCode);
        expect(matchingResults[0].result).toMatchObject({
            objectType: 'interview',
            objectUuid: validUuid,
            errorCode: expectedErrorCode,
            version: 1,
            level: 'info',
            message: expectedMessage,
            ignore: false
        });
    });
});
