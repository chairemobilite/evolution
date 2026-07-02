/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBan } from '@fortawesome/free-solid-svg-icons/faBan';
import { faCheck } from '@fortawesome/free-solid-svg-icons/faCheck';
import { faCheckDouble } from '@fortawesome/free-solid-svg-icons/faCheckDouble';
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons/faTriangleExclamation';
import { faRotate } from '@fortawesome/free-solid-svg-icons/faRotate';
import type { SurveyObjectName } from 'evolution-common/lib/services/baseObjects/types';
import type { ReviewDecisionStatusForObject } from 'evolution-common/lib/services/reviews/types';
import { isReviewableObjectType } from '../../../services/admin/reviewDecisionStatusHelper';

export type ObjectReviewButtonsProps = {
    objectType: SurveyObjectName;
    objectUuid: string | undefined;
    status?: ReviewDecisionStatusForObject;
    canForceApprove: boolean;
    onApprove?: (objectType: SurveyObjectName, objectUuid: string) => void;
    onReject?: (objectType: SurveyObjectName, objectUuid: string) => void;
    onForceApprove?: (objectType: SurveyObjectName, objectUuid: string) => void;
    onRequestReReview?: (objectType: SurveyObjectName, objectUuid: string) => void;
};

/**
 * Approve/reject controls for one reviewable survey object in the admin column.
 * Active decision shows a circular background at 0.3 opacity. Conflicts show a warning icon.
 * @param props.objectType - Survey object type key
 * @param props.objectUuid - Survey object uuid
 * @param props.status - Aggregated review status for this object
 * @param props.canForceApprove - Whether the user may force-approve (confirm permission)
 * @param props.onApprove - Called when the reviewer approves
 * @param props.onReject - Called when the reviewer rejects
 * @param props.onForceApprove - Called when an admin force-approves
 * @param props.onRequestReReview - Called to ask the other reviewers to look again
 */
const ObjectReviewButtons: React.FC<ObjectReviewButtonsProps> = ({
    objectType,
    objectUuid,
    status,
    canForceApprove,
    onApprove,
    onReject,
    onForceApprove,
    onRequestReReview
}) => {
    const { t } = useTranslation('admin');

    if (!objectUuid || !isReviewableObjectType(objectType)) {
        return null;
    }

    const stopClickPropagation = (event: React.MouseEvent) => {
        event.stopPropagation();
        event.preventDefault();
    };

    const stopKeyboardPropagation = (event: React.KeyboardEvent) => {
        event.stopPropagation();
    };

    const currentDecision = status?.currentUserDecision;
    const rejectPressed = currentDecision === 'reject';
    const showApproveActive = currentDecision === 'approve';
    const showConflictWarning = status?.effectiveStatus === 'conflict';
    const currentUserForceApproved = status?.currentUserForceApproved === true;
    // Number of reviewers other than the current user who already decided on this object.
    const reviewerCount = (status?.approvalCount ?? 0) + (status?.rejectionCount ?? 0);
    const otherReviewersCount = reviewerCount - (currentDecision !== undefined ? 1 : 0);
    const reReviewPending = (status?.reReviewRequestedUserIds?.length ?? 0) > 0;
    const askedToReReview = status?.currentUserReReviewRequested === true;

    return (
        <span
            className="admin__survey-object-box__review-controls"
            onClick={stopClickPropagation}
            onKeyDown={stopKeyboardPropagation}
        >
            {askedToReReview && (
                <FontAwesomeIcon
                    icon={faRotate}
                    className="_yellow admin__survey-object-box__review-warning"
                    title={t('interviewMember.reReviewRequested')}
                    aria-label={t('interviewMember.reReviewRequested')}
                    role="img"
                />
            )}
            {showConflictWarning && (
                <FontAwesomeIcon
                    icon={faTriangleExclamation}
                    className="_yellow admin__survey-object-box__review-warning"
                    title={t('interviewMember.reviewConflict')}
                    aria-label={t('interviewMember.reviewConflict')}
                    role="img"
                />
            )}
            {onReject && (
                <button
                    type="button"
                    className={`admin__survey-object-box__review-button _red${
                        rejectPressed ? ' admin__survey-object-box__review-button--active-reject' : ''
                    }`}
                    title={t('interviewMember.rejectObject')}
                    aria-label={t('interviewMember.rejectObject')}
                    aria-pressed={rejectPressed}
                    onClick={(event) => {
                        stopClickPropagation(event);
                        onReject(objectType, objectUuid);
                    }}
                >
                    <FontAwesomeIcon icon={faBan} />
                </button>
            )}
            {onApprove && (
                <button
                    type="button"
                    className={`admin__survey-object-box__review-button _green${
                        showApproveActive ? ' admin__survey-object-box__review-button--active-approve' : ''
                    }`}
                    title={t('interviewMember.approveObject')}
                    aria-label={t('interviewMember.approveObject')}
                    aria-pressed={showApproveActive}
                    onClick={(event) => {
                        stopClickPropagation(event);
                        onApprove(objectType, objectUuid);
                    }}
                >
                    <FontAwesomeIcon icon={faCheck} />
                </button>
            )}
            {canForceApprove && onForceApprove && (status?.hasConflict || status?.isForceApproved) && (
                <button
                    type="button"
                    className={`admin__survey-object-box__review-button _green${
                        currentUserForceApproved ? ' admin__survey-object-box__review-button--active-force' : ''
                    }`}
                    title={t('interviewMember.forceApproveObject')}
                    aria-label={t('interviewMember.forceApproveObject')}
                    aria-pressed={currentUserForceApproved}
                    onClick={(event) => {
                        stopClickPropagation(event);
                        onForceApprove(objectType, objectUuid);
                    }}
                >
                    <FontAwesomeIcon icon={faCheckDouble} />
                </button>
            )}
            {otherReviewersCount > 0 && onRequestReReview && (
                <button
                    type="button"
                    className={`admin__survey-object-box__review-button${
                        reReviewPending ? ' admin__survey-object-box__review-button--active-rereview' : ''
                    }`}
                    title={t('interviewMember.requestReReview')}
                    aria-label={t('interviewMember.requestReReview')}
                    aria-pressed={reReviewPending}
                    onClick={(event) => {
                        stopClickPropagation(event);
                        onRequestReReview(objectType, objectUuid);
                    }}
                >
                    <FontAwesomeIcon icon={faRotate} />
                </button>
            )}
        </span>
    );
};

export default ObjectReviewButtons;
