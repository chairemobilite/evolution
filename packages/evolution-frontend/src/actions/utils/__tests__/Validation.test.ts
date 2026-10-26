/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { UserInterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import each from 'jest-each';

import { checkValidations } from '../Validation';

type CustomSurvey = {
    section1?: {
        q1?: string;
        q2?: number;
    };
    section2?: {
        q1?: string;
    }
}

const interviewAttributes: UserInterviewAttributes = {
    id: 1,
    uuid: 'arbitrary uuid',
    participant_id: 1,
    is_completed: false,
    response: {
        section1: {
            q1: 'abc',
            q2: 3
        },
        section2: {
            q1: 'test'
        }
    } as any,
    validations: {
        section1: {
            q1: true,
            q2: false
        },
        section2: {
            q1: true
        }
    } as any,
    is_valid: true
};

each([
    ['undefined validation', undefined, [true, undefined]],
    ['one group: invalid', jest.fn().mockReturnValue([{ validation: true, errorMessage: { text: 'error' } }]), [false, { text: 'error' }]],
    ['one group: valid', jest.fn().mockReturnValue([{ validation: false, errorMessage: { text: 'error' } }]), [true, undefined]],
    ['multiple groups: all valid', jest.fn().mockReturnValue([{ validation: false, errorMessage: { text: 'error' } }, { validation: false, errorMessage: { text: 'error2' } }]), [true, undefined]],
    ['multiple groups: second is invalid', jest.fn().mockReturnValue([{ validation: false, errorMessage: { text: 'error' } }, { validation: true, errorMessage: { text: 'error2' } }]), [false, { text: 'error2' }]],
    ['multiple groups: all invalid', jest.fn().mockReturnValue([{ validation: true, errorMessage: { text: 'error' } }, { validation: true, errorMessage: { text: 'error2' } }]), [false, { text: 'error' }]],
    ['function with error, should be valid', jest.fn().mockImplementation(() => { throw 'error'; }), [true, undefined]],
]).test('Test check validation %s', (_title, validations, expectedResult) => {
    expect(checkValidations(validations, 'dummy value', 'custom', interviewAttributes, 'path', 'customPath')).toEqual(expectedResult);
    if (typeof validations === 'function') {
        expect(validations).toHaveBeenCalledTimes(1);
        expect(validations).toHaveBeenCalledWith('dummy value', 'custom', interviewAttributes, 'path', 'customPath');
    }
});
