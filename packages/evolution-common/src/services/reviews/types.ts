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
    comment?: string;
    updatedAt?: string;
};

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
    currentUserDecision?: ReviewDecisionValue;
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
