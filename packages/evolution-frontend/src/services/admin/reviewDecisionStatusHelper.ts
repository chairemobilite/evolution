/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import projectConfig from 'evolution-common/lib/config/project.config';
import type { SurveyObjectNames } from 'evolution-common/lib/services/baseObjects/types';
import type {
    ReviewDecisionStatusByObject,
    ReviewDecisionStatusForObject
} from 'evolution-common/lib/services/reviews/types';

/**
 * Whether approve/reject controls should appear for this object type in the admin review UI.
 * @param objectType - Survey object type key
 * @returns True when the survey config lists this type as reviewable
 */
export const isReviewableObjectType = (objectType: SurveyObjectNames): boolean =>
    projectConfig.reviewableSurveyObjects.includes(objectType);

/**
 * Looks up aggregated review status for one survey object.
 * @param reviewDecisionStatusByObject - Review status grouped by object type
 * @param objectType - Survey object type key
 * @param objectUuid - Survey object uuid
 * @returns Review status for the object, if any
 */
export const getReviewDecisionStatusForObject = (
    reviewDecisionStatusByObject: ReviewDecisionStatusByObject | undefined,
    objectType: SurveyObjectNames,
    objectUuid: string | undefined
): ReviewDecisionStatusForObject | undefined => {
    if (!reviewDecisionStatusByObject || !objectUuid) {
        return undefined;
    }

    switch (objectType) {
    case 'interview':
        return reviewDecisionStatusByObject.interview.find((status) => status.objectUuid === objectUuid);
    case 'household':
        return reviewDecisionStatusByObject.household.find((status) => status.objectUuid === objectUuid);
    case 'home':
        return reviewDecisionStatusByObject.home.find((status) => status.objectUuid === objectUuid);
    case 'person':
        return reviewDecisionStatusByObject.persons[objectUuid];
    case 'journey':
        return reviewDecisionStatusByObject.journeys[objectUuid];
    case 'visitedPlace':
        return reviewDecisionStatusByObject.visitedPlaces[objectUuid];
    case 'trip':
        return reviewDecisionStatusByObject.trips[objectUuid];
    case 'segment':
        return reviewDecisionStatusByObject.segments[objectUuid];
    default:
        return undefined;
    }
};

/**
 * CSS modifier for a survey object box from its effective review status.
 * @param status - Aggregated review status for the object
 * @returns Class name suffix for the box, or empty when not reviewed / not reviewable
 */
export const getReviewDecisionStatusBoxClass = (status: ReviewDecisionStatusForObject | undefined): string => {
    if (!status || (!status.isReviewed && !status.isForceApproved)) {
        return '';
    }

    switch (status.effectiveStatus) {
    case 'rejected':
        return 'admin__survey-object-box--rejected';
    case 'approved':
    case 'forceApproved':
        return 'admin__survey-object-box--approved';
    case 'conflict':
        return 'admin__survey-object-box--conflict';
    default:
        return '';
    }
};

/**
 * Builds class names for a reviewable survey object box in the admin column.
 * @param objectType - Survey object type key
 * @param status - Aggregated review status for the object
 * @param extraClassNames - Additional classes (e.g. `_selectable`, `_widget_container`)
 * @param objectUuid - Survey object uuid; used to decide if review padding is needed
 * @returns Combined CSS class string
 */
export const buildSurveyObjectBoxClassName = (
    objectType: SurveyObjectNames,
    status: ReviewDecisionStatusForObject | undefined,
    extraClassNames = '',
    objectUuid?: string
): string => {
    const classes = ['admin__survey-object-box'];
    if (extraClassNames) {
        classes.push(extraClassNames);
    }
    if (objectUuid && isReviewableObjectType(objectType)) {
        classes.push('admin__survey-object-box--has-review');
    }
    const statusClass = getReviewDecisionStatusBoxClass(status);
    if (statusClass) {
        classes.push(statusClass);
    }
    return classes.join(' ');
};
