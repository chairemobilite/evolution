/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { interviewAuditChecks } from '../../InterviewAuditChecks';
import { createContextWithInterview } from './testHelper';

const interviewUuid = uuidV4();

const infoAudit = {
    objectType: 'interview',
    objectUuid: interviewUuid,
    errorCode: 'I_F_AcceptToBeContactedForHelp',
    version: 1,
    level: 'info',
    message: 'Respondent household accepts to be contacted for help',
    ignore: false
};

describe('I_F_AcceptToBeContactedForHelp', () => {
    test.each([
        { description: 'respondent accepted to be contacted: info', acceptToBeContactedForHelp: true, expected: infoAudit },
        { description: 'respondent refused: accepted', acceptToBeContactedForHelp: false, expected: undefined },
        { description: 'answer unset: accepted', acceptToBeContactedForHelp: undefined, expected: undefined }
    ])('$description', ({ acceptToBeContactedForHelp, expected }) => {
        const result = interviewAuditChecks.I_F_AcceptToBeContactedForHelp(
            createContextWithInterview({ acceptToBeContactedForHelp }, interviewUuid)
        );
        expect(result).toEqual(expected);
    });
});
