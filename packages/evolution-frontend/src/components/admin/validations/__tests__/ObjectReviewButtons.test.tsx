/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { v4 as uuidV4 } from 'uuid';
import type { ReviewDecisionStatusForObject } from 'evolution-common/lib/services/reviews/types';
import ObjectReviewButtons from '../ObjectReviewButtons';
import { isReviewableObjectType } from '../../../../services/admin/reviewDecisionStatusHelper';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key
    })
}));

jest.mock('../../../../services/admin/reviewDecisionStatusHelper', () => ({
    isReviewableObjectType: jest.fn(() => true)
}));

const mockIsReviewableObjectType = isReviewableObjectType as jest.MockedFunction<typeof isReviewableObjectType>;

const objectUuid = uuidV4();
const baseProps = {
    objectType: 'person' as const,
    objectUuid,
    canForceApprove: false,
    onApprove: jest.fn(),
    onReject: jest.fn(),
    onForceApprove: jest.fn(),
    onRequestReReview: jest.fn()
};

const buildStatus = (
    status: Partial<ReviewDecisionStatusForObject> = {}
): ReviewDecisionStatusForObject => ({
    objectType: 'person',
    objectUuid,
    approvalCount: 0,
    rejectionCount: 0,
    hasConflict: false,
    isForceApproved: false,
    effectiveStatus: 'notReviewed',
    reReviewRequestedUserIds: [],
    isReviewed: false,
    ...status
});

const renderButtons = (status?: ReviewDecisionStatusForObject, props: Partial<typeof baseProps> = {}) =>
    render(<ObjectReviewButtons {...baseProps} {...props} status={status} />);

beforeEach(() => {
    jest.clearAllMocks();
    mockIsReviewableObjectType.mockReturnValue(true);
});

describe('ObjectReviewButtons', () => {
    it('renders nothing when objectUuid is missing', () => {
        const { container } = render(<ObjectReviewButtons {...baseProps} objectUuid={undefined} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing when object type is not reviewable', () => {
        mockIsReviewableObjectType.mockReturnValue(false);
        const { container } = renderButtons();
        expect(container).toBeEmptyDOMElement();
    });

    it('shows active approve and reject styles from the current user decision', () => {
        const { rerender } = renderButtons(buildStatus({ currentUserDecision: 'approve' }));
        expect(screen.getByLabelText('interviewMember.approveObject')).toHaveClass(
            'admin__survey-object-box__review-button--active-approve'
        );
        expect(screen.getByLabelText('interviewMember.rejectObject')).not.toHaveClass(
            'admin__survey-object-box__review-button--active-reject'
        );

        rerender(<ObjectReviewButtons {...baseProps} status={buildStatus({ currentUserDecision: 'reject' })} />);
        expect(screen.getByLabelText('interviewMember.rejectObject')).toHaveClass(
            'admin__survey-object-box__review-button--active-reject'
        );
    });

    it('shows conflict warning and force-approve button when reviewers disagree', () => {
        renderButtons(buildStatus({ effectiveStatus: 'conflict', hasConflict: true }), { canForceApprove: true });

        expect(screen.getByLabelText('interviewMember.reviewConflict')).toBeInTheDocument();
        expect(screen.getByLabelText('interviewMember.forceApproveObject')).toBeInTheDocument();
    });

    it('shows force-approve button when object is already force-approved', () => {
        renderButtons(buildStatus({ isForceApproved: true, currentUserForceApproved: true }), { canForceApprove: true });

        expect(screen.getByLabelText('interviewMember.forceApproveObject')).toHaveClass(
            'admin__survey-object-box__review-button--active-force'
        );
    });

    it('hides force-approve button without conflict or prior force approval', () => {
        renderButtons(buildStatus({ effectiveStatus: 'approved' }), { canForceApprove: true });
        expect(screen.queryByLabelText('interviewMember.forceApproveObject')).not.toBeInTheDocument();
    });

    it('shows asked-to-re-review and pending re-review indicators', () => {
        renderButtons(
            buildStatus({
                currentUserReReviewRequested: true,
                approvalCount: 2,
                currentUserDecision: 'approve',
                reReviewRequestedUserIds: [42]
            })
        );

        expect(screen.getByLabelText('interviewMember.reReviewRequested')).toBeInTheDocument();
        expect(screen.getByLabelText('interviewMember.requestReReview')).toHaveClass(
            'admin__survey-object-box__review-button--active-rereview'
        );
    });

    it('calls action handlers when buttons are clicked', async () => {
        const user = userEvent.setup();
        renderButtons(
            buildStatus({
                effectiveStatus: 'conflict',
                hasConflict: true,
                approvalCount: 2,
                currentUserDecision: 'approve'
            }),
            { canForceApprove: true }
        );

        await user.click(screen.getByLabelText('interviewMember.approveObject'));
        await user.click(screen.getByLabelText('interviewMember.rejectObject'));
        await user.click(screen.getByLabelText('interviewMember.forceApproveObject'));
        await user.click(screen.getByLabelText('interviewMember.requestReReview'));

        expect(baseProps.onApprove).toHaveBeenCalledWith('person', objectUuid);
        expect(baseProps.onReject).toHaveBeenCalledWith('person', objectUuid);
        expect(baseProps.onForceApprove).toHaveBeenCalledWith('person', objectUuid);
        expect(baseProps.onRequestReReview).toHaveBeenCalledWith('person', objectUuid);
    });
});
