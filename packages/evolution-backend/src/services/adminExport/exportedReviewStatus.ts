/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import type { SurveyObjectName } from 'evolution-common/lib/services/baseObjects/types';
import type { ReviewDecisionEffectiveStatus } from 'evolution-common/lib/services/reviews/types';

/**
 * Function returning the effective review status of an object of the
 * interview being visited, from the review decisions on this object only
 */
export type GetReviewStatus = (objectType: SurveyObjectName, objectUuid: string) => ReviewDecisionEffectiveStatus;

/** Statuses of a parent that its non-reviewed children inherit */
const inheritedParentStatuses: ReviewDecisionEffectiveStatus[] = ['approved', 'forceApproved', 'rejected'];

/**
 * Get the review status to export for a survey object. An object that no
 * reviewer approved or rejected takes the status of its parent when the
 * parent is approved or rejected, as a decision on an object also applies to
 * the objects it contains. A parent in conflict is not inherited, as its
 * status is not settled. Otherwise, the object keeps its own status.
 *
 * @param {ReviewDecisionEffectiveStatus} status - Effective review status of the object
 * @param {ReviewDecisionEffectiveStatus} [parentStatus] - Exported review status of the
 * parent, undefined for objects without a parent
 * @returns {ReviewDecisionEffectiveStatus} The review status to export
 */
export const getExportedReviewStatus = (
    status: ReviewDecisionEffectiveStatus,
    parentStatus?: ReviewDecisionEffectiveStatus
): ReviewDecisionEffectiveStatus =>
    status === 'notReviewed' && parentStatus !== undefined && inheritedParentStatuses.includes(parentStatus)
        ? parentStatus
        : status;
