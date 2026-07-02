/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import projectConfig from 'evolution-common/lib/config/project.config';
import type { SurveyObjectName } from 'evolution-common/lib/services/baseObjects/types';
import type {
    ReviewDecisionStatusByObject,
    ReviewDecisionStatusForObject
} from 'evolution-common/lib/services/reviews/types';

/**
 * Whether approve/reject controls should appear for this object type in the admin review UI.
 * @param objectType - Survey object type key
 * @returns True when the survey config lists this type as reviewable
 */
export const isReviewableObjectType = (objectType: SurveyObjectName): boolean =>
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
    objectType: SurveyObjectName,
    objectUuid: string | undefined
): ReviewDecisionStatusForObject | undefined => {
    if (!reviewDecisionStatusByObject || !objectUuid) {
        return undefined;
    }

    switch (objectType) {
    case 'interview': {
        const status = reviewDecisionStatusByObject.interview;
        return status?.objectUuid === objectUuid ? status : undefined;
    }
    case 'household': {
        const status = reviewDecisionStatusByObject.household;
        return status?.objectUuid === objectUuid ? status : undefined;
    }
    case 'home': {
        const status = reviewDecisionStatusByObject.home;
        return status?.objectUuid === objectUuid ? status : undefined;
    }
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
    case 'organization':
        return reviewDecisionStatusByObject.organizations[objectUuid];
    case 'vehicle':
        return reviewDecisionStatusByObject.vehicles[objectUuid];
    case 'tripChain':
        return reviewDecisionStatusByObject.tripChains[objectUuid];
    case 'junction':
        return reviewDecisionStatusByObject.junctions[objectUuid];
    case 'workPlace':
        return reviewDecisionStatusByObject.workPlaces[objectUuid];
    case 'schoolPlace':
        return reviewDecisionStatusByObject.schoolPlaces[objectUuid];
    default:
        return undefined;
    }
};

/**
 * Whether a review status should show as rejected in the admin UI (own decision or aggregate).
 * @param status - Aggregated review status for the object
 * @returns True when the object is rejected for display purposes
 */
export const isReviewStatusRejectedForDisplay = (status: ReviewDecisionStatusForObject | undefined): boolean =>
    status?.effectiveStatus === 'rejected' || status?.currentUserDecision === 'reject';

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

export type BuildSurveyObjectBoxClassNameOptions = {
    objectType: SurveyObjectName;
    status?: ReviewDecisionStatusForObject;
    extraClassNames?: string;
    objectUuid?: string;
    inheritedRejected?: boolean;
    hasReviewControls?: boolean;
};

/**
 * Builds class names for a reviewable survey object box in the admin column.
 * @param options - Object type, review status, layout flags, and optional gutter override
 * @returns Combined CSS class string
 */
export const buildSurveyObjectBoxClassName = ({
    objectType,
    status,
    extraClassNames = '',
    objectUuid,
    inheritedRejected = false,
    hasReviewControls
}: BuildSurveyObjectBoxClassNameOptions): string => {
    const classes = ['admin__survey-object-box'];
    if (extraClassNames) {
        classes.push(extraClassNames);
    }
    const showReviewGutter = hasReviewControls ?? Boolean(objectUuid && isReviewableObjectType(objectType));
    if (showReviewGutter) {
        classes.push('admin__survey-object-box--has-review');
    }
    const statusClass = inheritedRejected
        ? 'admin__survey-object-box--rejected'
        : getReviewDecisionStatusBoxClass(status);
    if (statusClass) {
        classes.push(statusClass);
    }
    return classes.join(' ');
};
