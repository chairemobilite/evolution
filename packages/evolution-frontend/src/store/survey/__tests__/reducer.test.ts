/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { UserInterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import { surveyReducer } from '../reducer';

type CustomSurvey = {
    section1?: {
        q1?: string;
        q2?: number;
    };
    section2?: {
        q1?: string;
    }
}

const testInterview: UserInterviewAttributes = {
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
test('Test setting an interview', () => {
    const action = {
        type: 'SET_INTERVIEW',
        interview: testInterview,
        interviewLoaded:true
    };

    const result =  {
        interview: testInterview,
        interviewLoaded:true
    };

    expect(surveyReducer({ }, action)).toEqual(result);
});

test('Test updating an interview', () => {
    const action = {
        type: 'UPDATE_INTERVIEW',
        interview: testInterview,
        interviewLoaded:true,
        submitted: true,
        errors: {field: { 'en': 'something' }}
    };

    const result =  {
        interview: testInterview,
        interviewLoaded:true,
        submitted: true,
        errors: {field: { 'en': 'something' }}
    };

    expect(surveyReducer({
        interview: testInterview,
        interviewLoaded: false
    }, action)).toEqual(result);
});
