/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { loadingStateReducer } from '../reducer';
import { LoadingStateActionTypes } from '../types';

test('Test increment loading state', () => {
    const action = {
        type: LoadingStateActionTypes.INCREMENT_LOADING_STATE
    };

    const result =  {
        loadingState: 2
    };

    expect(loadingStateReducer({ loadingState : 1 }, action)).toEqual(result);
});

test('Test decrement loading state', () => {
    const action = {
        type: LoadingStateActionTypes.DECREMENT_LOADING_STATE
    };

    const result =  {
        loadingState: 1
    };

    expect(loadingStateReducer({ loadingState: 2 }, action)).toEqual(result);
});

test('Test decrement loading state, should not return negative value', () => {
    const action = {
        type: LoadingStateActionTypes.DECREMENT_LOADING_STATE
    };

    const result =  {
        loadingState: 0
    };

    expect(loadingStateReducer({ loadingState: 0 }, action)).toEqual(result);
    expect(loadingStateReducer({ loadingState: -1 }, action)).toEqual(result);
});
