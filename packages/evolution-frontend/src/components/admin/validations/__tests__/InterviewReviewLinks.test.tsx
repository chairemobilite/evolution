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
import {
    createApprovedReviewDecisionStatus,
    createRejectedReviewDecisionStatus
} from '../../../../services/admin/__tests__/reviewDecisionStatusHelperTestUtils';

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
const otherPersonUuid = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const householdUuid = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

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

const statusesWithOneOfTwoPersonsRejected = {
    persons: {
        [personUuid]: createRejectedReviewDecisionStatus('person', personUuid),
        [otherPersonUuid]: createApprovedReviewDecisionStatus('person', otherPersonUuid)
    }
} as unknown as ReviewDecisionStatusByObject;

const statusesWithEveryPersonRejected = {
    persons: {
        [personUuid]: createRejectedReviewDecisionStatus('person', personUuid),
        [otherPersonUuid]: createRejectedReviewDecisionStatus('person', otherPersonUuid)
    }
} as unknown as ReviewDecisionStatusByObject;

const statusesWithRejectedHousehold = {
    household: createRejectedReviewDecisionStatus('household', householdUuid)
} as unknown as ReviewDecisionStatusByObject;

const statusesWithDisagreedPerson = {
    persons: {
        [personUuid]: {
            ...createRejectedReviewDecisionStatus('person', personUuid),
            approvalCount: 1,
            rejectionCount: 1,
            hasConflict: true,
            effectiveStatus: 'conflict'
        }
    }
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

    const approveVisibilityCases: {
        title: string;
        canForceApprove: boolean;
        statusesBelow: ReviewDecisionStatusByObject;
    }[] = [
        {
            title: 'nothing rejected below',
            canForceApprove: false,
            statusesBelow: {} as ReviewDecisionStatusByObject
        },
        {
            title: 'nothing rejected below, admin',
            canForceApprove: true,
            statusesBelow: {} as ReviewDecisionStatusByObject
        },
        {
            title: 'one of two persons rejected',
            canForceApprove: false,
            statusesBelow: statusesWithOneOfTwoPersonsRejected
        },
        {
            title: 'one of two persons rejected, admin',
            canForceApprove: true,
            statusesBelow: statusesWithOneOfTwoPersonsRejected
        },
        {
            title: 'every person rejected',
            canForceApprove: false,
            statusesBelow: statusesWithEveryPersonRejected
        },
        {
            title: 'every person rejected, admin',
            canForceApprove: true,
            statusesBelow: statusesWithEveryPersonRejected
        },
        {
            title: 'household rejected',
            canForceApprove: false,
            statusesBelow: statusesWithRejectedHousehold
        },
        {
            title: 'household rejected, admin',
            canForceApprove: true,
            statusesBelow: statusesWithRejectedHousehold
        },
        {
            title: 'a disagreement below',
            canForceApprove: false,
            statusesBelow: statusesWithDisagreedPerson
        },
        {
            title: 'a disagreement below, admin',
            canForceApprove: true,
            statusesBelow: statusesWithDisagreedPerson
        }
    ];

    // Approve stays available whatever was decided below. Force approve does not appear for that.
    test.each(approveVisibilityCases)('show approval links when $title', ({ canForceApprove, statusesBelow }) => {
        mockUseObjectReview.mockReturnValue(buildReview({ canForceApprove }));
        mockUseReviewDecisionStatusByObject.mockReturnValue(statusesBelow);

        renderLinks();

        expect(screen.getByLabelText('interviewMember.approveObject')).toBeInTheDocument();
        expect(screen.queryByLabelText('interviewMember.forceApproveObject')).not.toBeInTheDocument();
        expect(screen.getByLabelText('interviewMember.rejectObject')).toBeInTheDocument();
    });

    test('an approval contradicted by a disagreement can still be withdrawn', async () => {
        const clearReview = jest.fn();
        mockUseObjectReview.mockReturnValue(
            buildReview({
                clearReview,
                status: { currentUserDecision: 'approve' } as ObjectReview['status']
            })
        );
        mockUseReviewDecisionStatusByObject.mockReturnValue(statusesWithDisagreedPerson);

        renderLinks();

        const approveLink = screen.getByLabelText('interviewMember.approveObject');
        expect(approveLink).toHaveAttribute('aria-pressed', 'true');

        await userEvent.click(approveLink);

        expect(clearReview).toHaveBeenCalledTimes(1);
    });
});
