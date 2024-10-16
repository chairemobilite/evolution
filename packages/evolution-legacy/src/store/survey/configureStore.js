/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { createStore, combineReducers, applyMiddleware, compose } from 'redux';
import thunk from 'redux-thunk';
import ReduxAsyncQueue from 'redux-async-queue';

import { authReducer } from 'chaire-lib-frontend/lib/store/auth';
import { surveyReducer } from 'evolution-frontend/lib/store/survey';
import { loadingStateReducer } from 'evolution-frontend/lib/store/loadingState';

// NOTE: no legacy import, can be moved to evolution-frontend

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

const initialState = {
  survey: {},
  loadingState: { loadingState: 0 }
};

const appReducer = combineReducers({
  auth: authReducer,
  survey: surveyReducer,
  loadingState: loadingStateReducer
});

const rootReducer = (state, action) => {
  if (action.type === 'LOGOUT') {
    return appReducer(initialState, action);
  }
  return appReducer(state, action);
}

export default () => {
  const store = createStore(
    rootReducer,
    initialState,
    composeEnhancers(applyMiddleware(thunk), applyMiddleware(ReduxAsyncQueue))
  );
  return store;
};
