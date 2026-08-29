/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import type { SurveyObjectName } from '../baseObjects/types';

/** Approve/reject value stored in `sv_review_decisions.decision_value`. */
export type ReviewDecisionValue = 'approve' | 'reject';

/**
 * A single reviewer decision on a survey object within an interview.
 */
export type ReviewDecision = {
    objectType: SurveyObjectName;
    objectUuid: string;
    userId: number;
    decision: ReviewDecisionValue;
    /** Comment left with the approve/reject decision. */
    comment?: string;
    /** True when this reviewer force-approved the object (admin override; kept with decision). */
    forceApproved?: boolean;
    /** Comment left with the force-approve action. */
    forceApproveComment?: string;
    /** True when this reviewer is asked to review the object again (GitHub-style re-request). */
    reReviewRequested?: boolean;
    /** User who requested the re-review (may differ from the target reviewer). */
    reReviewRequestedByUserId?: number;
    reReviewRequestedAt?: string;
    /** Comment explaining why a re-review was requested. */
    reReviewRequestComment?: string;
    updatedAt?: string;
};

/**
 * Aggregated review statuses an object can resolve to, ordered for display in
 * the admin interview list dropdown.
 */
export const reviewDecisionEffectiveStatuses = [
    'notReviewed',
    'approved',
    'rejected',
    'conflict',
    'forceApproved'
] as const;

export type ReviewDecisionEffectiveStatus = (typeof reviewDecisionEffectiveStatuses)[number];

/**
 * Review status values the admin interview list can be filtered on. Besides the
 * effective statuses, it accepts `all` (no filtering) and `notRejected`, which hides the
 * interviews whose status is `rejected`. An interview a reviewer rejected and another approved
 * is a `conflict`, not a rejection, and stays in the list: the disagreement is unsettled.
 */
export const interviewReviewStatusFilterValues = ['all', ...reviewDecisionEffectiveStatuses, 'notRejected'] as const;

export type InterviewReviewStatusFilter = (typeof interviewReviewStatusFilterValues)[number];

/**
 * Values offered by the status dropdown of the admin interview list: the review statuses, plus
 * `questionable`, which is a flag of its own column on the interview rather than a review status.
 */
export const interviewListStatusFilterValues = [...interviewReviewStatusFilterValues, 'questionable'] as const;

export type InterviewListStatusFilter = (typeof interviewListStatusFilterValues)[number];

/**
 * Aggregated review state for one object, derived from all reviewer decisions.
 */
export type ReviewDecisionStatusForObject = {
    objectType: SurveyObjectName;
    objectUuid: string;
    approvalCount: number;
    rejectionCount: number;
    /** True when at least one reviewer approved and another rejected the same object. */
    hasConflict: boolean;
    /** True when an admin force-approved this object (overrides conflicts). */
    isForceApproved: boolean;
    forceApprovedByUserId?: number;
    forceApproveComment?: string;
    /** Resolved status for export gates; force approve wins over reviewer disagreements. */
    effectiveStatus: ReviewDecisionEffectiveStatus;
    currentUserDecision?: ReviewDecisionValue;
    /** True when the current reviewer force-approved this object on their row. */
    currentUserForceApproved?: boolean;
    /** True when the current reviewer must look at this object again. */
    reReviewRequestedOfCurrentUser?: boolean;
    /** True when the current reviewer is the one who asked others to re-review this object. */
    reReviewRequestedByCurrentUser?: boolean;
    /** Reviewer user ids asked to re-review this object. */
    reReviewRequestedUserIds: number[];
    /** False when no reviewer has decided yet for this object. */
    isReviewed: boolean;
};

export const reviewUuidKeyedCollectionKeysByObjectType = {
    person: 'persons',
    journey: 'journeys',
    visitedPlace: 'visitedPlaces',
    trip: 'trips',
    segment: 'segments',
    organization: 'organizations',
    vehicle: 'vehicles',
    tripChain: 'tripChains',
    junction: 'junctions',
    workPlace: 'workPlaces',
    schoolPlace: 'schoolPlaces'
} as const;

export type UuidKeyedSurveyObjectName = keyof typeof reviewUuidKeyedCollectionKeysByObjectType;
export type SingletonSurveyObjectName = Exclude<SurveyObjectName, UuidKeyedSurveyObjectName>;

export type ReviewUuidKeyedCollectionKey =
    (typeof reviewUuidKeyedCollectionKeysByObjectType)[UuidKeyedSurveyObjectName];

/** UUID-keyed review buckets shared by grouped decision and status maps. */
export type ReviewCollectionsByUuid<TItem> = {
    [K in ReviewUuidKeyedCollectionKey]: {
        [key: string]: TItem;
    };
};

/** Singleton review buckets keyed by {@link SingletonSurveyObjectName}. */
type ReviewDecisionsBySingletonObject = {
    [K in SingletonSurveyObjectName]: ReviewDecision[];
};

export type ReviewDecisionsByObject = ReviewDecisionsBySingletonObject & ReviewCollectionsByUuid<ReviewDecision[]>;

/** Optional singleton review status entries keyed by {@link SingletonSurveyObjectName}. */
type ReviewDecisionStatusBySingletonObject = {
    [K in SingletonSurveyObjectName]?: ReviewDecisionStatusForObject;
};

export type ReviewDecisionStatusByObject = ReviewDecisionStatusBySingletonObject &
    ReviewCollectionsByUuid<ReviewDecisionStatusForObject>;

/**
 * Reviewer decisions for one interview, grouped for the admin review UI.
 */
export type ReviewDecisions = {
    reviewDecisions: ReviewDecision[];
    reviewDecisionsByObject: ReviewDecisionsByObject;
    reviewDecisionStatusByObject: ReviewDecisionStatusByObject;
};
