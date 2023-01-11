/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import surveyReducer from '../../../reducers/survey/survey';

test('Should return a SET_INTERVIEW status', () =>
{
    const action = {type: 'SET_INTERVIEW',
                    interviewLoaded: true,
                    interview: 'interview'};

    const result =  {interview: 'interview',
                    interviewLoaded: true};

    expect(surveyReducer([], action)).toEqual(result);
});

test('Should return a UPDATE_INTERVIEW status', () =>
{
    const action = {type: 'UPDATE_INTERVIEW',
                    interviewLoaded: true,
                    interview: 'interview'};

    const result =  {interview: 'interview',
                     interviewLoaded: true};

    expect(surveyReducer([], action)).toEqual(result);
});

test('Should return a UPDATE_INTERVIEW status with error messages', () =>
{
    const action = {type: 'UPDATE_INTERVIEW',
                    interviewLoaded: true,
                    interview: 'interview',
                    errors: { testField: { fr: 'message', en: 'message' }}};

    const result =  {interview: 'interview',
                     interviewLoaded: true,
                     errors: action.errors};

    expect(surveyReducer([], action)).toEqual(result);
});