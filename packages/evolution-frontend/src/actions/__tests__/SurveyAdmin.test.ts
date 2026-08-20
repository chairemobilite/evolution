/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { v4 as uuidV4 } from 'uuid';
import _cloneDeep from 'lodash/cloneDeep';
import type { ReviewDecisions } from 'evolution-common/lib/services/reviews/types';
import {
    startSubmitObjectReview,
    startClearObjectReview,
    startRequestReReview,
    startForceApproveObject,
    startClearForceApproveObject,
    startFetchInterviewReviewDecisions
} from '../SurveyAdmin';
import { SurveyActionTypes } from '../../store/survey/types';
import { LoadingStateActionTypes } from '../../store/loadingState/types';
import { handleHttpOtherResponseCode } from '../../services/errorManagement/errorHandling';
import { toast } from 'sonner';
import i18n from '../../config/i18n.config';
import fetchRetryFactory from '@zeit/fetch-retry';

jest.mock('@zeit/fetch-retry', () => {
    const fetchMock = jest.fn();
    return jest.fn(() => fetchMock);
});

const fetchRetryMock = (fetchRetryFactory as jest.Mock)() as jest.Mock;

jest.mock('sonner', () => ({
    toast: { error: jest.fn() }
}));
const mockedToastError = toast.error as jest.MockedFunction<typeof toast.error>;

jest.mock('../../config/i18n.config', () => ({
    __esModule: true,
    default: { t: jest.fn((key: string) => key) }
}));
const mockedI18nT = i18n.t as jest.MockedFunction<typeof i18n.t>;

jest.mock('../../services/errorManagement/errorHandling', () => ({
    handleHttpOtherResponseCode: jest.fn()
}));
const mockedHandleHttpOtherResponseCode = handleHttpOtherResponseCode as jest.MockedFunction<
    typeof handleHttpOtherResponseCode
>;

const interviewUuid = uuidV4();
const personUuid = uuidV4();
// Minimal serialized payload as returned by the backend review routes; the thunks
// only pass it through to Redux, so empty collections are enough here.
const reviewDecisionsPayload = {
    reviewDecisions: [],
    reviewDecisionsByObject: {},
    reviewDecisionStatusByObject: {}
} as unknown as ReviewDecisions;

const mockDispatch = jest.fn();
const mockGetState = jest.fn();

const successFetchResponse = () => ({
    status: 200,
    json: async () => ({ reviewDecisions: reviewDecisionsPayload })
});

type ReviewThunkRunner = (
    dispatch: typeof mockDispatch,
    getState: typeof mockGetState
) => Promise<void>;

type ReviewThunkCase = {
    label: string;
    run: ReviewThunkRunner;
    expectedPath: string;
    expectedBody: Record<string, unknown>;
};

const reviewThunkCases: ReviewThunkCase[] = [
    {
        label: 'startSubmitObjectReview',
        run: (dispatch, getState) => startSubmitObjectReview('person', personUuid, 'approve')(dispatch, getState as never),
        expectedPath: 'decision',
        expectedBody: { objectType: 'person', objectUuid: personUuid, decision: 'approve' }
    },
    {
        label: 'startClearObjectReview',
        run: (dispatch, getState) => startClearObjectReview('person', personUuid)(dispatch, getState as never),
        expectedPath: 'clearDecision',
        expectedBody: { objectType: 'person', objectUuid: personUuid }
    },
    {
        label: 'startRequestReReview',
        run: (dispatch, getState) => startRequestReReview('person', personUuid)(dispatch, getState as never),
        expectedPath: 'reReview',
        expectedBody: { objectType: 'person', objectUuid: personUuid }
    },
    {
        label: 'startForceApproveObject',
        run: (dispatch, getState) => startForceApproveObject('person', personUuid)(dispatch, getState as never),
        expectedPath: 'forceApprove',
        expectedBody: { objectType: 'person', objectUuid: personUuid }
    },
    {
        label: 'startClearForceApproveObject',
        run: (dispatch, getState) => startClearForceApproveObject('person', personUuid)(dispatch, getState as never),
        expectedPath: 'clearForceApprove',
        expectedBody: { objectType: 'person', objectUuid: personUuid }
    }
];

beforeEach(() => {
    jest.clearAllMocks();
    fetchRetryMock.mockResolvedValue(successFetchResponse() as never);
    mockGetState.mockImplementation(() => ({
        survey: {
            interview: { uuid: interviewUuid }
        }
    }));
});

describe('SurveyAdmin review thunks', () => {
    it.each(reviewThunkCases)('$label posts to the review mutation route', async ({ run, expectedPath, expectedBody }) => {
        await run(mockDispatch, mockGetState);

        expect(fetchRetryMock).toHaveBeenCalledWith(
            `/api/review/${expectedPath}/${interviewUuid}`,
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify(expectedBody)
            })
        );
        expect(mockDispatch).toHaveBeenCalledWith({
            type: SurveyActionTypes.SET_REVIEW_DECISIONS,
            reviewDecisions: reviewDecisionsPayload
        });
    });

    test('serializes overlapping review mutations per interview', async () => {
        jest.useFakeTimers();
        try {
            const callOrder: number[] = [];
            let callId = 0;
            fetchRetryMock.mockImplementation(
                () =>
                    new Promise((resolve) => {
                        const id = ++callId;
                        window.setTimeout(() => {
                            callOrder.push(id);
                            resolve(successFetchResponse() as never);
                        }, id === 1 ? 30 : 5);
                    })
            );

            const first = startSubmitObjectReview('person', personUuid, 'approve')(mockDispatch, mockGetState as never);
            const second = startClearObjectReview('person', personUuid)(mockDispatch, mockGetState as never);

            const all = Promise.all([first, second]);
            await jest.runAllTimersAsync();
            await all;

            expect(callOrder).toEqual([1, 2]);
        } finally {
            jest.useRealTimers();
        }
    });

    test('startForceApproveObject shows the conflict toast on 409 without generic failure handling', async () => {
        fetchRetryMock.mockResolvedValue({ status: 409 } as never);

        await startForceApproveObject('person', personUuid)(mockDispatch, mockGetState as never);

        expect(mockedI18nT).toHaveBeenCalledWith('admin:interviewMember.forceApproveRequiresConflict');
        expect(mockedToastError).toHaveBeenCalledWith('admin:interviewMember.forceApproveRequiresConflict');
        expect(mockedHandleHttpOtherResponseCode).not.toHaveBeenCalled();
        expect(mockDispatch).toHaveBeenCalledWith({ type: LoadingStateActionTypes.INCREMENT_LOADING_STATE });
        expect(mockDispatch).toHaveBeenCalledWith({ type: LoadingStateActionTypes.DECREMENT_LOADING_STATE });
        expect(mockDispatch).not.toHaveBeenCalledWith(
            expect.objectContaining({ type: SurveyActionTypes.SET_REVIEW_DECISIONS })
        );
    });

    test('review thunks no-op when the admin interview is not loaded', async () => {
        mockGetState.mockReturnValueOnce({ survey: { interview: undefined } } as never);

        await startSubmitObjectReview('person', personUuid, 'approve')(mockDispatch, mockGetState as never);

        expect(fetchRetryMock).not.toHaveBeenCalled();
    });

    test('startClearObjectReview does not dispatch stale review decisions when the open interview changed', async () => {
        let openInterviewUuid = interviewUuid;
        mockGetState.mockImplementation(
            () =>
                ({
                    survey: {
                        interview: { uuid: openInterviewUuid }
                    }
                }) as never
        );
        fetchRetryMock.mockImplementation(async () => {
            openInterviewUuid = uuidV4();
            return successFetchResponse() as never;
        });

        await startClearObjectReview('person', personUuid)(mockDispatch, mockGetState as never);

        expect(fetchRetryMock).toHaveBeenCalled();
        expect(mockDispatch).not.toHaveBeenCalledWith(
            expect.objectContaining({ type: SurveyActionTypes.SET_REVIEW_DECISIONS })
        );
    });
});

describe('startFetchInterviewReviewDecisions', () => {
    test('stores review decisions on success', async () => {
        await startFetchInterviewReviewDecisions(interviewUuid)(mockDispatch, mockGetState as never);

        expect(fetchRetryMock).toHaveBeenCalledWith(
            `/api/review/decisions/${interviewUuid}`,
            expect.objectContaining({ credentials: 'include' })
        );
        expect(mockDispatch).toHaveBeenCalledWith({
            type: SurveyActionTypes.SET_REVIEW_DECISIONS,
            reviewDecisions: reviewDecisionsPayload
        });
    });

    test('delegates non-200 responses to handleHttpOtherResponseCode', async () => {
        fetchRetryMock.mockResolvedValue({ status: 403 } as never);

        await startFetchInterviewReviewDecisions(interviewUuid)(mockDispatch, mockGetState as never);

        expect(mockedHandleHttpOtherResponseCode).toHaveBeenCalledWith(403, mockDispatch);
        expect(mockDispatch).not.toHaveBeenCalled();
    });

    test('shows a toast when a 200 response is missing reviewDecisions', async () => {
        fetchRetryMock.mockResolvedValue({
            status: 200,
            json: async () => ({ status: 'success' })
        } as never);

        await startFetchInterviewReviewDecisions(interviewUuid)(mockDispatch, mockGetState as never);

        expect(mockedToastError).toHaveBeenCalledWith('admin:interviewStats.errors.reviewActionFailed');
        expect(mockDispatch).not.toHaveBeenCalled();
    });

    test('shows a toast when the fetch fails', async () => {
        fetchRetryMock.mockRejectedValue(new Error('network error'));

        await startFetchInterviewReviewDecisions(interviewUuid)(mockDispatch, mockGetState as never);

        expect(mockedToastError).toHaveBeenCalledWith('admin:interviewStats.errors.reviewActionFailed');
        expect(mockDispatch).not.toHaveBeenCalled();
    });
});
