/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { LoadingStateActionTypes } from '../store/loadingState';

export const incrementLoadingState = () => ({
    type: LoadingStateActionTypes.INCREMENT_LOADING_STATE
});

export const decrementLoadingState = () => ({
    type: LoadingStateActionTypes.DECREMENT_LOADING_STATE
});
