/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { UserRuntimeInterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import { surveyReducer } from '../reducer';
import { SurveyActionTypes } from '../types';
import { createNavigationService } from 'evolution-common/lib/services/questionnaire/sections/NavigationService';

const testInterview: UserRuntimeInterviewAttributes = {
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
    is_valid: true,
    widgets: {},
    groups: {},
    visibleWidgets: [],
    allWidgetsValid: true
};

test('Test setting an interview', () => {
    const action = {
        type: SurveyActionTypes.SET_INTERVIEW as const,
        interview: testInterview,
        interviewLoaded: true
    };

    const result =  {
        interview: testInterview,
        interviewLoaded: true
    };

    expect(surveyReducer({ }, action)).toEqual(result);
});

test('Test updating an interview', () => {
    const action = {
        type: SurveyActionTypes.UPDATE_INTERVIEW as const,
        interview: testInterview,
        interviewLoaded: true,
        submitted: true,
        errors: {field: { 'en': 'something' }}
    };

    const result =  {
        interview: testInterview,
        interviewLoaded: true,
        submitted: true,
        errors: {field: { 'en': 'something' }}
    };

    expect(surveyReducer({
        interview: testInterview,
        interviewLoaded: false
    }, action)).toEqual(result);
});

describe('Navigate action', () => {
    const action = {
        type: SurveyActionTypes.NAVIGATE as const,
        targetSection: { sectionShortname: 'next' }
    };

    test('Test initial navigation state', () => {
        const initialState = {
            interview: testInterview,
            interviewLoaded: true
        }
        const result =  {
            interview: testInterview,
            interviewLoaded: true,
            navigation: {
                currentSection: action.targetSection,
                navigationHistory: []
            }
        };

        expect(surveyReducer(initialState, action)).toEqual(result);
    });

    test('Test initial navigation state', () => {
        const initialState = {
            interview: testInterview,
            interviewLoaded: true,
            navigation: {
                currentSection: { sectionShortname: 'previous', iterationContext: ['1234'] },
                navigationHistory: []
            }
        }
        const result =  {
            interview: testInterview,
            interviewLoaded: true,
            navigation: {
                currentSection: action.targetSection,
                navigationHistory: [initialState.navigation.currentSection]
            }
        };

        expect(surveyReducer(initialState, action)).toEqual(result);
    });

    test('Test with previous navigation history', () => {
        const initialState = {
            interview: testInterview,
            interviewLoaded: true,
            navigation: {
                currentSection: { sectionShortname: 'previous', iterationContext: ['1234'] },
                navigationHistory: [{ sectionShortname: 'previous3' }, { sectionShortname: 'previous2', iterationContext: ['1234'] }]
            }
        }
        const result =  {
            interview: testInterview,
            interviewLoaded: true,
            navigation: {
                currentSection: action.targetSection,
                navigationHistory: [...initialState.navigation.navigationHistory, initialState.navigation.currentSection]
            }
        };

        expect(surveyReducer(initialState, action)).toEqual(result);
    });

});

describe('Init navigate action', () => {
    const action = {
        type: SurveyActionTypes.INIT_NAVIGATE as const,
        navigationService: createNavigationService({})
    };

    test('Test initial navigation state', () => {
        const initialState = {
            interview: testInterview,
            interviewLoaded: true
        }
        const result =  {
            interview: testInterview,
            interviewLoaded: true,
            navigationService: action.navigationService
        };

        expect(surveyReducer(initialState, action)).toEqual(result);
    });

});
