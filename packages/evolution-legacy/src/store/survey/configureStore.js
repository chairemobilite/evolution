/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { createStore, combineReducers, applyMiddleware, compose } from 'redux';
import thunk from 'redux-thunk';
import ReduxAsyncQueue from 'redux-async-queue';
//import LogRocket from 'logrocket';
//LogRocket.init('9w4ag0/od_mtl_2018');

import { authReducer } from 'chaire-lib-frontend/lib/store/auth';
import { surveyReducer } from 'evolution-frontend/lib/store/survey';
import loadingStateReducer from '../../reducers/survey/loadingState';
//import config from 'chaire-lib-common/lib/config/shared/project.config';

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

const initialState = {
  //config
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
    //composeEnhancers(applyMiddleware(thunk, LogRocket.reduxMiddleware()))
  );
  return store;
};



 
