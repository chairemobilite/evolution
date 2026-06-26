/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import type { SurveyObjectNames } from 'evolution-common/lib/services/baseObjects/types';
import type { ReviewDecisionStatusForObject } from 'evolution-common/lib/services/reviews/types';
import ObjectReviewButtons from './ObjectReviewButtons';
import type { ObjectReviewHandlers } from './objectReviewHandlers';

/**
 * Renders approve/reject/force-approve controls for one survey object.
 * @param objectReviewHandlers - Review callbacks from InterviewStats
 * @param objectType - Survey object type key
 * @param objectUuid - Survey object uuid
 * @param status - Aggregated review status for the object
 * @returns ObjectReviewButtons element, or null when handlers are missing
 */
export const renderObjectReviewButtons = (
    objectReviewHandlers: ObjectReviewHandlers | undefined,
    objectType: SurveyObjectNames,
    objectUuid: string | undefined,
    status?: ReviewDecisionStatusForObject
): React.ReactNode => {
    if (!objectReviewHandlers) {
        return null;
    }

    return (
        <ObjectReviewButtons
            objectType={objectType}
            objectUuid={objectUuid}
            status={status}
            canForceApprove={objectReviewHandlers.canForceApprove}
            onApprove={(type, uuid) => objectReviewHandlers.onObjectReview(type, uuid, 'approve')}
            onReject={(type, uuid) => objectReviewHandlers.onObjectReview(type, uuid, 'reject')}
            onForceApprove={objectReviewHandlers.onObjectForceApprove}
            onRequestReReview={objectReviewHandlers.onObjectRequestReReview}
        />
    );
};
