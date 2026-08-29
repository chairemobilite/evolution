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
import InterviewReviewLinks from '../InterviewReviewLinks';
import { useObjectReview, useReviewDecisionStatusByObject } from '../../../../services/admin/useObjectReview';
import type { ObjectReview } from '../../../../services/admin/useObjectReview';
import type { ReviewDecisionStatusByObject } from 'evolution-common/lib/services/reviews/types';
import { createRejectedReviewDecisionStatus } from '../../../../services/admin/__tests__/reviewDecisionStatusHelperTestUtils';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key })
}));

jest.mock('../../../../services/admin/useObjectReview', () => ({
    useObjectReview: jest.fn(),
    useReviewDecisionStatusByObject: jest.fn()
}));

const mockUseObjectReview = useObjectReview as jest.MockedFunction<typeof useObjectReview>;
const mockUseReviewDecisionStatusByObject = useReviewDecisionStatusByObject as unknown as jest.Mock;

const interviewUuid = '11111111-1111-4111-8111-111111111111';
const personUuid = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const buildReview = (overrides: Partial<ObjectReview> = {}): ObjectReview => ({
    status: undefined,
    hasReviewControls: true,
    canForceApprove: false,
    approve: jest.fn(),
    reject: jest.fn(),
    clearReview: jest.fn(),
    forceApprove: jest.fn(),
    clearForceApprove: jest.fn(),
    requestReReview: jest.fn(),
    ...overrides
});

const statusesWithRejectedPerson = {
    persons: { [personUuid]: createRejectedReviewDecisionStatus('person', personUuid) }
} as unknown as ReviewDecisionStatusByObject;

beforeEach(() => {
    jest.clearAllMocks();
    mockUseObjectReview.mockReturnValue(buildReview());
    mockUseReviewDecisionStatusByObject.mockReturnValue({});
});

const renderLinks = () => render(<InterviewReviewLinks interviewUuid={interviewUuid} />);

describe('InterviewReviewLinks', () => {
    test('renders nothing when interviews are not reviewable', () => {
        mockUseObjectReview.mockReturnValue(buildReview({ hasReviewControls: false }));

        const { container } = renderLinks();

        expect(container).toBeEmptyDOMElement();
    });

    // [case name, can force approve, rejected object below, approve link shown, force approve link shown]
    const approveVisibilityCases: [string, boolean, boolean, boolean, boolean][] = [
        ['nothing rejected below', false, false, true, false],
        ['nothing rejected below, admin', true, false, true, false],
        ['a rejected object below', false, true, false, false],
        ['a rejected object below, admin', true, true, false, true]
    ];

    test.each(approveVisibilityCases)(
        '%s: approve shown is %s and force approve shown is %s',
        (_name, canForceApprove, hasRejectedObject, approveShown, forceApproveShown) => {
            mockUseObjectReview.mockReturnValue(buildReview({ canForceApprove }));
            mockUseReviewDecisionStatusByObject.mockReturnValue(hasRejectedObject ? statusesWithRejectedPerson : {});

            renderLinks();

            expect(Boolean(screen.queryByLabelText('interviewMember.approveObject'))).toBe(approveShown);
            expect(Boolean(screen.queryByLabelText('interviewMember.forceApproveObject'))).toBe(forceApproveShown);
            // Rejecting the interview stays possible in every case.
            expect(screen.getByLabelText('interviewMember.rejectObject')).toBeInTheDocument();
        }
    );

    test('an approval contradicted by a rejected object can still be withdrawn', async () => {
        const clearReview = jest.fn();
        mockUseObjectReview.mockReturnValue(
            buildReview({
                clearReview,
                status: { currentUserDecision: 'approve' } as ObjectReview['status']
            })
        );
        mockUseReviewDecisionStatusByObject.mockReturnValue(statusesWithRejectedPerson);

        renderLinks();

        // The link no longer offers to approve, only to take that approval back.
        expect(screen.queryByLabelText('interviewMember.approveObject')).not.toBeInTheDocument();
        const withdrawLink = screen.getByLabelText('interviewMember.withdrawApprove');
        expect(withdrawLink).toHaveAttribute('aria-pressed', 'true');

        await userEvent.click(withdrawLink);

        expect(clearReview).toHaveBeenCalledTimes(1);
    });
});
