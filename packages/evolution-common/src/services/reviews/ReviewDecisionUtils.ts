/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import type {
    ReviewDecisions,
    ReviewDecision,
    ReviewDecisionEffectiveStatus,
    ReviewDecisionsByObject,
    ReviewDecisionStatusByObject,
    ReviewDecisionStatusForObject
} from './types';
import type { SurveyObjectNames } from '../baseObjects/types';

const emptyReviewDecisionsByObject = (): ReviewDecisionsByObject => ({
    interview: [],
    household: [],
    home: [],
    persons: {},
    journeys: {},
    visitedPlaces: {},
    trips: {},
    segments: {}
});

const emptyReviewDecisionStatusByObject = (): ReviewDecisionStatusByObject => ({
    interview: [],
    household: [],
    home: [],
    persons: {},
    journeys: {},
    visitedPlaces: {},
    trips: {},
    segments: {}
});

const pushReviewDecision = (reviewDecisionsByObject: ReviewDecisionsByObject, reviewDecision: ReviewDecision): void => {
    switch (reviewDecision.objectType) {
    case 'interview':
        reviewDecisionsByObject.interview.push(reviewDecision);
        break;
    case 'household':
        reviewDecisionsByObject.household.push(reviewDecision);
        break;
    case 'home':
        reviewDecisionsByObject.home.push(reviewDecision);
        break;
    case 'person':
        if (!reviewDecisionsByObject.persons[reviewDecision.objectUuid]) {
            reviewDecisionsByObject.persons[reviewDecision.objectUuid] = [];
        }
        reviewDecisionsByObject.persons[reviewDecision.objectUuid].push(reviewDecision);
        break;
    case 'journey':
        if (!reviewDecisionsByObject.journeys[reviewDecision.objectUuid]) {
            reviewDecisionsByObject.journeys[reviewDecision.objectUuid] = [];
        }
        reviewDecisionsByObject.journeys[reviewDecision.objectUuid].push(reviewDecision);
        break;
    case 'visitedPlace':
        if (!reviewDecisionsByObject.visitedPlaces[reviewDecision.objectUuid]) {
            reviewDecisionsByObject.visitedPlaces[reviewDecision.objectUuid] = [];
        }
        reviewDecisionsByObject.visitedPlaces[reviewDecision.objectUuid].push(reviewDecision);
        break;
    case 'trip':
        if (!reviewDecisionsByObject.trips[reviewDecision.objectUuid]) {
            reviewDecisionsByObject.trips[reviewDecision.objectUuid] = [];
        }
        reviewDecisionsByObject.trips[reviewDecision.objectUuid].push(reviewDecision);
        break;
    case 'segment':
        if (!reviewDecisionsByObject.segments[reviewDecision.objectUuid]) {
            reviewDecisionsByObject.segments[reviewDecision.objectUuid] = [];
        }
        reviewDecisionsByObject.segments[reviewDecision.objectUuid].push(reviewDecision);
        break;
    default:
        console.error(`Unknown review object type: ${reviewDecision.objectType}`);
        break;
    }
};

/**
 * Groups review decision rows by survey object type and uuid.
 * @param reviewDecisions - Flat list of review decisions for an interview
 * @returns Review decisions grouped by object type
 */
export const reviewDecisionsArrayToReviewDecisionsByObject = (
    reviewDecisions: ReviewDecision[]
): ReviewDecisionsByObject => {
    const reviewDecisionsByObject = emptyReviewDecisionsByObject();
    reviewDecisions.forEach((reviewDecision) => pushReviewDecision(reviewDecisionsByObject, reviewDecision));
    return reviewDecisionsByObject;
};

const findForceApproveReviewDecision = (objectReviewDecisions: ReviewDecision[]): ReviewDecision | undefined =>
    objectReviewDecisions
        .filter((reviewDecision) => reviewDecision.forceApproved)
        .sort((left, right) => (right.updatedAt ?? '').localeCompare(left.updatedAt ?? ''))[0];

/**
 * Resolves export-gate status from reviewer counts and optional admin force-approve.
 * @param approvalCount - Number of approve decisions
 * @param rejectionCount - Number of reject decisions
 * @param isForceApproved - Whether an admin force-approved the object
 * @returns Effective review status for the object
 */
export const computeReviewDecisionEffectiveStatus = (
    approvalCount: number,
    rejectionCount: number,
    isForceApproved: boolean
): ReviewDecisionEffectiveStatus => {
    if (isForceApproved) {
        return 'forceApproved';
    }
    if (approvalCount > 0 && rejectionCount > 0) {
        return 'conflict';
    }
    if (approvalCount > 0) {
        return 'approved';
    }
    if (rejectionCount > 0) {
        return 'rejected';
    }
    return 'notReviewed';
};

/**
 * Computes aggregated review status for one object from reviewer decisions.
 * @param reviewDecisions - All review decisions for the interview
 * @param objectType - Survey object type
 * @param objectUuid - Survey object uuid
 * @param currentUserId - Optional current reviewer user id
 * @returns Aggregated review status for the object
 */
export const computeReviewDecisionStatusForObject = (
    reviewDecisions: ReviewDecision[],
    objectType: SurveyObjectNames,
    objectUuid: string,
    currentUserId?: number
): ReviewDecisionStatusForObject => {
    const objectReviewDecisions = reviewDecisions.filter(
        (reviewDecision) => reviewDecision.objectType === objectType && reviewDecision.objectUuid === objectUuid
    );
    const approvalCount = objectReviewDecisions.filter(
        (reviewDecision) => reviewDecision.decision === 'approve'
    ).length;
    const rejectionCount = objectReviewDecisions.filter(
        (reviewDecision) => reviewDecision.decision === 'reject'
    ).length;
    const hasApprove = approvalCount > 0;
    const hasReject = rejectionCount > 0;
    const reReviewRequestedUserIds = objectReviewDecisions
        .filter((reviewDecision) => reviewDecision.reReviewRequested)
        .map((reviewDecision) => reviewDecision.userId);
    const currentUserReviewDecision = currentUserId
        ? objectReviewDecisions.find((reviewDecision) => reviewDecision.userId === currentUserId)
        : undefined;
    const forceApproveReviewDecision = findForceApproveReviewDecision(objectReviewDecisions);
    const isForceApproved = forceApproveReviewDecision !== undefined;

    return {
        objectType,
        objectUuid,
        approvalCount,
        rejectionCount,
        hasConflict: hasApprove && hasReject,
        isForceApproved,
        forceApprovedByUserId: forceApproveReviewDecision?.userId,
        forceApproveComment: forceApproveReviewDecision?.forceApproveComment,
        effectiveStatus: computeReviewDecisionEffectiveStatus(approvalCount, rejectionCount, isForceApproved),
        currentUserDecision: currentUserReviewDecision?.decision,
        currentUserForceApproved: currentUserReviewDecision?.forceApproved,
        currentUserReReviewRequested: currentUserReviewDecision?.reReviewRequested,
        reReviewRequestedUserIds,
        isReviewed: objectReviewDecisions.length > 0
    };
};

const setReviewDecisionStatus = (
    reviewDecisionStatusByObject: ReviewDecisionStatusByObject,
    status: ReviewDecisionStatusForObject
): void => {
    switch (status.objectType) {
    case 'interview':
        reviewDecisionStatusByObject.interview.push(status);
        break;
    case 'household':
        reviewDecisionStatusByObject.household.push(status);
        break;
    case 'home':
        reviewDecisionStatusByObject.home.push(status);
        break;
    case 'person':
        reviewDecisionStatusByObject.persons[status.objectUuid] = status;
        break;
    case 'journey':
        reviewDecisionStatusByObject.journeys[status.objectUuid] = status;
        break;
    case 'visitedPlace':
        reviewDecisionStatusByObject.visitedPlaces[status.objectUuid] = status;
        break;
    case 'trip':
        reviewDecisionStatusByObject.trips[status.objectUuid] = status;
        break;
    case 'segment':
        reviewDecisionStatusByObject.segments[status.objectUuid] = status;
        break;
    default:
        break;
    }
};

/**
 * Computes aggregated review status for every object that has at least one review decision.
 * @param reviewDecisions - All review decisions for the interview
 * @param currentUserId - Optional current reviewer user id
 * @returns Review status grouped by object type
 */
export const computeReviewDecisionStatusByObject = (
    reviewDecisions: ReviewDecision[],
    currentUserId?: number
): ReviewDecisionStatusByObject => {
    const reviewDecisionStatusByObject = emptyReviewDecisionStatusByObject();
    const objectKeys = new Set(
        reviewDecisions.map((reviewDecision) => `${reviewDecision.objectType}.${reviewDecision.objectUuid}`)
    );

    objectKeys.forEach((objectKey) => {
        const [objectType, objectUuid] = objectKey.split('.') as [SurveyObjectNames, string];
        const status = computeReviewDecisionStatusForObject(reviewDecisions, objectType, objectUuid, currentUserId);
        setReviewDecisionStatus(reviewDecisionStatusByObject, status);
    });

    return reviewDecisionStatusByObject;
};

/**
 * Builds the review decisions payload returned to the admin review UI.
 * @param reviewDecisions - All review decisions for the interview
 * @param currentUserId - Optional current reviewer user id
 * @returns Review decision lists and aggregated status
 */
export const buildReviewDecisions = (reviewDecisions: ReviewDecision[], currentUserId?: number): ReviewDecisions => ({
    reviewDecisions,
    reviewDecisionsByObject: reviewDecisionsArrayToReviewDecisionsByObject(reviewDecisions),
    reviewDecisionStatusByObject: computeReviewDecisionStatusByObject(reviewDecisions, currentUserId)
});
