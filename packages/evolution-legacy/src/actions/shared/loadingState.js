/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
export const incrementLoadingState = () => ({
  type: 'INCREMENT_LOADING_STATE',
});

export const decrementLoadingState = () => ({
  type: 'DECREMENT_LOADING_STATE',
});