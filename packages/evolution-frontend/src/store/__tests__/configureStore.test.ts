/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { AuthActionTypes } from 'chaire-lib-frontend/lib/store/auth';
import { configureStore } from '../configureStore';
import { SurveyActionTypes } from '../survey';
import { UserRuntimeInterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';

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

describe('configureStore', () => {
    let store;

    beforeEach(() => {
        store = configureStore();
    });

    it('should initialize with the correct default state', () => {
        const state = store.getState();
        expect(state).toEqual({
            auth: { isAuthenticated: false },
            survey: {},
            loadingState: { loadingState: 0 }
        });
    });

    it('should handle actions and update state correctly', () => {
        const loginAction = { type: AuthActionTypes.LOGIN, user: null, isAuthenticated: true, register: false, login: true };
        store.dispatch(loginAction);
        const state = store.getState();
        expect(state.auth).toEqual({
            isAuthenticated: true,
            user: null,
            register: false,
            login: true
        });
    });

    it('should reset state on logout', () => {
        // Set interview, with an update interview action
        const action = {
            type: SurveyActionTypes.UPDATE_INTERVIEW as const,
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
        store.dispatch(action);
        const stateAfterUpdate = store.getState();
        expect(stateAfterUpdate.survey).toEqual(result);

        // Call the logout action and make sure the action is reset
        const logoutAction = { type: AuthActionTypes.LOGOUT, isAuthenticated: false };
        store.dispatch(logoutAction);
        const state = store.getState();
        expect(state).toEqual({
            auth: { isAuthenticated: false },
            survey: {},
            loadingState: { loadingState: 0 }
        });
    });

    it('should allow preloaded state to be passed', () => {
        const preloadedState = {
            auth: { isAuthenticated: true },
            survey: { someSurveyData: 'test' },
            loadingState: { loadingState: 1 }
        };
        const storeWithPreloadedState = configureStore(preloadedState as any);
        const state = storeWithPreloadedState.getState();
        expect(state).toEqual(preloadedState);
    });
});