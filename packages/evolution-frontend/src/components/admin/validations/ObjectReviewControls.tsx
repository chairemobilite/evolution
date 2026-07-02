/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import type { SurveyObjectName } from 'evolution-common/lib/services/baseObjects/types';
import ObjectReviewButtons from './ObjectReviewButtons';
import type { ObjectReview } from '../../../services/admin/useObjectReview';

export type ObjectReviewControlsProps = {
    /** Review state and callbacks from {@link useObjectReview}. */
    review: ObjectReview;
    /** Survey object type key. */
    objectType: SurveyObjectName;
    /** Survey object uuid; nothing renders when missing. */
    objectUuid: string | undefined;
};

/**
 * Connected approve/reject/force-approve controls for one survey object.
 * Receives review state from the parent so reviewability is decided once upstream.
 * @param props - Review state, object type, and uuid
 * @returns Review buttons, or null when the object is not reviewable
 */
const ObjectReviewControls: React.FC<ObjectReviewControlsProps> = ({ review, objectType, objectUuid }) => {
    if (!review.hasReviewControls) {
        return null;
    }

    return (
        <ObjectReviewButtons
            objectType={objectType}
            objectUuid={objectUuid}
            status={review.status}
            canForceApprove={review.canForceApprove}
            onApprove={review.approve}
            onReject={review.reject}
            onClearReview={review.clearReview}
            onForceApprove={review.forceApprove}
            onClearForceApprove={review.clearForceApprove}
            onRequestReReview={review.requestReReview}
        />
    );
};

export default ObjectReviewControls;
