/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import _set from 'lodash/set';
import _get from 'lodash/get';
import _cloneDeep from 'lodash/cloneDeep';
import isEqual from 'lodash/isEqual';
import _unset from 'lodash/unset';
import bowser from 'bowser';
import { NavigateFunction } from 'react-router';

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
import { prepareSectionWidgets } from './utils';
import { incrementLoadingState, decrementLoadingState } from './LoadingState';
import { CliUser } from 'chaire-lib-common/lib/services/user/userType';
import i18n from '../config/i18n.config';
import { handleClientError, handleHttpOtherResponseCode } from '../services/errorManagement/errorHandling';
import applicationConfiguration from '../config/application.config';
import { UserRuntimeInterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';

// called whenever an update occurs in interview responses or when section is switched to
// TODO: unit test
export const updateSection = (
    sectionShortname: string,
    _interview: UserRuntimeInterviewAttributes,
    affectedPaths: { [path: string]: boolean },
    valuesByPath: { [path: string]: unknown },
    updateKey = false,
    user?: CliUser
): [UserRuntimeInterviewAttributes, { [path: string]: unknown }] => {
    let interview = _cloneDeep(_interview);
    let currentValuesByPath = valuesByPath;
    let needToUpdate = true; // will stay true if an assigned value changed the initial value after a conditional failed
    let updateCount = 0;

    while (needToUpdate && updateCount < 10 /* security against infinite loops */) {
        const { updatedInterview, updatedValuesByPath, needUpdate } = prepareSectionWidgets(
            sectionShortname,
            interview,
            affectedPaths,
            valuesByPath,
            updateKey,
            user
        );
        needToUpdate = needUpdate;
        interview = updatedInterview;
        currentValuesByPath = updatedValuesByPath;
        updateCount++;
    }

    return [interview, currentValuesByPath];
};

const startUpdateInterviewCallback = async (
    dispatch,
    getState,
    requestedSectionShortname: string | null,
    valuesByPath: { [path: string]: unknown } = {},
    unsetPaths?: string[],
    initialInterview?: UserRuntimeInterviewAttributes,
    callback?: (interview: UserRuntimeInterviewAttributes) => void,
    navigate?: NavigateFunction
) => {
    try {
        const interview = initialInterview ? initialInterview : _cloneDeep(getState().survey.interview);
        const user = getState().auth?.user || undefined;
        dispatch(incrementLoadingState());
        if (valuesByPath && Object.keys(valuesByPath).length > 0) {
            surveyHelper.devLog(
                'Update interview and section with values by path',
                JSON.parse(JSON.stringify(valuesByPath))
            );
        }

        const affectedPaths = {};

        if (Array.isArray(unsetPaths)) {
            // unsetPaths if array (each path in array has to be deleted)
            for (let i = 0, count = unsetPaths.length; i < count; i++) {
                const path = unsetPaths[i];
                affectedPaths[path] = true;
                _unset(interview, path);
            }
        } else {
            unsetPaths = [];
        }

        // update language if needed:
        const oldLanguage = surveyHelper.getResponse(interview, '_language', null);
        const actualLanguage = i18n.language;
        if (oldLanguage !== actualLanguage) {
            valuesByPath['responses._language'] = actualLanguage;
        }

        if (valuesByPath) {
            if (valuesByPath['_all'] === true) {
                affectedPaths['_all'] = true;
            }
            for (const path in valuesByPath) {
                if (path !== '_all') {
                    affectedPaths[path] = true;
                    _set(interview, path, valuesByPath[path]);
                }
            }
        }

        // TODO An Interview object could have a getActiveSection function to get this value
        const sectionShortname = surveyHelper.getResponse(
            interview,
            '_activeSection',
            requestedSectionShortname
        ) as string;

        const [updatedInterview, updatedValuesByPath] = updateSection(
            sectionShortname,
            interview,
            affectedPaths,
            valuesByPath,
            false,
            user
        );

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

        // No changes to send to the server, just update the state and quit
        if (isEqual(updatedValuesByPath, { _all: true }) && _isBlank(unsetPaths)) {
            // '_all' means the "save" button was clicked and the form was submitted, so the form may not follow the normal form change workflow
            dispatch(updateInterview(_cloneDeep(updatedInterview), {}, true));
            if (typeof callback === 'function') {
                callback(updatedInterview);
            }
            return null;
        }

        // Send update responses to the server
        const response = await fetch('/api/survey/updateInterview', {
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            method: 'POST',
            body: JSON.stringify({
                id: updatedInterview.id,
                interviewId: interview.uuid,
                participant_id: updatedInterview.participant_id,
                valuesByPath: updatedValuesByPath,
                unsetPaths: unsetPaths
            })
        });

        if (response.status === 200) {
            const body = await response.json();
            if (
                (body.status === 'success' || body.status === 'invalid') &&
                body.interviewId === updatedInterview.uuid
            ) {
                // Reset server validation for any field updated
                // TODO This shouldn't be done here in this manner. See https://github.com/chairemobilite/transition/issues/1245
                const currentServerErrors = Object.assign({}, getState().survey.errors || {});
                for (const path in currentServerErrors) {
                    if (updatedValuesByPath[`responses.${path}`] || unsetPaths[`responses.${path}`]) {
                        delete currentServerErrors[path];
                    }
                }
                const newServerErrors = body.status === 'invalid' ? body.messages : undefined;

                // Update the interview with server assigned values if applicable
                let serverUpdatedInterview = updatedInterview;
                if (body.updatedValuesByPath && Object.keys(body.updatedValuesByPath).length > 0) {
                    const serverAffectedPath = {};
                    for (const path in body.updatedValuesByPath) {
                        serverAffectedPath[path] = true;
                        _set(updatedInterview, path, body.updatedValuesByPath[path]);
                    }
                    // Get the section shortname again, it could have been changed by the server
                    const sectionShortname = surveyHelper.getResponse(
                        updatedInterview,
                        '_activeSection',
                        requestedSectionShortname
                    ) as string;
                    // Need to update the widget status with server data, there should be no side-effect, so no loop update here
                    serverUpdatedInterview = updateSection(
                        sectionShortname,
                        updatedInterview,
                        serverAffectedPath,
                        body.updatedValuesByPath,
                        true,
                        user
                    )[0];
                    // FIXME When the interview update process is better
                    // documented and understood, see why we need this, but when
                    // the section is changed by the server, not doing this
                    // block results in empty survey rendering.
                    if (
                        !serverUpdatedInterview.sectionLoaded ||
                        serverUpdatedInterview.sectionLoaded !== sectionShortname
                    ) {
                        serverUpdatedInterview.sectionLoaded = sectionShortname;
                    }
                }

                dispatch(
                    updateInterview(
                        _cloneDeep(serverUpdatedInterview),
                        Object.assign(currentServerErrors, newServerErrors),
                        updatedValuesByPath['_all'] === true
                    )
                );
                if (typeof callback === 'function') {
                    callback(updatedInterview);
                }
            } else if (body.status === 'redirect') {
                // Logout from the application and redirect to the specified URL
                // TODO Can't use the dispatch action, as the startLogout
                // requires the navigate function and here it is optional. This
                // fetch logout should be in a helper.
                fetch('/logout', { credentials: 'include' });
                window.location.href = body.redirectUrl;
            } else {
                // we need to do something if no interview is returned (error)
            }
        } else {
            console.log(`Update interview: wrong responses status: ${response.status}`);
            await handleHttpOtherResponseCode(response.status, dispatch, navigate);
        }
    } catch (error) {
        console.log('Error updating interview', error);

        handleClientError(error instanceof Error ? error : new Error(String(error)), {
            navigate,
            interviewId: getState().survey.interview!.id
        });
    } finally {
        // Loading state needs to be decremented, so the page can be updated
        dispatch(decrementLoadingState());
    }
};

export const updateInterview = (
    interview: UserRuntimeInterviewAttributes,
    errors: {
        [path: string]: {
            [lang: string]: string;
        };
    } = {},
    submitted = false
) => ({
    type: 'UPDATE_INTERVIEW',
    interviewLoaded: true,
    interview,
    errors,
    submitted
});

/**
 * Redux action to call with a dispatch to send interview updates to the server.
 * This function is not to be called directly by the application, except through
 * redux's connect function.
 *
 * It will schedule the call to the interview update callback who update the
 * interview data on the server and refresh any fields and validations coming
 * from the server. It will update the app's loading state before and after the
 * update call. At the end of the call, the callback function will be called if
 * provided, with the updated interview.
 * @returns The dispatched action
 */
export const startUpdateInterview =
    (
        sectionShortname: string | null,
        valuesByPath?: { [path: string]: unknown },
        unsetPaths?: string[],
        interview?: UserRuntimeInterviewAttributes,
        callback?: (interview: UserRuntimeInterviewAttributes) => void,
        navigate?: NavigateFunction
    ) =>
        async (dispatch, getState) => {
            return await startUpdateInterviewCallback(
                dispatch,
                getState,
                sectionShortname,
                valuesByPath,
                unsetPaths,
                interview,
                callback,
                navigate
            );
        };

export const addConsent = (consented: boolean) => ({
    type: 'ADD_CONSENT',
    consented
});

/**
 * Redux action to call with a dispatch to add grouped objects to the interview
 * and optionally update the server.
 *
 * @param newObjectsCount The number of new objects to add
 * @param insertSequence The sequence number to insert the new objects at. To
 * insert at the end, use a negative number
 * @param path The path in the interview that contains the object array to which
 * to add the new objects
 * @param attributes The attributes to assign to the new objects
 * @param callback A callback function to call after the interview has been
 * updated
 * @param returnOnly If true, the action will return the updated values by path
 * instead of dispatching the update to the server
 * @returns The dispatched action
 */
export const startAddGroupedObjects = (
    newObjectsCount: number,
    insertSequence: number | undefined,
    path: string,
    attributes: { [objectField: string]: unknown }[] = [],
    callback?: (interview: UserRuntimeInterviewAttributes) => void,
    returnOnly = false
) => {
    surveyHelper.devLog(`Add ${newObjectsCount} grouped objects for path ${path} at sequence ${insertSequence}`);
    return (dispatch, getState) => {
        const interview = _cloneDeep(getState().survey.interview); // needed because we cannot mutate state
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
            dispatch(startUpdateInterview(null, changedValuesByPath, undefined, undefined, callback));
        }
    };
};

/**
 * Redux action to call with a dispatch to remove grouped objects from the
 * interview and optionally update the server. Sequences of the remaining
 * objects will be updated to be continuous.
 *
 * @param paths An array of paths to the objects to remove.
 * @param callback A callback function to call after the interview has been
 * updated
 * @param returnOnly If true, the action will return the updated values by path
 * instead of dispatching the update to the server
 * @returns
 */
export const startRemoveGroupedObjects = function (
    paths: string | string[],
    callback?: (interview: UserRuntimeInterviewAttributes) => void,
    returnOnly = false
) {
    surveyHelper.devLog('Remove grouped objects at paths', paths);
    return (dispatch, getState) => {
        const interview = _cloneDeep(getState().survey.interview); // needed because we cannot mutate state
        const [valuesByPath, unsetPaths] = surveyHelper.removeGroupedObjects(interview, paths);
        if (returnOnly) {
            return [valuesByPath, unsetPaths];
        } else {
            dispatch(startUpdateInterview(null, valuesByPath, unsetPaths, undefined, callback));
        }
    };
};

export const startSetInterview = (
    activeSection: string | null = null,
    surveyUuid: string | undefined = undefined,
    navigate: NavigateFunction | undefined = undefined,
    preFilledResponses: { [key: string]: unknown } | undefined = undefined
) => {
    // FIXME There's a lot of code duplication with the startCreateInterview function, either merge them or make them more DRY
    return async (dispatch, _getState) => {
        try {
            const browserTechData = bowser.getParser(window.navigator.userAgent).parse();
            // get the interview from the server for the current user, or with a specific survey uuid
            const response = await fetch(
                `/api/survey/activeInterview${surveyUuid ? `/${encodeURI(surveyUuid)}` : ''}`,
                {
                    credentials: 'include'
                }
            );
            // FIXME If there is no interview, it should be a 404 answer instead of a 200 with no interview
            if (response.status === 200) {
                const body = await response.json();
                // Get the interview from the response
                if (body.interview) {
                    const interview = body.interview;
                    // Set active section and initial responses in the interview
                    // Find the first section to activate, if none requested (the one without a previous one)
                    // FIXME This should be done in the backend, not here
                    // FIXME 2 If there was a previous active section in the interview, why not just use that instead of setting it anew
                    if (!activeSection) {
                        for (const sectionShortname in applicationConfiguration.sections) {
                            if (applicationConfiguration.sections[sectionShortname].previousSection === null) {
                                activeSection = sectionShortname;
                                break;
                            }
                        }
                    }
                    const valuesByPath = {
                        'responses._activeSection': activeSection
                    };
                    if (preFilledResponses) {
                        Object.keys(preFilledResponses).forEach((key) => {
                            valuesByPath[`responses.${key}`] = preFilledResponses[key];
                        });
                    }
                    // update browser data if different:
                    // TODO We need to track the different browser/user accesses
                    const existingBrowserUa = _get(interview, 'responses._browser._ua', null);
                    const newBrowserUa = browserTechData.getUA();
                    if (existingBrowserUa !== newBrowserUa) {
                        valuesByPath['responses._browser'] = browserTechData;
                    }
                    dispatch(
                        startUpdateInterview(activeSection, valuesByPath, undefined, interview, undefined, navigate)
                    );
                } else {
                    // No interview for this user, create one
                    // FIXME Shouldn't the server do this? The createInterview and setInterview should be merged
                    // FIXME 2 Does it make sense to create a new interview if there is a surveyUUID?
                    dispatch(startCreateInterview(preFilledResponses));
                }
            } else {
                console.log(`Get active interview: wrong responses status: ${response.status}`);
                handleHttpOtherResponseCode(response.status, dispatch, navigate);
            }
        } catch (err) {
            surveyHelper.devLog('Error fetching interview.', err);
            handleClientError(err instanceof Error ? err : new Error(String(err)), {});
        }
    };
};

export const startCreateInterview = (preFilledResponses: { [key: string]: unknown } | undefined = undefined) => {
    const browserTechData = bowser.getParser(window.navigator.userAgent).parse();
    return async (dispatch, _getState) => {
        try {
            // create a new interview on the server for the current user
            const response = await fetch('/api/survey/createInterview', {
                credentials: 'include'
            });
            if (response.status === 200) {
                // Get the interview from the response
                const body = await response.json();
                if (body.interview) {
                    // Set active section and initial responses in the interview
                    let activeSection: string | null = null;
                    // Find the first section to activate (the one without a previous one)
                    // FIXME This should be done in the backend, not here
                    for (const sectionShortname in applicationConfiguration.sections) {
                        if (applicationConfiguration.sections[sectionShortname].previousSection === null) {
                            activeSection = sectionShortname;
                            break;
                        }
                    }
                    const responses = {
                        'responses._activeSection': activeSection,
                        'responses._browser': browserTechData
                    };
                    if (preFilledResponses) {
                        Object.keys(preFilledResponses).forEach((key) => {
                            responses[`responses.${key}`] = preFilledResponses[key];
                        });
                    }
                    // Update the interview with the initial responses
                    dispatch(startUpdateInterview(activeSection, responses, undefined, body.interview));
                } else {
                    // we need to do something if no interview is returned (error)
                    handleClientError('createInterview returned success but no interview was returned', {});
                }
            } else {
                console.log(`Creating interview: wrong responses status: ${response.status}`);
                handleHttpOtherResponseCode(response.status, dispatch);
            }
        } catch (err) {
            surveyHelper.devLog('Error creating interview.', err);
            handleClientError(err instanceof Error ? err : new Error(String(err)), {});
        }
    };
};
