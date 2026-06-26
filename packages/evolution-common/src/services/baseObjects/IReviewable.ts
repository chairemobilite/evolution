/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import type { SurveyObjectNames } from './types';

/**
 * Marks a survey object that reviewers can approve or reject during manual review.
 * Review decisions are persisted in `sv_reviews` (not in the response JSON).
 *
 * TODO: replace {@link IValidatable}; `_isValid` on survey objects will be removed.
 */
export interface IReviewable {
    /**
     * Object type key stored in `sv_reviews.object_type`
     * (same convention as audits: `person`, `household`, `trip`, …).
     */
    getReviewObjectType(): SurveyObjectNames;

    /** UUID stored in `sv_reviews.object_uuid`. */
    getReviewObjectUuid(): string;
}
