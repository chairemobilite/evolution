/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import { ThunkAction, ThunkDispatch } from 'redux-thunk';
import type { SurveyObjectName } from 'evolution-common/lib/services/baseObjects/types';
import type {
    ReviewDecisionStatusByObject,
    ReviewDecisionStatusForObject
} from 'evolution-common/lib/services/reviews/types';
import { RootState } from '../../store/configureStore';
import { SurveyAction } from '../../store/survey';
import { AuthAction } from 'chaire-lib-frontend/lib/store/auth';
import { LoadingStateAction } from '../../store/loadingState';
import {
    startSubmitObjectReview,
    startClearObjectReview,
    startForceApproveObject,
    startClearForceApproveObject,
    startRequestReReview
} from '../../actions/SurveyAdmin';
import { getReviewDecisionStatusForObject, isReviewableObjectType } from './reviewDecisionStatusHelper';

/**
 * Selects the aggregated review status map for the open interview from the
 * `reviewDecisions` Redux slice.
 * @returns Review status grouped by object type, or undefined when reviews are not loaded
 */
export function useReviewDecisionStatusByObject(): ReviewDecisionStatusByObject | undefined;
/**
 * Selects aggregated review status for one survey object from the `reviewDecisions` slice.
 * @param objectType - Survey object type key
 * @param objectUuid - Survey object uuid
 * @returns Review status for the object, if any
 */
export function useReviewDecisionStatusByObject(
    objectType: SurveyObjectName,
    objectUuid: string | undefined
): ReviewDecisionStatusForObject | undefined;
export function useReviewDecisionStatusByObject(
    objectType?: SurveyObjectName,
    objectUuid?: string | undefined
): ReviewDecisionStatusByObject | ReviewDecisionStatusForObject | undefined {
    const isScoped = objectType !== undefined;
    return useSelector(
        (state: RootState) => {
            const reviewDecisionStatusByObject = state.survey.reviewDecisions?.reviewDecisionStatusByObject;
            if (isScoped) {
                return getReviewDecisionStatusForObject(reviewDecisionStatusByObject, objectType!, objectUuid);
            }
            return reviewDecisionStatusByObject;
        },
        isScoped ? shallowEqual : undefined
    );
}

/** Shared review thunk type for object-scoped admin mutations. */
type ReviewObjectThunk = ThunkAction<Promise<void>, RootState, unknown, SurveyAction | AuthAction | LoadingStateAction>;

/** Action creator for review thunks that take object type and uuid. */
type ReviewObjectThunkFactory = (objectType: SurveyObjectName, objectUuid: string) => ReviewObjectThunk;

/** Review state and callbacks for one survey object, returned by {@link useObjectReview}. */
export type ObjectReview = {
    /** Aggregated review status for the object, if any decision exists. */
    status: ReviewDecisionStatusForObject | undefined;
    /** True when review controls should render for this object. */
    hasReviewControls: boolean;
    /** True when the current user may force-approve (confirm permission). */
    canForceApprove: boolean;
    approve: () => void;
    reject: () => void;
    clearReview: () => void;
    forceApprove: () => void;
    clearForceApprove: () => void;
    requestReReview: () => void;
};

/**
 * Hook exposing the review status and mutation callbacks for one survey object.
 * Reads from the `reviewDecisions` Redux slice and dispatches the review thunks,
 * so components only need the object type and uuid.
 * @param objectType - Survey object type key
 * @param objectUuid - Survey object uuid; controls are disabled when missing
 * @returns Review state and callbacks for the object
 */
export const useObjectReview = (objectType: SurveyObjectName, objectUuid: string | undefined): ObjectReview => {
    const dispatch = useDispatch<ThunkDispatch<RootState, unknown, SurveyAction | AuthAction | LoadingStateAction>>();
    const status = useReviewDecisionStatusByObject(objectType, objectUuid);
    const user = useSelector((state: RootState) => state.auth?.user);

    const hasReviewControls = Boolean(objectUuid && isReviewableObjectType(objectType));
    const canForceApprove = Boolean(user?.isAuthorized({ Interviews: ['confirm'] }));

    const runWhenReviewable = useCallback(
        (thunkFactory: ReviewObjectThunkFactory) => {
            if (hasReviewControls && objectUuid) {
                dispatch(thunkFactory(objectType, objectUuid));
            }
        },
        [dispatch, objectType, objectUuid, hasReviewControls]
    );

    const approve = useCallback(
        () => runWhenReviewable((type, uuid) => startSubmitObjectReview(type, uuid, 'approve')),
        [runWhenReviewable]
    );
    const reject = useCallback(
        () => runWhenReviewable((type, uuid) => startSubmitObjectReview(type, uuid, 'reject')),
        [runWhenReviewable]
    );
    const clearReview = useCallback(() => runWhenReviewable(startClearObjectReview), [runWhenReviewable]);
    const forceApprove = useCallback(() => runWhenReviewable(startForceApproveObject), [runWhenReviewable]);
    const clearForceApprove = useCallback(() => runWhenReviewable(startClearForceApproveObject), [runWhenReviewable]);
    const requestReReview = useCallback(() => runWhenReviewable(startRequestReReview), [runWhenReviewable]);

    return useMemo(
        () => ({
            status,
            hasReviewControls,
            canForceApprove,
            approve,
            reject,
            clearReview,
            forceApprove,
            clearForceApprove,
            requestReReview
        }),
        [
            status,
            hasReviewControls,
            canForceApprove,
            approve,
            reject,
            clearReview,
            forceApprove,
            clearForceApprove,
            requestReReview
        ]
    );
};
