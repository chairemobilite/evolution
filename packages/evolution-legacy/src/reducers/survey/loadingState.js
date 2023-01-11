/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
export default (state = {}, action) => {
  switch (action.type) {
    case 'INCREMENT_LOADING_STATE':
      return {
        loadingState: state.loadingState + 1
      };
    case 'DECREMENT_LOADING_STATE':
      return {
        loadingState: state.loadingState - 1
      };
    default:
      return state;
  }
};