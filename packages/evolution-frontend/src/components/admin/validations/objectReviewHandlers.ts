/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import type { SurveyObjectNames } from 'evolution-common/lib/services/baseObjects/types';
import type { ReviewDecisionValue, ReviewDecisionStatusByObject } from 'evolution-common/lib/services/reviews/types';

/** Review UI callbacks and state passed from InterviewStats to object panels. */
export type ObjectReviewHandlers = {
    reviewDecisionStatusByObject?: ReviewDecisionStatusByObject;
    canForceApprove: boolean;
    onObjectReview: (objectType: SurveyObjectNames, objectUuid: string, decision: ReviewDecisionValue) => void;
    onObjectForceApprove: (objectType: SurveyObjectNames, objectUuid: string) => void;
    onObjectRequestReReview: (objectType: SurveyObjectNames, objectUuid: string) => void;
};
