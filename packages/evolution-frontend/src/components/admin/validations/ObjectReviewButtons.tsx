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
import { getReviewDecisionButtonsState } from '../../../services/admin/reviewDecisionButtonsState';
import { stopActivationKeyPropagation } from '../../../services/admin/selectableKeyboard';

export type ObjectReviewButtonsProps = {
    objectType: SurveyObjectName;
    objectUuid: string | undefined;
    status?: ReviewDecisionStatusForObject;
    canForceApprove: boolean;
    onApprove?: () => void;
    onReject?: () => void;
    onClearReview?: () => void;
    onForceApprove?: () => void;
    onClearForceApprove?: () => void;
    onRequestReReview?: () => void;
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
 * @param props.onClearReview - Called when the reviewer toggles off their current decision
 * @param props.onForceApprove - Called when an admin force-approves
 * @param props.onClearForceApprove - Called when an admin toggles off their force-approve
 * @param props.onRequestReReview - Called to ask the other reviewers to look again
 */
const ObjectReviewButtons: React.FC<ObjectReviewButtonsProps> = ({
    objectType,
    objectUuid,
    status,
    canForceApprove,
    onApprove,
    onReject,
    onClearReview,
    onForceApprove,
    onClearForceApprove,
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

    const {
        rejectPressed,
        approvePressed,
        forceApprovePressed,
        showConflictWarning,
        canClearDecision,
        showForceApprove,
        showRequestReReview,
        reReviewPressed,
        askedToReReview
    } = getReviewDecisionButtonsState(status);

    const renderReviewToggleButton = ({
        labelKey,
        icon,
        colorClass,
        isPressed,
        activeClassSuffix,
        onActivate,
        onClear,
        canClearWhenPressed = true
    }: {
        labelKey: string;
        icon: typeof faBan;
        colorClass: string;
        isPressed: boolean;
        activeClassSuffix: string;
        onActivate?: () => void;
        onClear?: () => void;
        canClearWhenPressed?: boolean;
    }) => {
        if (!onActivate) {
            return null;
        }

        return (
            <button
                type="button"
                className={`admin__survey-object-box__review-button ${colorClass}${
                    isPressed ? ` ${activeClassSuffix}` : ''
                }`}
                title={t(labelKey)}
                aria-label={t(labelKey)}
                aria-pressed={isPressed}
                onClick={(event) => {
                    stopClickPropagation(event);
                    if (isPressed && canClearWhenPressed && onClear) {
                        onClear();
                        return;
                    }
                    onActivate();
                }}
            >
                <FontAwesomeIcon icon={icon} />
            </button>
        );
    };

    return (
        <span
            className="admin__survey-object-box__review-controls"
            onClick={stopClickPropagation}
            onKeyDown={stopActivationKeyPropagation}
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
            {renderReviewToggleButton({
                labelKey: 'interviewMember.rejectObject',
                icon: faBan,
                colorClass: '_red',
                isPressed: rejectPressed,
                activeClassSuffix: 'admin__survey-object-box__review-button--active-reject',
                onActivate: onReject,
                onClear: onClearReview,
                canClearWhenPressed: canClearDecision
            })}
            {renderReviewToggleButton({
                labelKey: 'interviewMember.approveObject',
                icon: faCheck,
                colorClass: '_green',
                isPressed: approvePressed,
                activeClassSuffix: 'admin__survey-object-box__review-button--active-approve',
                onActivate: onApprove,
                onClear: onClearReview,
                canClearWhenPressed: canClearDecision
            })}
            {canForceApprove &&
                onForceApprove &&
                showForceApprove &&
                renderReviewToggleButton({
                    labelKey: 'interviewMember.forceApproveObject',
                    icon: faCheckDouble,
                    colorClass: '_green',
                    isPressed: forceApprovePressed,
                    activeClassSuffix: 'admin__survey-object-box__review-button--active-force',
                    onActivate: onForceApprove,
                    onClear: onClearForceApprove
                })}
            {showRequestReReview &&
                onRequestReReview &&
                renderReviewToggleButton({
                    labelKey: 'interviewMember.requestReReview',
                    icon: faRotate,
                    colorClass: '',
                    isPressed: reReviewPressed,
                    activeClassSuffix: 'admin__survey-object-box__review-button--active-rereview',
                    onActivate: onRequestReReview,
                    canClearWhenPressed: false
                })}
        </span>
    );
};

export default ObjectReviewButtons;
