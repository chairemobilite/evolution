/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
const actual = jest.requireActual<typeof import('../reviewDecisionStatusHelper')>('../reviewDecisionStatusHelper');

export const getReviewDecisionStatusForObject = jest.fn();

// Mirrors the real resolution, but over the mocked per-object status lookup.
export const getInheritedStatusForDisplay = (
    reviewDecisionStatusByObject: Parameters<typeof actual.getInheritedStatusForDisplay>[0],
    { objectType, objectUuid, inheritedStatus }: Parameters<typeof actual.getInheritedStatusForDisplay>[1]
) => {
    if (inheritedStatus === 'rejected') {
        return 'rejected';
    }
    const status = getReviewDecisionStatusForObject(reviewDecisionStatusByObject, objectType, objectUuid);
    if (actual.isReviewStatusRejectedForDisplay(status)) {
        return 'rejected';
    }
    return actual.isReviewStatusApprovedForDisplay(status) ? 'approved' : inheritedStatus;
};

export const isReviewableObjectType = actual.isReviewableObjectType;
export const isReviewStatusRejectedForDisplay = actual.isReviewStatusRejectedForDisplay;
export const isReviewStatusApprovedForDisplay = actual.isReviewStatusApprovedForDisplay;
export const getReviewDecisionStatusBoxClass = actual.getReviewDecisionStatusBoxClass;
export const buildSurveyObjectBoxClassName = actual.buildSurveyObjectBoxClassName;
export const getInterviewListRowClassName = actual.getInterviewListRowClassName;
export const getInterviewSearchResultClassName = actual.getInterviewSearchResultClassName;
export type { BuildSurveyObjectBoxClassNameOptions, InheritedReviewDisplayStatus } from '../reviewDecisionStatusHelper';
