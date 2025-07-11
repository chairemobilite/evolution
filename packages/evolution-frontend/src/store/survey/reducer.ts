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
            interviewLoaded: action.interviewLoaded
        };
    case SurveyActionTypes.UPDATE_INTERVIEW:
        return {
            ...state,
            interview: action.interview,
            interviewLoaded: action.interviewLoaded,
            errors: action.errors,
            submitted: action.submitted
        };
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
