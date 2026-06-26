/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import type {
    ReviewDecision,
    ReviewDecisionStatusByObject,
    ReviewDecisionStatusForObject,
    ReviewDecisionsByObject
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

const pushReview = (reviewDecisionsByObject: ReviewDecisionsByObject, review: ReviewDecision): void => {
    switch (review.objectType) {
    case 'interview':
        reviewDecisionsByObject.interview.push(review);
        break;
    case 'household':
        reviewDecisionsByObject.household.push(review);
        break;
    case 'home':
        reviewDecisionsByObject.home.push(review);
        break;
    case 'person':
        if (!reviewDecisionsByObject.persons[review.objectUuid]) {
            reviewDecisionsByObject.persons[review.objectUuid] = [];
        }
        reviewDecisionsByObject.persons[review.objectUuid].push(review);
        break;
    case 'journey':
        if (!reviewDecisionsByObject.journeys[review.objectUuid]) {
            reviewDecisionsByObject.journeys[review.objectUuid] = [];
        }
        reviewDecisionsByObject.journeys[review.objectUuid].push(review);
        break;
    case 'visitedPlace':
        if (!reviewDecisionsByObject.visitedPlaces[review.objectUuid]) {
            reviewDecisionsByObject.visitedPlaces[review.objectUuid] = [];
        }
        reviewDecisionsByObject.visitedPlaces[review.objectUuid].push(review);
        break;
    case 'trip':
        if (!reviewDecisionsByObject.trips[review.objectUuid]) {
            reviewDecisionsByObject.trips[review.objectUuid] = [];
        }
        reviewDecisionsByObject.trips[review.objectUuid].push(review);
        break;
    case 'segment':
        if (!reviewDecisionsByObject.segments[review.objectUuid]) {
            reviewDecisionsByObject.segments[review.objectUuid] = [];
        }
        reviewDecisionsByObject.segments[review.objectUuid].push(review);
        break;
    default:
        console.error(`Unknown review object type: ${review.objectType}`);
        break;
    }
};

/**
 * Groups review rows by survey object type and uuid.
 * @param reviewsArray - Flat list of reviewDecisions for an interview
 * @returns Reviews grouped by object type
 */
export const reviewDecisionsArrayToReviewDecisionsByObject = (reviewsArray: ReviewDecision[]): ReviewDecisionsByObject => {
    const reviewDecisionsByObject = emptyReviewDecisionsByObject();
    reviewsArray.forEach((review) => pushReview(reviewDecisionsByObject, review));
    return reviewDecisionsByObject;
};

/**
 * Computes aggregated review status for one object from reviewer decisions.
 * @param reviewDecisions - All reviewDecisions for the interview
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
    const objectReviews = reviewDecisions.filter(
        (review) => review.objectType === objectType && review.objectUuid === objectUuid
    );
    const approvalCount = objectReviews.filter((review) => review.decision === 'approve').length;
    const rejectionCount = objectReviews.filter((review) => review.decision === 'reject').length;
    const hasApprove = approvalCount > 0;
    const hasReject = rejectionCount > 0;

    return {
        objectType,
        objectUuid,
        approvalCount,
        rejectionCount,
        hasConflict: hasApprove && hasReject,
        currentUserDecision: currentUserId
            ? objectReviews.find((review) => review.userId === currentUserId)?.decision
            : undefined,
        isReviewed: objectReviews.length > 0
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
 * Computes aggregated review status for every object that has at least one review.
 * @param reviewDecisions - All reviewDecisions for the interview
 * @param currentUserId - Optional current reviewer user id
 * @returns Review status grouped by object type
 */
export const computeReviewDecisionStatusByObject = (
    reviewDecisions: ReviewDecision[],
    currentUserId?: number
): ReviewDecisionStatusByObject => {
    const reviewDecisionStatusByObject = emptyReviewDecisionStatusByObject();
    const objectKeys = new Set(reviewDecisions.map((review) => `${review.objectType}.${review.objectUuid}`));

    objectKeys.forEach((objectKey) => {
        const [objectType, objectUuid] = objectKey.split('.') as [SurveyObjectNames, string];
        const status = computeReviewDecisionStatusForObject(reviewDecisions, objectType, objectUuid, currentUserId);
        setReviewDecisionStatus(reviewDecisionStatusByObject, status);
    });

    return reviewDecisionStatusByObject;
};

/**
 * Builds the review payload returned to the admin review UI.
 * @param reviewDecisions - All reviewDecisions for the interview
 * @param currentUserId - Optional current reviewer user id
 * @returns Review lists and aggregated status
 */
export const buildInterviewReview = (reviewDecisions: ReviewDecision[], currentUserId?: number) => ({
    reviewDecisions,
    reviewDecisionsByObject: reviewDecisionsArrayToReviewDecisionsByObject(reviewDecisions),
    reviewDecisionStatusByObject: computeReviewDecisionStatusByObject(reviewDecisions, currentUserId)
});
