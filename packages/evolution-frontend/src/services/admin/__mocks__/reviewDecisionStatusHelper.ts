/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
const actual = jest.requireActual<typeof import('../reviewDecisionStatusHelper')>('../reviewDecisionStatusHelper');

export const getReviewDecisionStatusForObject = jest.fn();

export const getRejectedForDisplay = (
    reviewDecisionStatusByObject: Parameters<typeof actual.getRejectedForDisplay>[0],
    objectType: Parameters<typeof actual.getRejectedForDisplay>[1],
    objectUuid: Parameters<typeof actual.getRejectedForDisplay>[2],
    inheritedRejected = false
) =>
    inheritedRejected ||
    actual.isReviewStatusRejectedForDisplay(
        getReviewDecisionStatusForObject(reviewDecisionStatusByObject, objectType, objectUuid)
    );

export const isReviewableObjectType = actual.isReviewableObjectType;
export const isReviewStatusRejectedForDisplay = actual.isReviewStatusRejectedForDisplay;
export const getReviewDecisionStatusBoxClass = actual.getReviewDecisionStatusBoxClass;
export const buildSurveyObjectBoxClassName = actual.buildSurveyObjectBoxClassName;
export type { BuildSurveyObjectBoxClassNameOptions } from '../reviewDecisionStatusHelper';
