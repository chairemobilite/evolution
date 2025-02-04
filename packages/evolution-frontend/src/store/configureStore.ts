/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { createStore, Store, combineReducers, applyMiddleware, compose, CombinedState, AnyAction } from 'redux';
import thunk from 'redux-thunk';

import { AuthState, authReducer } from 'chaire-lib-frontend/lib/store/auth';
import { SurveyState, surveyReducer } from '../store/survey';
import { LoadingStateState, loadingStateReducer } from '../store/loadingState';

// __REDUX_DEVTOOLS_EXTENSION_COMPOSE__ is defined for react-redux-devtools which allows debugging redux state in the browser
declare global {
    interface Window {
        __REDUX_DEVTOOLS_EXTENSION_COMPOSE__?: typeof compose;
    }
}

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

const initialState: {
    auth: AuthState;
    survey: SurveyState;
    loadingState: LoadingStateState;
} = {
    auth: { isAuthenticated: false },
    survey: {},
    loadingState: { loadingState: 0 }
};

const appReducer = combineReducers({
    auth: authReducer,
    survey: surveyReducer,
    loadingState: loadingStateReducer
});

const rootReducer = (state: CombinedState<typeof initialState> | undefined, action: AnyAction) => {
    if (action.type === 'LOGOUT') {
        return appReducer(initialState, action);
    }
    return appReducer(state, action);
};

export default () => {
    const store: Store<typeof initialState> = createStore(
        rootReducer,
        initialState,
        composeEnhancers(applyMiddleware(thunk))
    );
    return store;
};
