/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { Reducer } from 'redux';
import { LoadingStateState, LoadingStateActionTypes, LoadingStateAction } from './types';

export const initialState: LoadingStateState = {
    loadingState: 0
};

const reducer: Reducer<LoadingStateState, LoadingStateAction> = (state = initialState, action) => {
    switch (action.type) {
    case LoadingStateActionTypes.INCREMENT_LOADING_STATE:
        return {
            loadingState: Math.max((state?.loadingState ?? 0) + 1, 0)
        };
    case LoadingStateActionTypes.DECREMENT_LOADING_STATE:
        return {
            loadingState: Math.max((state?.loadingState ?? 0) - 1, 0)
        };
    default:
        return state;
    }
};

export { reducer as loadingStateReducer };
