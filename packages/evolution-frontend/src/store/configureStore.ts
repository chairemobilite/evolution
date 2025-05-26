/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { createStore, Store, combineReducers, applyMiddleware, compose, Reducer } from 'redux';
import { thunk, ThunkMiddleware } from 'redux-thunk';

import { AuthAction, AuthActionTypes, AuthState, authReducer } from 'chaire-lib-frontend/lib/store/auth';
import { SurveyAction, SurveyState, surveyReducer } from '../store/survey';
import { LoadingStateAction, LoadingStateState, loadingStateReducer } from '../store/loadingState';

// __REDUX_DEVTOOLS_EXTENSION_COMPOSE__ is defined for react-redux-devtools which allows debugging redux state in the browser
declare global {
    interface Window {
        __REDUX_DEVTOOLS_EXTENSION_COMPOSE__?: typeof compose;
    }
}

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

export type RootState = {
    auth: AuthState;
    survey: SurveyState;
    loadingState: LoadingStateState;
};

const initialState: RootState = {
    auth: { isAuthenticated: false },
    survey: {} as SurveyState,
    loadingState: { loadingState: 0 }
};

// Create the combined reducer
const appReducer = combineReducers({
    auth: authReducer,
    survey: surveyReducer,
    loadingState: loadingStateReducer
});

// Root reducer wrapper that handles clearing state on logout
const rootReducer: Reducer<RootState, AuthAction | SurveyAction | LoadingStateAction> = (
    state,
    action: AuthAction | SurveyAction | LoadingStateAction
) => {
    // When a logout action is detected, reset the state
    if (action.type === AuthActionTypes.LOGOUT) {
        // Pass undefined as state to each reducer to get their initial states
        return appReducer(undefined, action);
    }

    // For all other actions, just use the combined reducer normally
    return appReducer(state, action);
};

// FIXME Use @reduxjs/toolkit instead to configure the store
export const configureStore = (preloadedState = initialState): Store => {
    const store: Store<RootState> = createStore<RootState, AuthAction | SurveyAction | LoadingStateAction>(
        rootReducer,
        preloadedState,
        composeEnhancers(applyMiddleware(thunk as ThunkMiddleware<RootState>))
    );
    return store;
};
