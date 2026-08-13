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

describe('SET_INTERVIEW action', () => {
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
    
    test('Test setting an interview with previous state', () => {
        const initialState = {
            navigation: {
                currentSection: { sectionShortname: 'previous', iterationContext: ['1234'] },
                navigationHistory: [{ sectionShortname: 'previous3' }, { sectionShortname: 'previous2', iterationContext: ['1234'] }]
            },
            submitted: true,
            errors: { field: { 'en': 'something' } },
            interview: { id: 2 } as UserRuntimeInterviewAttributes,
        }
        const action = {
            type: SurveyActionTypes.SET_INTERVIEW as const,
            interview: testInterview,
            interviewLoaded: true
        };
    
        const result =  {
            interview: testInterview,
            interviewLoaded: true,
            navigation: undefined,
            errors: undefined,
            submitted: undefined
        };
    
        expect(surveyReducer(initialState, action)).toEqual(result);
    });
})

describe('UPDATE_INTERVIEW action', () => {
    const updateAction = {
        type: SurveyActionTypes.UPDATE_INTERVIEW as const,
        interview: testInterview,
        interviewLoaded: true,
        submitted: true,
        errors: { field: { en: 'something' } }
    };

    test('updates the interview when ids match', () => {
        const currentInterview = { ...testInterview, is_completed: true };
        expect(
            surveyReducer(
                {
                    interview: currentInterview,
                    interviewLoaded: false
                },
                updateAction
            )
        ).toEqual({
            interview: updateAction.interview,
            interviewLoaded: true,
            submitted: true,
            errors: { field: { en: 'something' } }
        });
    });

    test.each([
        ['no interview is set', {}],
        ['interview id differs', { interview: { ...testInterview, id: 2 }, interviewLoaded: true }]
    ])('ignores the update when %s', (_title, initialState) => {
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        expect(surveyReducer(initialState, updateAction)).toEqual(initialState);
        expect(warnSpy).toHaveBeenCalledTimes(1);
        warnSpy.mockRestore();
    });
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

describe('SET_REVIEW_DECISIONS action', () => {
    const reviewDecisionsPayload = {
        reviewDecisions: [],
        reviewDecisionsByObject: {} as any,
        reviewDecisionStatusByObject: {} as any
    };

    test('stores review decisions as a separate slice', () => {
        const initialState = {
            interview: testInterview,
            interviewLoaded: true
        };

        expect(
            surveyReducer(initialState, {
                type: SurveyActionTypes.SET_REVIEW_DECISIONS as const,
                reviewDecisions: reviewDecisionsPayload
            })
        ).toEqual({ ...initialState, reviewDecisions: reviewDecisionsPayload });
    });

    test('setting a new interview resets review decisions', () => {
        const initialState = {
            interview: testInterview,
            interviewLoaded: true,
            reviewDecisions: reviewDecisionsPayload
        };

        const newState = surveyReducer(initialState, {
            type: SurveyActionTypes.SET_INTERVIEW as const,
            interview: testInterview,
            interviewLoaded: true
        });

        expect(newState.reviewDecisions).toBeUndefined();
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
