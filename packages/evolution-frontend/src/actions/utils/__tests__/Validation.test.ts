import { UserInterviewAttributes } from "evolution-common/lib/services/interviews/interview";
import each from 'jest-each';

import { checkValidations } from "../Validation";

type CustomSurvey = {
    section1?: {
        q1?: string;
        q2?: number;
    };
    section2?: {
        q1?: string;
    }
}

const interviewAttributes: UserInterviewAttributes<CustomSurvey, unknown, unknown, unknown> = {
    id: 1,
    uuid: 'arbitrary uuid',
    participant_id: 1,
    is_completed: false,
    responses: {
        section1: {
            q1: 'abc',
            q2: 3
        },
        section2: {
            q1: 'test'
        }
    },
    validations: {
        section1: {
            q1: true,
            q2: false
        },
        section2: {
            q1: true
        }
    },
    is_valid: true
};

each([
    ['undefined validation', undefined, [true, undefined]],
    ['one group: invalid', jest.fn().mockReturnValue([{ validation: true, errorMessage: 'error'}]), [false, 'error']],
    ['one group: valid', jest.fn().mockReturnValue([{ validation: false, errorMessage: 'error'}]), [true, undefined]],
    ['multiple groups: all valid', jest.fn().mockReturnValue([{ validation: false, errorMessage: 'error'}, { validation: false, errorMessage: 'error2'}]), [true, undefined]],
    ['multiple groups: second is invalid', jest.fn().mockReturnValue([{ validation: false, errorMessage: 'error'}, { validation: true, errorMessage: 'error2'}]), [false, 'error2']],
    ['multiple groups: all invalid', jest.fn().mockReturnValue([{ validation: true, errorMessage: 'error'}, { validation: true, errorMessage: 'error2'}]), [false, 'error']],
    ['function with error, should be valid', jest.fn().mockImplementation(() => { throw 'error' }), [true, undefined]],
]).test('Test check validation %s', (_title, validations, expectedResult) => {
    expect(checkValidations(validations, 'dummy value', 'custom', interviewAttributes, 'path', 'customPath')).toEqual(expectedResult);
    if (typeof validations === 'function') {
        expect(validations).toHaveBeenCalledTimes(1);
        expect(validations).toHaveBeenCalledWith('dummy value', 'custom', interviewAttributes, 'path', 'customPath');   
    }
})