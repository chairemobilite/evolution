/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import projectConfig from 'evolution-common/lib/config/project.config';
import type { SurveyObjectName } from 'evolution-common/lib/services/baseObjects/types';
import type {
    ReviewDecisionEffectiveStatus,
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
        return reviewDecisionStatusByObject.persons?.[objectUuid];
    case 'journey':
        return reviewDecisionStatusByObject.journeys?.[objectUuid];
    case 'visitedPlace':
        return reviewDecisionStatusByObject.visitedPlaces?.[objectUuid];
    case 'trip':
        return reviewDecisionStatusByObject.trips?.[objectUuid];
    case 'segment':
        return reviewDecisionStatusByObject.segments?.[objectUuid];
    case 'organization':
        return reviewDecisionStatusByObject.organizations?.[objectUuid];
    case 'vehicle':
        return reviewDecisionStatusByObject.vehicles?.[objectUuid];
    case 'tripChain':
        return reviewDecisionStatusByObject.tripChains?.[objectUuid];
    case 'junction':
        return reviewDecisionStatusByObject.junctions?.[objectUuid];
    case 'workPlace':
        return reviewDecisionStatusByObject.workPlaces?.[objectUuid];
    case 'schoolPlace':
        return reviewDecisionStatusByObject.schoolPlaces?.[objectUuid];
    default: {
        // Compile-time guard: fails to build if a new SurveyObjectName is not handled above.
        const exhaustiveCheck: never = objectType;
        return exhaustiveCheck;
    }
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
 * Whether a review status should show as approved in the admin UI (own decision or aggregate).
 * An approval the other reviewers contradict does not count: a conflict is unsettled, and
 * showing it as approved would hide the disagreement from the reviewer who approved.
 * @param status - Aggregated review status for the object
 * @returns True when the object is approved for display purposes
 */
export const isReviewStatusApprovedForDisplay = (status: ReviewDecisionStatusForObject | undefined): boolean =>
    status?.effectiveStatus === 'approved' ||
    status?.effectiveStatus === 'forceApproved' ||
    (status?.currentUserDecision === 'approve' && status?.effectiveStatus !== 'conflict');

/**
 * Decision an object passes down to its children for display only: approving or
 * rejecting an object implicitly covers everything it contains, without creating
 * decisions for the children in the database.
 */
export type InheritedReviewDisplayStatus = 'rejected' | 'approved';

/**
 * Review decision an object shows and passes down, from its own decision and its ancestors'.
 * A rejection anywhere in the ancestry wins, so an approved interview containing a rejected
 * person still shows that person, and everything below it, as rejected.
 * @param reviewDecisionStatusByObject - Review status grouped by object type
 * @param object - Object the decision is displayed for
 * @param object.objectType - Survey object type key
 * @param object.objectUuid - Survey object uuid
 * @param object.inheritedStatus - Decision already inherited from the ancestors
 * @returns The decision to display, or undefined when neither the object nor its ancestors were reviewed
 */
export const getInheritedStatusForDisplay = (
    reviewDecisionStatusByObject: ReviewDecisionStatusByObject | undefined,
    {
        objectType,
        objectUuid,
        inheritedStatus
    }: {
        objectType: SurveyObjectName;
        objectUuid: string | undefined;
        inheritedStatus?: InheritedReviewDisplayStatus;
    }
): InheritedReviewDisplayStatus | undefined => {
    if (inheritedStatus === 'rejected') {
        return 'rejected';
    }
    const status = getReviewDecisionStatusForObject(reviewDecisionStatusByObject, objectType, objectUuid);
    if (isReviewStatusRejectedForDisplay(status)) {
        return 'rejected';
    }
    return isReviewStatusApprovedForDisplay(status) ? 'approved' : inheritedStatus;
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
 * Colour classes of an interview row in the admin lists, by interview-level
 * review status. `approved` is resolved separately, since an approved interview
 * the participant never completed still needs the reviewer's attention.
 */
const listRowClassNameByReviewStatus: Record<Exclude<ReviewDecisionEffectiveStatus, 'approved'>, string> = {
    forceApproved: '_green _strong _active-background',
    conflict: '_yellow _strong',
    rejected: '_dark-red _strong',
    notReviewed: ''
};

/**
 * Colour classes of one interview row of the admin interview lists.
 * @param interview - Review status and completion of the interview on the row
 * @returns Space-separated CSS class names, empty when the row needs no colour
 */
export const getInterviewListRowClassName = (interview: {
    reviewStatus: ReviewDecisionEffectiveStatus;
    isCompleted?: boolean;
}): string => {
    if (interview.reviewStatus === 'approved') {
        return interview.isCompleted ? '_dark-green _strong' : '_orange _strong';
    }
    return listRowClassNameByReviewStatus[interview.reviewStatus] ?? '';
};

/**
 * Colour classes of one interview of the admin interview search results. An
 * incomplete interview shows as incomplete whatever the reviewers decided, so
 * the rejected colour only applies to completed interviews.
 * @param interview - Review status and completion of the interview
 * @returns Space-separated CSS class names, empty when the row needs no colour
 */
export const getInterviewSearchResultClassName = (interview: {
    reviewStatus: ReviewDecisionEffectiveStatus;
    isCompleted?: boolean;
}): string => {
    if (interview.isCompleted !== true) {
        return '_orange _strong';
    }
    if (interview.reviewStatus === 'approved' || interview.reviewStatus === 'forceApproved') {
        return '_green _strong _active-background';
    }
    return interview.reviewStatus === 'rejected' ? '_dark-red _strong' : '';
};

export type BuildSurveyObjectBoxClassNameOptions = {
    objectType: SurveyObjectName;
    status?: ReviewDecisionStatusForObject;
    extraClassNames?: string;
    objectUuid?: string;
    inheritedStatus?: InheritedReviewDisplayStatus;
    hasReviewControls?: boolean;
    nested?: boolean;
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
    inheritedStatus,
    hasReviewControls,
    nested = false
}: BuildSurveyObjectBoxClassNameOptions): string => {
    const classes = ['admin__survey-object-box'];
    if (extraClassNames) {
        classes.push(extraClassNames);
    }
    if (nested) {
        classes.push('admin__survey-object-box--nested');
    }
    const showReviewGutter = hasReviewControls ?? Boolean(objectUuid && isReviewableObjectType(objectType));
    if (showReviewGutter) {
        classes.push('admin__survey-object-box--has-review');
    }
    // An inherited rejection overrides the object's own decision, while an inherited approval
    // only applies to objects nobody reviewed individually.
    const statusClass =
        inheritedStatus === 'rejected'
            ? 'admin__survey-object-box--rejected'
            : getReviewDecisionStatusBoxClass(status) ||
              (inheritedStatus === 'approved' ? 'admin__survey-object-box--approved' : '');
    if (statusClass) {
        classes.push(statusClass);
    }
    return classes.join(' ');
};
