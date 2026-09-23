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
import { useObjectReview } from '../../../services/admin/useObjectReview';
import { getReviewDecisionButtonsState } from '../../../services/admin/reviewDecisionButtonsState';

export type InterviewReviewLinksProps = {
    /** Uuid of the reviewed interview. */
    interviewUuid: string;
};

/**
 * Approve/reject links for the interview itself, in the style of the other links of the
 * interview top menu. The interview is the parent of every other survey object, so its
 * decisions belong next to the completion links rather than in a survey object box.
 * @param props.interviewUuid - Uuid of the reviewed interview
 * @returns Review links, or null when interviews are not reviewable in this survey
 */
const InterviewReviewLinks: React.FC<InterviewReviewLinksProps> = ({ interviewUuid }) => {
    const { t } = useTranslation('admin');
    const review = useObjectReview('interview', interviewUuid);
    const state = getReviewDecisionButtonsState(review.status);
    // The interview has no parent. A rejected object below does not hide this approve link.

    if (!review.hasReviewControls) {
        return null;
    }

    const renderToggleLink = ({
        labelKey,
        icon,
        colorClass,
        isPressed,
        onActivate,
        onClear
    }: {
        labelKey: string;
        icon: typeof faBan;
        colorClass: string;
        isPressed: boolean;
        onActivate: () => void;
        onClear?: () => void;
    }) => (
        <a
            href="#"
            className={`${colorClass}${isPressed ? ' _active-background' : ''}`}
            title={t(labelKey)}
            aria-label={t(labelKey)}
            aria-pressed={isPressed}
            onClick={(e) => {
                e.preventDefault();
                // Clicking the pressed decision again clears it, unless it was force-approved.
                if (isPressed && onClear) {
                    onClear();
                    return;
                }
                onActivate();
            }}
        >
            <FontAwesomeIcon icon={icon} />
        </a>
    );

    return (
        <React.Fragment>
            {state.askedToReReview && (
                <FontAwesomeIcon
                    icon={faRotate}
                    className="_yellow"
                    title={t('interviewMember.reReviewRequested')}
                    aria-label={t('interviewMember.reReviewRequested')}
                    role="img"
                />
            )}
            {state.showConflictWarning && (
                <FontAwesomeIcon
                    icon={faTriangleExclamation}
                    className="_yellow"
                    title={t('interviewMember.reviewConflict')}
                    aria-label={t('interviewMember.reviewConflict')}
                    role="img"
                />
            )}
            {renderToggleLink({
                labelKey: 'interviewMember.rejectObject',
                icon: faBan,
                colorClass: '_red',
                isPressed: state.rejectPressed,
                onActivate: review.reject,
                onClear: state.canClearDecision ? review.clearReview : undefined
            })}
            <React.Fragment>
                {' '}
                {renderToggleLink({
                    labelKey: 'interviewMember.approveObject',
                    icon: faCheck,
                    colorClass: '_green',
                    isPressed: state.approvePressed,
                    onActivate: review.approve,
                    onClear: state.canClearDecision ? review.clearReview : undefined
                })}
            </React.Fragment>
            {review.canForceApprove && state.showForceApprove && (
                <React.Fragment>
                    {' '}
                    {renderToggleLink({
                        labelKey: 'interviewMember.forceApproveObject',
                        icon: faCheckDouble,
                        colorClass: '_green',
                        isPressed: state.forceApprovePressed,
                        onActivate: review.forceApprove,
                        onClear: review.clearForceApprove
                    })}
                </React.Fragment>
            )}
            {state.showRequestReReview && (
                <React.Fragment>
                    {' '}
                    {renderToggleLink({
                        labelKey: 'interviewMember.requestReReview',
                        icon: faRotate,
                        colorClass: '',
                        isPressed: state.reReviewPressed,
                        onActivate: review.requestReReview
                    })}
                </React.Fragment>
            )}
        </React.Fragment>
    );
};

export default InterviewReviewLinks;
