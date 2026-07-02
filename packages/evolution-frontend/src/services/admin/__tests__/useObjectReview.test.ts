/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { renderHook } from '@testing-library/react';
import { v4 as uuidV4 } from 'uuid';
import { useDispatch, useSelector } from 'react-redux';
import { useObjectReview } from '../useObjectReview';
import {
    startSubmitObjectReview,
    startClearObjectReview,
    startForceApproveObject,
    startClearForceApproveObject,
    startRequestReReview
} from '../../../actions/SurveyAdmin';
import { getReviewDecisionStatusForObject, isReviewableObjectType } from '../reviewDecisionStatusHelper';

jest.mock('react-redux', () => ({
    useDispatch: jest.fn(),
    useSelector: jest.fn(),
    shallowEqual: jest.fn()
}));

jest.mock('../../../actions/SurveyAdmin', () => ({
    startSubmitObjectReview: jest.fn((...args: unknown[]) => ({ type: 'submit', args })),
    startClearObjectReview: jest.fn((...args: unknown[]) => ({ type: 'clear', args })),
    startForceApproveObject: jest.fn((...args: unknown[]) => ({ type: 'force', args })),
    startClearForceApproveObject: jest.fn((...args: unknown[]) => ({ type: 'clearForce', args })),
    startRequestReReview: jest.fn((...args: unknown[]) => ({ type: 'rereview', args }))
}));

jest.mock('../reviewDecisionStatusHelper', () => ({
    getReviewDecisionStatusForObject: jest.fn(),
    isReviewableObjectType: jest.fn()
}));

const mockUseDispatch = useDispatch as jest.MockedFunction<typeof useDispatch>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockGetReviewDecisionStatusForObject = getReviewDecisionStatusForObject as jest.MockedFunction<
    typeof getReviewDecisionStatusForObject
>;
const mockIsReviewableObjectType = isReviewableObjectType as jest.MockedFunction<typeof isReviewableObjectType>;
const mockStartSubmitObjectReview = startSubmitObjectReview as jest.MockedFunction<typeof startSubmitObjectReview>;
const mockStartClearObjectReview = startClearObjectReview as jest.MockedFunction<typeof startClearObjectReview>;
const mockStartForceApproveObject = startForceApproveObject as jest.MockedFunction<typeof startForceApproveObject>;
const mockStartClearForceApproveObject = startClearForceApproveObject as jest.MockedFunction<
    typeof startClearForceApproveObject
>;
const mockStartRequestReReview = startRequestReReview as jest.MockedFunction<typeof startRequestReReview>;

const personUuid = uuidV4();
const mockDispatch = jest.fn();
const reviewStatus = { objectType: 'person', objectUuid: personUuid, effectiveStatus: 'approved' as const };

beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);
    mockUseSelector.mockImplementation((selector) =>
        selector({
            survey: { reviewDecisions: { reviewDecisionStatusByObject: {} } },
            auth: { user: { isAuthorized: jest.fn(() => true) } }
        } as never)
    );
    mockGetReviewDecisionStatusForObject.mockReturnValue(reviewStatus as never);
    mockIsReviewableObjectType.mockReturnValue(true);
});

describe('useObjectReview', () => {
    test('derives hasReviewControls and canForceApprove from reviewability and auth', () => {
        const { result } = renderHook(() => useObjectReview('person', personUuid));

        expect(result.current.hasReviewControls).toBe(true);
        expect(result.current.canForceApprove).toBe(true);
        expect(result.current.status).toBe(reviewStatus);
    });

    test('hides review controls when the object uuid is missing', () => {
        const { result } = renderHook(() => useObjectReview('person', undefined));

        expect(result.current.hasReviewControls).toBe(false);
        result.current.approve();
        expect(mockDispatch).not.toHaveBeenCalled();
    });

    test('does not dispatch review actions for non-reviewable object types', () => {
        mockIsReviewableObjectType.mockReturnValue(false);
        const { result } = renderHook(() => useObjectReview('segment', personUuid));

        expect(result.current.hasReviewControls).toBe(false);
        result.current.approve();
        result.current.reject();
        result.current.clearReview();
        expect(mockDispatch).not.toHaveBeenCalled();
    });

    test.each([
        ['approve', 'approve' as const, mockStartSubmitObjectReview],
        ['reject', 'reject' as const, mockStartSubmitObjectReview],
        ['clearReview', undefined, mockStartClearObjectReview],
        ['forceApprove', undefined, mockStartForceApproveObject],
        ['clearForceApprove', undefined, mockStartClearForceApproveObject],
        ['requestReReview', undefined, mockStartRequestReReview]
    ])('dispatches %s with the object type and uuid', (callbackName, decision, thunkFactory) => {
        const { result } = renderHook(() => useObjectReview('person', personUuid));

        if (callbackName === 'approve' || callbackName === 'reject') {
            result.current[callbackName as 'approve']();
            expect(thunkFactory).toHaveBeenCalledWith('person', personUuid, decision);
        } else {
            result.current[callbackName as 'clearReview']();
            expect(thunkFactory).toHaveBeenCalledWith('person', personUuid);
        }
        expect(mockDispatch).toHaveBeenCalledWith(thunkFactory.mock.results[0].value);
    });
});
