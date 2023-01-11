/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
export default (state = {}, action) => {
  switch (action.type) {
    case 'SET_INTERVIEW':
      return {
        interview:       action.interview,
        interviewLoaded: action.interviewLoaded,
      };
    case 'UPDATE_INTERVIEW':
      return {
        interview:       action.interview,
        interviewLoaded: action.interviewLoaded,
        errors:          action.errors,
        submitted:       action.submitted
      };
    default:
      return state;
  }
};