/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
export enum LoadingStateActionTypes {
    INCREMENT_LOADING_STATE = 'INCREMENT_LOADING_STATE',
    DECREMENT_LOADING_STATE = 'DECREMENT_LOADING_STATE'
}

export type LoadingStateAction = {
    type: LoadingStateActionTypes.INCREMENT_LOADING_STATE | LoadingStateActionTypes.DECREMENT_LOADING_STATE;
};

export interface LoadingStateState {
    readonly loadingState?: number;
}
