/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import type { ParentSurveyObjects } from '../baseObjects/types';
import type { SurveyObjectNames } from '../baseObjects/types';
export type ReviewDecisionValue = 'approve' | 'reject';

/**
 * A single reviewer decision on a survey object within an interview.
 */
export type ReviewDecision = {
    objectType: SurveyObjectNames;
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
    objectType: SurveyObjectNames;
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

export type ReviewDecisionsByObject = {
    interview: ReviewDecision[];
    household: ReviewDecision[];
    home: ReviewDecision[];
    persons: {
        [key: string]: ReviewDecision[];
    };
    journeys: {
        [key: string]: ReviewDecision[];
    };
    visitedPlaces: {
        [key: string]: ReviewDecision[];
    };
    trips: {
        [key: string]: ReviewDecision[];
    };
    segments: {
        [key: string]: ReviewDecision[];
    };
};

export type ReviewDecisionStatusByObject = {
    interview: ReviewDecisionStatusForObject[];
    household: ReviewDecisionStatusForObject[];
    home: ReviewDecisionStatusForObject[];
    persons: {
        [key: string]: ReviewDecisionStatusForObject;
    };
    journeys: {
        [key: string]: ReviewDecisionStatusForObject;
    };
    visitedPlaces: {
        [key: string]: ReviewDecisionStatusForObject;
    };
    trips: {
        [key: string]: ReviewDecisionStatusForObject;
    };
    segments: {
        [key: string]: ReviewDecisionStatusForObject;
    };
};

/**
 * Reviewer decisions for one interview, grouped for the admin review UI.
 */
export type ReviewDecisions = {
    reviewDecisions: ReviewDecision[];
    reviewDecisionsByObject: ReviewDecisionsByObject;
    reviewDecisionStatusByObject: ReviewDecisionStatusByObject;
};

export type SurveyObjectsWithReviews = ParentSurveyObjects & InterviewReview;

/** Survey objects with automated audits and manual reviewer decisions. */
export type SurveyObjectsWithAuditsAndReviewDecisions = ParentSurveyObjects & InterviewReview;
