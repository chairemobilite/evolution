/*
 * Copyright 2022, Polytechnique Montreal and contributors
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
import { SurveyObjectsWithAudits } from 'evolution-common/lib/services/audits/types';

// Extended type for admin interviews that includes surveyObjectsAndAudits
type AdminInterviewAttributes = UserRuntimeInterviewAttributes & {
    surveyObjectsAndAudits?: SurveyObjectsWithAudits;
};
import { incrementLoadingState, decrementLoadingState } from './LoadingState';
import { handleHttpOtherResponseCode } from '../services/errorManagement/errorHandling';
import {
    validateAndPrepareSection,
    updateInterviewState,
    updateInterviewData,
    startNavigateWithUpdateCallback,
    asyncDispatchQueue
} from './Survey';
import { ThunkDispatch } from 'redux-thunk';
import { RootState } from '../store/configureStore';
import { SurveyAction } from '../store/survey';
import { LoadingStateAction } from '../store/loadingState';
import { AuthAction } from 'chaire-lib-frontend/lib/store/auth';

/**
 * Helper function to unserialize surveyObjectsAndAudits from an interview.
 * Mutates the interview object in place if unserialization is successful.
 *
 * @param interview - The interview containing surveyObjectsAndAudits to unserialize
 * @param errorContext - Optional context string to include in error message (e.g., 'for reset')
 */
const unserializeSurveyObjectsAndAudits = (interview: AdminInterviewAttributes, errorContext: string = ''): boolean => {
    if (interview.surveyObjectsAndAudits && SurveyObjectsUnserializer.hasValidData(interview.surveyObjectsAndAudits)) {
        try {
            interview.surveyObjectsAndAudits = SurveyObjectsUnserializer.unserialize(interview.surveyObjectsAndAudits);
            return true;
        } catch (error) {
            const contextSuffix = errorContext ? ` ${errorContext}` : '';
            console.error(`Failed to unserialize surveyObjectsAndAudits${contextSuffix}:`, error);
            return false;
        }
    }
    return true; // No data to unserialize is considered success
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
            // Preserve surveyObjectsAndAudits after validation
            updatedInterview = { ...updatedInterview, surveyObjectsAndAudits: interview.surveyObjectsAndAudits };
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

        //const differences = surveyHelper.differences(interview.response, oldInterview.response);
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
                //surveyHelper.devLog('Interview saved to db');
                //setTimeout(function() {
                dispatch(updateInterviewState(_cloneDeep(updatedInterview), {}, updatedValuesByPath['_all'] === true));
                if (typeof callback === 'function') {
                    callback(updatedInterview);
                }
                //}, 500, 'That was really slow!');
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
        try {
            const response = await fetch(`/api/survey/activeCorrectedInterview/${interviewUuid}`, {
                credentials: 'include'
            });
            if (response.status === 200) {
                const body = await response.json();
                if (body.interview) {
                    const interview = body.interview;

                    // Set the interview in the state first
                    dispatch(updateInterviewState(interview));

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
        const changedValuesByPath = surveyHelper.addGroupedObjects(
            interview,
            newObjectsCount,
            insertSequence,
            path,
            attributes || []
        );
        if (returnOnly) {
            return changedValuesByPath;
        } else {
            dispatch(startUpdateSurveyCorrectedInterview({ valuesByPath: changedValuesByPath }, callback));
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
 * visualization
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

                    // Initialize navigation for the reset interview
                    await dispatch(startNavigateCorrectedInterview(undefined, callback));
                }
            }
        } catch (err) {
            surveyHelper.devLog('Error fetching interview to reset.', err);
        }
    };
};
