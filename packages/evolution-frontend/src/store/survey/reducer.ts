/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { Reducer } from 'redux';
import { SurveyState, SurveyActionTypes, SurveyAction } from './types';

export const initialState: SurveyState = {};

const reducer: Reducer<SurveyState, SurveyAction> = (state = initialState, action: SurveyAction) => {
    switch (action.type) {
    case SurveyActionTypes.SET_INTERVIEW:
        return {
            ...state,
            interview: action.interview,
            interviewLoaded: action.interviewLoaded,
            // Reset navigation and other states for this newly set interview, to not clash with previous interviews
            navigation: undefined,
            errors: undefined,
            submitted: undefined,
            reviewDecisions: undefined
        };
    case SurveyActionTypes.UPDATE_INTERVIEW: {
        const currentInterviewId = state.interview?.id;
        const updatedInterviewId = action.interview.id;
        // Ignore stale updates from a previous interview (e.g. after switching
        // or resetting the interview before an in-flight update returns).
        if (currentInterviewId === undefined || currentInterviewId !== updatedInterviewId) {
            console.warn(
                `Ignoring interview update: current interview id is ${currentInterviewId}, updated interview id is ${updatedInterviewId}`
            );
            return state;
        }
        return {
            ...state,
            interview: action.interview,
            interviewLoaded: action.interviewLoaded,
            errors: action.errors,
            submitted: action.submitted
        };
    }
    case SurveyActionTypes.ADD_CONSENT:
        return {
            ...state,
            hasConsent: action.consented
        };
    case SurveyActionTypes.NAVIGATE: {
        const { targetSection } = action;
        return {
            ...state,
            navigation: {
                currentSection: targetSection,
                navigationHistory: state.navigation
                    ? [...state.navigation.navigationHistory, state.navigation.currentSection]
                    : []
            }
        };
    }
    case SurveyActionTypes.SET_REVIEW_DECISIONS:
        return {
            ...state,
            reviewDecisions: action.reviewDecisions
        };
    case SurveyActionTypes.INIT_NAVIGATE: {
        const { navigationService } = action;
        return {
            ...state,
            navigationService: navigationService
        };
    }
    default:
        return state;
    }
};

export { reducer as surveyReducer };
