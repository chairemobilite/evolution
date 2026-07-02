/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { v4 as uuidV4 } from 'uuid';
import ObjectReviewControls from '../ObjectReviewControls';
import ObjectReviewButtons from '../ObjectReviewButtons';
import type { ObjectReview } from '../../../../services/admin/useObjectReview';

jest.mock('../ObjectReviewButtons', () => ({
    __esModule: true,
    default: jest.fn(() => <div data-testid="object-review-buttons" />)
}));

const mockObjectReviewButtons = ObjectReviewButtons as jest.MockedFunction<typeof ObjectReviewButtons>;

const objectUuid = uuidV4();

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

beforeEach(() => {
    jest.clearAllMocks();
});

describe('ObjectReviewControls', () => {
    it('returns null when review controls are disabled', () => {
        const { container } = render(
            <ObjectReviewControls
                review={buildReview({ hasReviewControls: false })}
                objectType="person"
                objectUuid={objectUuid}
            />
        );

        expect(container).toBeEmptyDOMElement();
        expect(mockObjectReviewButtons).not.toHaveBeenCalled();
    });

    it('passes review state and callbacks to ObjectReviewButtons', () => {
        const review = buildReview({ canForceApprove: true });

        render(<ObjectReviewControls review={review} objectType="person" objectUuid={objectUuid} />);

        expect(screen.getByTestId('object-review-buttons')).toBeInTheDocument();
        expect(mockObjectReviewButtons).toHaveBeenCalledWith(
            {
                objectType: 'person',
                objectUuid,
                status: review.status,
                canForceApprove: true,
                onApprove: review.approve,
                onReject: review.reject,
                onClearReview: review.clearReview,
                onForceApprove: review.forceApprove,
                onClearForceApprove: review.clearForceApprove,
                onRequestReReview: review.requestReReview
            },
            undefined
        );
    });
});
