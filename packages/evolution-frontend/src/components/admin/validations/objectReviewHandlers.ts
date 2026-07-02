/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import type { SurveyObjectName } from 'evolution-common/lib/services/baseObjects/types';
import type { ReviewDecisionValue, ReviewDecisionStatusByObject } from 'evolution-common/lib/services/reviews/types';

/** Review UI callbacks and state passed from InterviewStats to object panels. */
export type ObjectReviewHandlers = {
    reviewDecisionStatusByObject?: ReviewDecisionStatusByObject;
    canForceApprove: boolean;
    onObjectReview?: (objectType: SurveyObjectName, objectUuid: string, decision: ReviewDecisionValue) => void;
    onObjectForceApprove?: (objectType: SurveyObjectName, objectUuid: string) => void;
    onObjectRequestReReview?: (objectType: SurveyObjectName, objectUuid: string) => void;
};
