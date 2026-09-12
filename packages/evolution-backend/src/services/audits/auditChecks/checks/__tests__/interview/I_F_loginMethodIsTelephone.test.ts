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

describe('I_F_loginMethodIsTelephone audit check', () => {
    const validUuid = uuidV4();

    test.each([
        { description: 'login method is telephone', loginMethod: 'telephone' as InterviewLoginMethod, shouldInfo: true },
        { description: 'login method is email', loginMethod: 'email' as InterviewLoginMethod, shouldInfo: false },
        { description: 'login method is anonymous', loginMethod: 'anonymous' as InterviewLoginMethod, shouldInfo: false },
        { description: 'login method is unset', loginMethod: undefined, shouldInfo: false }
    ])('$description', ({ loginMethod, shouldInfo }) => {
        const context = createContextWithInterview({ loginMethod }, validUuid);

        const result = interviewAuditChecks.I_F_loginMethodIsTelephone(context);

        if (!shouldInfo) {
            expect(result).toBeUndefined();
            return;
        }

        expect(result).toMatchObject({
            objectType: 'interview',
            objectUuid: validUuid,
            errorCode: 'I_F_loginMethodIsTelephone',
            version: 1,
            level: 'info',
            message: 'The interview was started by an interviewer',
            ignore: false
        });
    });
});
