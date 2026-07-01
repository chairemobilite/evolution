/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import type { SurveyObjectName } from 'evolution-common/lib/services/baseObjects/types';
import type { ReviewDecisionStatusForObject } from 'evolution-common/lib/services/reviews/types';
import ObjectReviewButtons from './ObjectReviewButtons';
import type { ObjectReviewHandlers } from './objectReviewHandlers';
import { isReviewableObjectType } from '../../../services/admin/reviewDecisionStatusHelper';

/**
 * Whether approve/reject controls would render for this survey object.
 * @param objectReviewHandlers - Review callbacks from InterviewStats
 * @param objectType - Survey object type key
 * @param objectUuid - Survey object uuid
 * @returns True when review controls are configured and the object is reviewable
 */
export const hasObjectReviewControls = (
    objectReviewHandlers: ObjectReviewHandlers | undefined,
    objectType: SurveyObjectName,
    objectUuid: string | undefined
): boolean => {
    if (!isReviewableObjectType(objectType)) {
        return false;
    }
    if (!objectReviewHandlers) {
        return false;
    }
    if (
        !objectReviewHandlers.onObjectReview &&
        !objectReviewHandlers.onObjectForceApprove &&
        !objectReviewHandlers.onObjectRequestReReview
    ) {
        return false;
    }
    return Boolean(objectUuid);
};

/**
 * Renders approve/reject/force-approve controls for one survey object.
 * @param objectReviewHandlers - Review callbacks from InterviewStats
 * @param objectType - Survey object type key
 * @param objectUuid - Survey object uuid
 * @param status - Aggregated review status for the object
 * @returns ObjectReviewButtons element, or null when the type is not reviewable, handlers or objectUuid are missing
 */
export const renderObjectReviewButtons = (
    objectReviewHandlers: ObjectReviewHandlers | undefined,
    objectType: SurveyObjectName,
    objectUuid: string | undefined,
    status?: ReviewDecisionStatusForObject
): React.ReactNode => {
    if (!hasObjectReviewControls(objectReviewHandlers, objectType, objectUuid)) {
        return null;
    }

    const handlers = objectReviewHandlers!;
    const uuid = objectUuid!;

    return (
        <ObjectReviewButtons
            objectType={objectType}
            objectUuid={uuid}
            status={status}
            canForceApprove={handlers.canForceApprove}
            onApprove={
                handlers.onObjectReview ? (type, id) => handlers.onObjectReview!(type, id, 'approve') : undefined
            }
            onReject={handlers.onObjectReview ? (type, id) => handlers.onObjectReview!(type, id, 'reject') : undefined}
            onForceApprove={handlers.onObjectForceApprove}
            onRequestReReview={handlers.onObjectRequestReReview}
        />
    );
};
