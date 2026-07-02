/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import type { SurveyObjectsWithAudits } from '../audits/types';
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

export type ReviewDecisionEffectiveStatus = 'forceApproved' | 'approved' | 'rejected' | 'conflict' | 'notReviewed';

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
    currentUserReReviewRequested?: boolean;
    /** Reviewer user ids asked to re-review this object. */
    reReviewRequestedUserIds: number[];
    /** False when no reviewer has decided yet for this object. */
    isReviewed: boolean;
};

type SingletonSurveyObjectName = 'interview' | 'household' | 'home';
type UuidKeyedSurveyObjectName = Exclude<SurveyObjectName, SingletonSurveyObjectName>;

/**
 * Maps uuid-keyed survey object types to their review bucket property names.
 * Must stay in sync with `surveyObjectNames` and `ReviewCollectionsByUuid`.
 */
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
} as const satisfies Record<UuidKeyedSurveyObjectName, string>;

export type ReviewUuidKeyedCollectionKey =
    (typeof reviewUuidKeyedCollectionKeysByObjectType)[UuidKeyedSurveyObjectName];

/** UUID-keyed review buckets shared by grouped decision and status maps. */
export type ReviewCollectionsByUuid<TItem> = {
    [K in ReviewUuidKeyedCollectionKey]: {
        [key: string]: TItem;
    };
};

export type ReviewDecisionsByObject = {
    interview: ReviewDecision[];
    household: ReviewDecision[];
    home: ReviewDecision[];
} & ReviewCollectionsByUuid<ReviewDecision[]>;

export type ReviewDecisionStatusByObject = {
    interview?: ReviewDecisionStatusForObject;
    household?: ReviewDecisionStatusForObject;
    home?: ReviewDecisionStatusForObject;
} & ReviewCollectionsByUuid<ReviewDecisionStatusForObject>;

/**
 * Reviewer decisions for one interview, grouped for the admin review UI.
 */
export type ReviewDecisions = {
    reviewDecisions: ReviewDecision[];
    reviewDecisionsByObject: ReviewDecisionsByObject;
    reviewDecisionStatusByObject: ReviewDecisionStatusByObject;
};

/**
 * Survey objects with automated audits and manual reviewer decisions.
 * Canonical type for the `surveyObjectsAndAuditsAndReviewDecisions` admin API and Redux payload.
 */
export type SurveyObjectsWithAuditsAndReviewDecisions = SurveyObjectsWithAudits & ReviewDecisions;
