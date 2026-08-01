/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import _cloneDeep from 'lodash/cloneDeep';
import isEqual from 'lodash/isEqual';

/* eslint-disable-next-line */
const fetchRetry = require('@zeit/fetch-retry')(require('node-fetch'));
// TODO Default options for retry are as high as 15 seconds, during which the
// user get no feedback. Since update requests are queued in that time, are
// sequential and it is not possible to empty the queue, the requests will try
// to execute for n*15 seconds, during which time the user may have refreshed
// the page and will not see that the updated values have been udpated. With 4
// retries, the user will get feedback within 3 seconds and the queue will empty
// much faster, reducing the risk of invisible updates. The risk is still
// present if the server is quickly back online and the user is fast enough.
const fetch = async (url, opts) => {
    return await fetchRetry(url, Object.assign({ retry: { retries: 4 }, ...opts }));
};

import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import * as surveyHelper from 'evolution-common/lib/utils/helpers';
import { SurveyObjectsUnserializer } from '../utils/SurveyObjectsUnserializer';
import {
    StartAddGroupedObjects,
    StartNavigate,
    StartRemoveGroupedObjects,
    StartUpdateInterview,
    UserRuntimeInterviewAttributes
} from 'evolution-common/lib/services/questionnaire/types';
import type { ReviewDecisions, ReviewDecisionValue } from 'evolution-common/lib/services/reviews/types';
import type { SurveyObjectName } from 'evolution-common/lib/services/baseObjects/types';
import { SurveyActionTypes } from '../store/survey/types';
import { incrementLoadingState, decrementLoadingState } from './LoadingState';
import { handleHttpOtherResponseCode } from '../services/errorManagement/errorHandling';
import i18n from '../config/i18n.config';
import { toast } from 'sonner';
import {
    validateAndPrepareSection,
    updateInterviewState,
    updateInterviewData,
    startNavigateWithUpdateCallback,
    asyncDispatchQueue,
    setInterviewState
} from './Survey';
import { ThunkDispatch } from 'redux-thunk';
import { RootState } from '../store/configureStore';
import { SurveyAction } from '../store/survey';
import { LoadingStateAction } from '../store/loadingState';
import { AuthAction } from 'chaire-lib-frontend/lib/store/auth';
import type { AdminInterviewAttributes } from '../services/admin/adminInterviewTypes';

// Extended type for admin interviews. `surveyObjectsAndAudits` holds the payload from
// `correctInterview` (audits only), unserialized in place into survey object instances
// (see `unserializeSurveyObjectsAndAudits`). Review decisions are a separate layer stored
// in `state.survey.reviewDecisions`, not on the interview.
/**
 * Helper function to unserialize the `surveyObjectsAndAudits` payload received from
 * `correctInterview` (audits only) into survey object instances, in place.
 * The raw payload is removed when it is missing, invalid, or fails to unserialize.
 *
 * @param interview - The interview containing surveyObjectsAndAudits to unserialize
 * @param errorContext - Optional context string to include in error message (e.g., 'for reset')
 */
const unserializeSurveyObjectsAndAudits = (interview: AdminInterviewAttributes, errorContext: string = ''): void => {
    const surveyObjectsAndAudits = interview.surveyObjectsAndAudits;
    delete interview.surveyObjectsAndAudits;
    const contextSuffix = errorContext ? ` ${errorContext}` : '';
    if (!surveyObjectsAndAudits || !SurveyObjectsUnserializer.hasValidData(surveyObjectsAndAudits)) {
        console.error(`Failed to unserialize surveyObjectsAndAudits${contextSuffix}: missing or invalid payload`);
        return;
    }
    try {
        const unserialized = SurveyObjectsUnserializer.unserialize(surveyObjectsAndAudits);
        if (!unserialized || !SurveyObjectsUnserializer.hasValidData(unserialized)) {
            console.error(`Failed to unserialize surveyObjectsAndAudits${contextSuffix}: invalid or empty result`);
            return;
        }
        interview.surveyObjectsAndAudits = unserialized;
    } catch (error) {
        console.error(`Failed to unserialize surveyObjectsAndAudits${contextSuffix}:`, error);
    }
};

// dispatch callback to do the interview state update and call to server. To be
// called by the `startUpdateSurveyCorrectedInterview` action and any other
// dispatched action requiring to update the interview fields and the server.
// FIXME The code in this function is not totally identical to its counterpart
// in Survey.ts (no server validations or side effects). Should it be? If so, it
// only differs by the URL called in the backend. Refactor to make code re-use
// easier.
const updateSurveyCorrectedInterview = async (
    dispatch: ThunkDispatch<RootState, unknown, SurveyAction | AuthAction | LoadingStateAction>,
    getState: () => RootState,
    {
        sectionShortname: requestedSectionShortname,
        valuesByPath = {},
        unsetPaths = [],
        interview: initialInterview,
        userAction
    }: Parameters<StartUpdateInterview>[0] & { interview?: AdminInterviewAttributes } = {},
    callback?: Parameters<StartUpdateInterview>[1]
) => {
    try {
        const { survey } = getState();
        const navigation = survey?.navigation;

        const interview = initialInterview
            ? initialInterview
            : (_cloneDeep(survey?.interview) as AdminInterviewAttributes);

        dispatch(incrementLoadingState());

        if (valuesByPath && Object.keys(valuesByPath).length > 0) {
            surveyHelper.devLog(
                'Update interview and section with values by path',
                JSON.parse(JSON.stringify(valuesByPath))
            );
        }

        const affectedPaths = updateInterviewData(interview, { valuesByPath, unsetPaths, userAction });

        // TODO: update this so it works well with validationOnePager (admin). Should we force this? Anyway this code should be replaced/updated completely in the next version.
        const sectionShortname = requestedSectionShortname
            ? requestedSectionShortname
            : navigation?.currentSection?.sectionShortname || '';

        // Skip section validation for admin interface - we don't need widget preparation
        let updatedInterview: AdminInterviewAttributes;
        let updatedValuesByPath: { [path: string]: unknown };
        if (!sectionShortname) {
            // For admin interface, just update the interview data without section validation
            updatedInterview = interview as AdminInterviewAttributes;
            updatedValuesByPath = valuesByPath as { [path: string]: unknown };
        } else {
            // For regular survey sections, use the full validation
            [updatedInterview, updatedValuesByPath] = validateAndPrepareSection(
                sectionShortname,
                interview as UserRuntimeInterviewAttributes,
                affectedPaths,
                valuesByPath as { [path: string]: unknown }
            );
        }

        if (!updatedInterview.sectionLoaded || updatedInterview.sectionLoaded !== sectionShortname) {
            updatedValuesByPath['sectionLoaded'] = sectionShortname;
            updatedInterview.sectionLoaded = sectionShortname;
        }

        // convert undefined values to unset (delete) because stringify will remove undefined values:
        for (const path in updatedValuesByPath) {
            if (updatedValuesByPath[path] === undefined) {
                unsetPaths.push(path);
            }
        }

        if (isEqual(updatedValuesByPath, { _all: true }) && _isBlank(unsetPaths) && _isBlank(userAction)) {
            dispatch(updateInterviewState(_cloneDeep(updatedInterview), {}, true));
            if (typeof callback === 'function') {
                callback(updatedInterview);
            }
            return null;
        }

        const response = await fetch(`/api/survey/updateCorrectedInterview/${interview.uuid}`, {
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            method: 'POST',
            body: JSON.stringify({
                id: updatedInterview.id,
                participant_id: updatedInterview.participant_id,
                valuesByPath: updatedValuesByPath,
                unsetPaths: unsetPaths,
                userAction
            })
        });
        if (response.status === 200) {
            const body = await response.json();
            if (body.status === 'success' && body.interviewId === updatedInterview.uuid) {
                if (body.updatedValuesByPath && Object.keys(body.updatedValuesByPath).length > 0) {
                    // Server-assigned values (e.g. _reviewBackendBuildIds paradata or server
                    // update callback results) are applied in place without re-running section
                    // preparation. Widget state referencing these values, if any, is refreshed by
                    // the next interaction, which is sufficient for the admin correction UI.
                    updateInterviewData(updatedInterview, { valuesByPath: body.updatedValuesByPath });
                }

                dispatch(updateInterviewState(_cloneDeep(updatedInterview), {}, updatedValuesByPath['_all'] === true));
                if (typeof callback === 'function') {
                    callback(updatedInterview);
                }
            } else {
                // TODO we need to do something if no interview is returned (error)
            }
        } else {
            console.error(`startUpdateSurveyCorrectedInterview: wrong response status: ${response.status}`);
            handleHttpOtherResponseCode(response.status, dispatch);
        }
    } catch (error) {
        console.error('Error updating interview', error);
    } finally {
        // Loading state needs to be decremented, so the page can be updated
        dispatch(decrementLoadingState());
    }
};

/**
 * Redux action to call with a dispatch to send corrected interview updates to
 * the server.  This function is not to be called directly by the application,
 * except through redux's dispatch.
 *
 * It will schedule the call to the interview update callback who runs
 * validations and side effects, updates the interview data on the server and
 * refresh any fields and validations coming from the server. It will update the
 * app's loading state before and after the update call. At the end of the call,
 * the callback function will be called if provided, with the updated interview.
 * @returns The dispatched action
 */
export const startUpdateSurveyCorrectedInterview =
    (data?: Parameters<StartUpdateInterview>[0], callback?: Parameters<StartUpdateInterview>[1]) =>
        async (
            dispatch: ThunkDispatch<RootState, unknown, SurveyAction | AuthAction | LoadingStateAction>,
            getState: () => RootState
        ) => {
            return await asyncDispatchQueue.enqueueTask(async () => {
                await updateSurveyCorrectedInterview(dispatch, getState, data, callback);
            });
        };

/**
 * Redux action to call with a dispatch to navigate forward in the current
 * interview for corrected interviews
 *
 * @returns The dispatched action
 */
export const startNavigateCorrectedInterview = (
    options: Parameters<StartNavigate>[0] = {},
    callback?: Parameters<StartNavigate>[1]
) => startNavigateWithUpdateCallback(startUpdateSurveyCorrectedInterview, options, callback);

// Keep an identifier for the latest interview activation request to avoid race
// conditions and make sure only the most recent sets the interview
let latestInterviewSetRequestId = 0;

/**
 * Fetch an interview from server and set it for edition in correction mode.
 *
 * @param {*} interviewUuid The uuid of the interview to open
 * @param {*} callback
 * @returns
 */
// TODO: unit test
export const startSetSurveyCorrectedInterview = (
    interviewUuid: string,
    callback: (interview: AdminInterviewAttributes) => void = function () {
        return;
    }
) => {
    return async (
        dispatch: ThunkDispatch<RootState, unknown, SurveyAction | AuthAction | LoadingStateAction>,
        _getState: () => RootState
    ) => {
        const requestId = ++latestInterviewSetRequestId;
        try {
            // Make sure to set the interview to `undefined` first, to override
            // any previous interview and avoid side effects if previous state
            // remain.
            dispatch(setInterviewState(undefined));

            const response = await fetch(`/api/survey/activeCorrectedInterview/${interviewUuid}`, {
                credentials: 'include'
            });

            // Only the most recent request may commit the result. This prevents
            // out-of-order responses from overwriting the interview with stale
            // data.
            if (requestId !== latestInterviewSetRequestId) {
                return;
            }

            if (response.status === 200) {
                const body = await response.json();
                if (body.interview) {
                    const interview = body.interview;

                    // Set the interview in the state first
                    dispatch(setInterviewState(interview));

                    // Then, initialize navigation for the current interview
                    // This will handle all necessary updates internally
                    await dispatch(startNavigateCorrectedInterview(undefined, callback));
                }
            } else if (response.status === 403) {
                // The interview is frozen, redirect to the survey unavailable page
                // Note: We want to monitor how often this happens.
                console.log('Redirect to unavailable page: interview cannot be accessed for admin');
                window.location.href = '/unavailable'; // User goes to 'unavailable' page
            }
        } catch (err) {
            surveyHelper.devLog('Error fetching interview to correct.', err);
        }
    };
};

// TODO: unit test
export const startSurveyCorrectedAddGroupedObjects = (
    newObjectsCount: Parameters<StartAddGroupedObjects>[0],
    insertSequence: Parameters<StartAddGroupedObjects>[1],
    path: Parameters<StartAddGroupedObjects>[2],
    attributes: Parameters<StartAddGroupedObjects>[3] = [],
    callback?: Parameters<StartAddGroupedObjects>[4],
    returnOnly: Parameters<StartAddGroupedObjects>[5] = false
) => {
    surveyHelper.devLog(`Add ${newObjectsCount} grouped objects for path ${path} at sequence ${insertSequence}`);
    return (
        dispatch: ThunkDispatch<RootState, unknown, SurveyAction | AuthAction | LoadingStateAction>,
        getState: () => RootState
    ) => {
        const interview = _cloneDeep(getState().survey.interview) as UserRuntimeInterviewAttributes; // needed because we cannot mutate state
        const { valuesByPath } = surveyHelper.addGroupedObjects(
            interview,
            newObjectsCount,
            insertSequence,
            path,
            attributes || []
        );
        if (returnOnly) {
            return valuesByPath;
        } else {
            dispatch(startUpdateSurveyCorrectedInterview({ valuesByPath }, callback));
        }
    };
};

// TODO: unit test
export const startSurveyCorrectedRemoveGroupedObjects = (
    paths: Parameters<StartRemoveGroupedObjects>[0],
    callback?: Parameters<StartRemoveGroupedObjects>[1],
    returnOnly: Parameters<StartRemoveGroupedObjects>[2] = false
) => {
    surveyHelper.devLog('Remove grouped objects at paths', paths);
    return (
        dispatch: ThunkDispatch<RootState, unknown, SurveyAction | AuthAction | LoadingStateAction>,
        getState: () => RootState
    ) => {
        const interview = _cloneDeep(getState().survey.interview) as UserRuntimeInterviewAttributes; // needed because we cannot mutate state
        let unsetPaths: string[] = [];
        let valuesByPath: { [path: string]: unknown } = {};
        [valuesByPath, unsetPaths] = surveyHelper.removeGroupedObjects(interview, paths);
        if (returnOnly) {
            return [valuesByPath, unsetPaths];
        } else {
            dispatch(startUpdateSurveyCorrectedInterview({ valuesByPath, unsetPaths }, callback));
        }
    };
};

/**
 * Fetch an interview from server, run the audits and return the interview for
 * visualization. Review decisions are not part of this payload; they are fetched
 * with a separate, additional call to the server (see `startFetchInterviewReviewDecisions`)
 * so that refreshing audits does not depend on, or pay the cost of, fetching reviews.
 *
 * @param {*} interviewUuid The uuid of the interview to open
 * @param {*} runExtendedAuditChecks Whether to run extended audit checks (default: false)
 * @returns
 */
// TODO: unit test
export const startFetchCorrectedInterviewAndAudits = (
    interviewUuid: string,
    runExtendedAuditChecks: boolean = false
) => {
    return async (
        dispatch: ThunkDispatch<RootState, unknown, SurveyAction | AuthAction | LoadingStateAction>,
        _getState: () => RootState
    ) => {
        try {
            const urlParams = new URLSearchParams();
            if (runExtendedAuditChecks) {
                urlParams.append('extended', 'true');
            }
            const queryString = urlParams.toString();
            const response = await fetch(
                `/api/survey/correctInterview/${interviewUuid}${queryString ? `?${queryString}` : ''}`,
                {
                    credentials: 'include'
                }
            );
            if (response.status === 200) {
                const body = await response.json();
                if (body.interview) {
                    const interview = body.interview;

                    // Unserialize surveyObjectsAndAudits if present
                    unserializeSurveyObjectsAndAudits(interview);

                    // Set the interview in the state first
                    dispatch(updateInterviewState(interview));

                    // Review decisions are fetched separately from the interview and audits;
                    // no need to await, the UI updates whenever they arrive.
                    dispatch(startFetchInterviewReviewDecisions(interviewUuid));
                }
            }
        } catch (err) {
            surveyHelper.devLog('Error fetching interview to correct.', err);
        }
    };
};

/**
 * Fetch an interview from server and re-initialize the corrected_response to the
 * participant's response, but keeping the review comments.
 *
 * @param {*} interviewUuid The uuid of the interview to open
 * @param {*} callback
 * @returns
 */
// TODO: unit test
export const startResetCorrectedInterview = (
    interviewUuid: string,
    callback: (interview: AdminInterviewAttributes) => void = function () {
        return;
    }
) => {
    return async (
        dispatch: ThunkDispatch<RootState, unknown, SurveyAction | AuthAction | LoadingStateAction>,
        _getState: () => RootState
    ) => {
        try {
            const response = await fetch(`/api/survey/correctInterview/${interviewUuid}?reset=true`, {
                credentials: 'include'
            });
            if (response.status === 200) {
                const body = await response.json();
                if (body.interview) {
                    const interview = body.interview;

                    // Unserialize surveyObjectsAndAudits if present
                    unserializeSurveyObjectsAndAudits(interview, 'for reset');

                    // Set the interview in the state and initialize navigation
                    dispatch(updateInterviewState(interview));

                    // Review decisions are fetched separately from the interview and audits;
                    // no need to await, the UI updates whenever they arrive.
                    dispatch(startFetchInterviewReviewDecisions(interviewUuid));

                    // Initialize navigation for the reset interview
                    await dispatch(startNavigateCorrectedInterview(undefined, callback));
                }
            }
        } catch (err) {
            surveyHelper.devLog('Error fetching interview to reset.', err);
        }
    };
};

/**
 * Abort review-related requests after this delay so a stalled request cannot block
 * the per-interview review-action queue forever; the abort rejects the fetch, which
 * is handled by the existing catch paths (devLog / error toast).
 */
const REVIEW_REQUEST_TIMEOUT_MS = 30000;

/** Serializes review-action API calls per interview so responses apply in send order. */
const reviewActionQueueByInterviewUuid = new Map<string, Promise<void>>();

/**
 * Queues review-action work behind prior in-flight actions for the same interview.
 * @param interviewUuid - Interview uuid
 * @param action - Async work to run when the queue reaches this action
 * @returns The action result
 */
const runSerializedReviewAction = <T>(interviewUuid: string, action: () => Promise<T>): Promise<T> => {
    const previous = reviewActionQueueByInterviewUuid.get(interviewUuid) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(action);
    const tail = next.then(
        () => undefined,
        () => undefined
    );
    reviewActionQueueByInterviewUuid.set(interviewUuid, tail);
    tail.finally(() => {
        if (reviewActionQueueByInterviewUuid.get(interviewUuid) === tail) {
            reviewActionQueueByInterviewUuid.delete(interviewUuid);
        }
    });
    return next;
};

/**
 * Stores a review-decisions API payload in the dedicated Redux slice for the open interview.
 * Ignored when the open interview no longer matches the interview the request was sent for.
 * @param dispatch - Redux dispatch
 * @param getState - Redux state accessor
 * @param interviewUuid - Interview uuid the request was sent for
 * @param reviewDecisions - Review decisions payload from the API
 */
const dispatchReviewDecisionsPayload = (
    dispatch: ThunkDispatch<RootState, unknown, SurveyAction | AuthAction | LoadingStateAction>,
    getState: () => RootState,
    interviewUuid: string,
    reviewDecisions: ReviewDecisions
): void => {
    const currentInterview = getState().survey.interview as AdminInterviewAttributes | undefined;
    if (!currentInterview?.uuid || currentInterview.uuid !== interviewUuid) {
        return;
    }
    dispatch({ type: SurveyActionTypes.SET_REVIEW_DECISIONS, reviewDecisions });
};

/**
 * Fetch review decisions for an interview from the server, as a separate API call
 * from the interview and its audits, and store them in the `reviewDecisions` Redux slice.
 *
 * @param {*} interviewUuid The uuid of the interview to fetch review decisions for
 * @returns
 */
export const startFetchInterviewReviewDecisions = (interviewUuid: string) => {
    return async (
        dispatch: ThunkDispatch<RootState, unknown, SurveyAction | AuthAction | LoadingStateAction>,
        getState: () => RootState
    ) => {
        await runSerializedReviewAction(interviewUuid, async () => {
            try {
                const response = await fetch(`/api/review/decisions/${interviewUuid}`, {
                    credentials: 'include',
                    signal: AbortSignal.timeout(REVIEW_REQUEST_TIMEOUT_MS)
                });
                if (response.status === 200) {
                    const body = await response.json();
                    applyReviewMutationResponse(
                        dispatch,
                        getState,
                        interviewUuid,
                        body,
                        'startFetchInterviewReviewDecisions'
                    );
                } else {
                    // Surface auth/permission errors (401/403…) instead of silently showing no review data
                    handleHttpOtherResponseCode(response.status, dispatch);
                }
            } catch (err) {
                console.error('startFetchInterviewReviewDecisions:', err);
                notifyReviewActionFetchFailed();
            }
        });
    };
};

/**
 * Applies a review-mutation success body to Redux, or surfaces a malformed 200 response.
 * @param dispatch - Redux dispatch
 * @param getState - Redux state accessor
 * @param interviewUuid - Interview uuid the request was sent for
 * @param body - Parsed JSON body from the review mutation route
 * @param actionLabel - Label used in error logs
 */
const applyReviewMutationResponse = (
    dispatch: ThunkDispatch<RootState, unknown, SurveyAction | AuthAction | LoadingStateAction>,
    getState: () => RootState,
    interviewUuid: string,
    body: { reviewDecisions?: ReviewDecisions },
    actionLabel: string
): void => {
    if (body.reviewDecisions) {
        dispatchReviewDecisionsPayload(dispatch, getState, interviewUuid, body.reviewDecisions);
        return;
    }
    console.error(`${actionLabel}: success response missing reviewDecisions`, {
        interviewUuid
    });
    toast.error(i18n.t('admin:interviewStats.errors.reviewActionFailed'));
};

/** Notifies the admin when a review mutation request fails before a response is handled. */
const notifyReviewActionFetchFailed = (): void => {
    toast.error(i18n.t('admin:interviewStats.errors.reviewActionFailed'));
};

type ReviewMutationRequestOptions = {
    path: 'decision' | 'clearDecision' | 'reReview' | 'forceApprove' | 'clearForceApprove';
    body: Record<string, unknown>;
    actionLabel: string;
    onNonSuccessStatus?: (
        response: Response,
        dispatch: ThunkDispatch<RootState, unknown, SurveyAction | AuthAction | LoadingStateAction>
    ) => boolean;
};

/**
 * POSTs a review mutation route and applies the server payload to Redux when successful.
 * @param dispatch - Redux dispatch
 * @param getState - Redux state accessor
 * @param interviewUuid - Interview uuid the request was sent for
 * @param options - Route path, body, labels, and optional non-success handling
 */
const submitReviewMutationRequest = async (
    dispatch: ThunkDispatch<RootState, unknown, SurveyAction | AuthAction | LoadingStateAction>,
    getState: () => RootState,
    interviewUuid: string,
    options: ReviewMutationRequestOptions
): Promise<void> => {
    dispatch(incrementLoadingState());
    try {
        const response = await fetch(`/api/review/${options.path}/${interviewUuid}`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(options.body),
            signal: AbortSignal.timeout(REVIEW_REQUEST_TIMEOUT_MS)
        });
        if (response.status === 200) {
            const body = await response.json();
            applyReviewMutationResponse(dispatch, getState, interviewUuid, body, options.actionLabel);
            return;
        }
        if (options.onNonSuccessStatus?.(response, dispatch)) {
            return;
        }
        console.error(`${options.actionLabel}:`, response.status);
        handleHttpOtherResponseCode(response.status, dispatch);
    } catch (error) {
        console.error(`${options.actionLabel}:`, error);
        notifyReviewActionFetchFailed();
    } finally {
        dispatch(decrementLoadingState());
    }
};

/**
 * Runs a review mutation serialized per interview when the admin interview is loaded.
 * @param getState - Redux getter for the current survey state
 * @param action - Mutation to run with the interview uuid
 */
const withSerializedInterviewReviewAction = async (
    getState: () => RootState,
    action: (interviewUuid: string) => Promise<void>
): Promise<void> => {
    const interview = getState().survey.interview as AdminInterviewAttributes | undefined;
    if (!interview?.uuid) {
        return;
    }
    await runSerializedReviewAction(interview.uuid, () => action(interview.uuid));
};

/**
 * Submit an approve/reject decision for one survey object during admin review.
 * @param objectType - Survey object type key
 * @param objectUuid - Survey object uuid
 * @param decision - Reviewer decision
 * @returns Thunk that persists the decision and refreshes review state in Redux
 */
export const startSubmitObjectReview = (
    objectType: SurveyObjectName,
    objectUuid: string,
    decision: ReviewDecisionValue
) => {
    return async (
        dispatch: ThunkDispatch<RootState, unknown, SurveyAction | AuthAction | LoadingStateAction>,
        getState: () => RootState
    ) => {
        await withSerializedInterviewReviewAction(getState, async (interviewUuid) => {
            await submitReviewMutationRequest(dispatch, getState, interviewUuid, {
                path: 'decision',
                body: { objectType, objectUuid, decision },
                actionLabel: 'Error submitting object review'
            });
        });
    };
};

/**
 * Clears the current reviewer's approve/reject decision for one survey object.
 * @param objectType - Survey object type key
 * @param objectUuid - Survey object uuid
 * @returns Thunk that removes the decision and refreshes review state in Redux
 */
export const startClearObjectReview = (objectType: SurveyObjectName, objectUuid: string) => {
    return async (
        dispatch: ThunkDispatch<RootState, unknown, SurveyAction | AuthAction | LoadingStateAction>,
        getState: () => RootState
    ) => {
        await withSerializedInterviewReviewAction(getState, async (interviewUuid) => {
            await submitReviewMutationRequest(dispatch, getState, interviewUuid, {
                path: 'clearDecision',
                body: { objectType, objectUuid },
                actionLabel: 'Error clearing object review'
            });
        });
    };
};

/**
 * Ask every other reviewer who decided on a survey object to review it again,
 * after corrections were made (GitHub-style re-request review).
 * @param objectType - Survey object type key
 * @param objectUuid - Survey object uuid
 * @returns Thunk that persists the re-review request and refreshes review state in Redux
 */
export const startRequestReReview = (objectType: SurveyObjectName, objectUuid: string) => {
    return async (
        dispatch: ThunkDispatch<RootState, unknown, SurveyAction | AuthAction | LoadingStateAction>,
        getState: () => RootState
    ) => {
        await withSerializedInterviewReviewAction(getState, async (interviewUuid) => {
            await submitReviewMutationRequest(dispatch, getState, interviewUuid, {
                path: 'reReview',
                body: { objectType, objectUuid },
                actionLabel: 'Error requesting re-review'
            });
        });
    };
};

/**
 * Admin force-approve on a survey object, overriding reviewer disagreements.
 * @param objectType - Survey object type key
 * @param objectUuid - Survey object uuid
 * @returns Thunk that persists the force-approve and refreshes review state in Redux
 */
export const startForceApproveObject = (objectType: SurveyObjectName, objectUuid: string) => {
    return async (
        dispatch: ThunkDispatch<RootState, unknown, SurveyAction | AuthAction | LoadingStateAction>,
        getState: () => RootState
    ) => {
        await withSerializedInterviewReviewAction(getState, async (interviewUuid) => {
            await submitReviewMutationRequest(dispatch, getState, interviewUuid, {
                path: 'forceApprove',
                body: { objectType, objectUuid },
                actionLabel: 'Error force-approving object',
                onNonSuccessStatus: (response) => {
                    if (response.status === 409) {
                        toast.error(i18n.t('admin:interviewMember.forceApproveRequiresConflict'));
                        return true;
                    }
                    return false;
                }
            });
        });
    };
};

/**
 * Clears the current admin's force-approve on one survey object.
 * @param objectType - Survey object type key
 * @param objectUuid - Survey object uuid
 * @returns Thunk that removes force-approve and refreshes review state in Redux
 */
export const startClearForceApproveObject = (objectType: SurveyObjectName, objectUuid: string) => {
    return async (
        dispatch: ThunkDispatch<RootState, unknown, SurveyAction | AuthAction | LoadingStateAction>,
        getState: () => RootState
    ) => {
        await withSerializedInterviewReviewAction(getState, async (interviewUuid) => {
            await submitReviewMutationRequest(dispatch, getState, interviewUuid, {
                path: 'clearForceApprove',
                body: { objectType, objectUuid },
                actionLabel: 'Error clearing force approve'
            });
        });
    };
};
