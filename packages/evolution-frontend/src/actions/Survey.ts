import _set from 'lodash/set';
import _get from 'lodash/get';
import _cloneDeep from 'lodash/cloneDeep';
import isEqual from 'lodash/isEqual';
import _unset from 'lodash/unset';
import { History } from 'history';
import bowser from 'bowser';

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
import { prepareWidgets } from './utils';
import { UserFrontendInterviewAttributes } from '../services/interviews/interview';
import { incrementLoadingState, decrementLoadingState } from './LoadingState';
import { CliUser } from 'chaire-lib-common/lib/services/user/userType';
import i18n from 'chaire-lib-frontend/lib/config/i18n.config';
import { handleClientError, handleHttpOtherResponseCode } from '../services/errorManagement/errorHandling';
import applicationConfiguration from '../config/application.config';
import config from 'chaire-lib-common/lib/config/shared/project.config';

// called whenever an update occurs in interview responses or when section is switched to
export const updateSection = (
    sectionShortname: string,
    _interview: UserFrontendInterviewAttributes,
    affectedPaths: { [path: string]: boolean },
    valuesByPath: { [path: string]: unknown },
    updateKey = false,
    user?: CliUser
): [UserFrontendInterviewAttributes, { [path: string]: unknown }] => {
    let interview = _cloneDeep(_interview);
    let needToUpdate = true; // will stay true if an assigned value changed the initial value after a conditional failed
    let updateCount = 0;
    let foundOneOpenedModal = false; // TODO Remove this variable, it is not used? Why is it there?

    while (needToUpdate && updateCount < 10 /* security against infinite loops */) {
        [interview, valuesByPath, needToUpdate, foundOneOpenedModal] = prepareWidgets(
            sectionShortname,
            interview,
            affectedPaths,
            valuesByPath,
            updateKey,
            user
        );
        updateCount++;
    }

    return [interview, valuesByPath];
};

const startUpdateInterviewCallback = async (
    next,
    dispatch,
    getState,
    requestedSectionShortname: string | null,
    valuesByPath: { [path: string]: unknown } = {},
    unsetPaths?: string[],
    initialInterview?: UserFrontendInterviewAttributes,
    callback?: (interview: UserFrontendInterviewAttributes) => void,
    history?: History
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
            dispatch(decrementLoadingState());
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
                // requires the history and here it is optional. This fetch
                // logout should be in a helper.
                fetch('/logout', { credentials: 'include' });
                window.location.href = body.redirectUrl;
            } else {
                // we need to do something if no interview is returned (error)
            }
        } else {
            console.log(`Update interview: wrong responses status: ${response.status}`);
            await handleHttpOtherResponseCode(response.status, dispatch, history);
        }
        // Loading state needs to be decremented, no matter the return value, otherwise the page won't get updated
        dispatch(decrementLoadingState());
    } catch (error) {
        console.log('Error updating interview', error);
        // Loading state needs to be decremented, no matter the return value, otherwise the page won't get updated
        // TODO Put in the finally block if we are sure there are no side effect in the code path that returns before the fetch
        dispatch(decrementLoadingState());
        handleClientError(error instanceof Error ? error : new Error(String(error)), {
            history,
            interviewId: getState().survey.interview!.id
        });
    } finally {
        next();
    }
};

export const updateInterview = (
    interview: UserFrontendInterviewAttributes,
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
export const startUpdateInterview = (
    sectionShortname: string | null,
    valuesByPath?: { [path: string]: unknown },
    unsetPaths?: string[],
    interview?: UserFrontendInterviewAttributes,
    callback?: (interview: UserFrontendInterviewAttributes) => void,
    history?: History
) => ({
    queue: 'UPDATE_INTERVIEW',
    callback: async (next, dispatch, getState) => {
        await startUpdateInterviewCallback(
            next,
            dispatch,
            getState,
            sectionShortname,
            valuesByPath,
            unsetPaths,
            interview,
            callback,
            history
        );
    }
});

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
    callback?: (interview: UserFrontendInterviewAttributes) => void,
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
    callback?: (interview: UserFrontendInterviewAttributes) => void,
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

export const startUpdateSurveyValidateInterview = function (
    sectionShortname: string | null,
    valuesByPath: { [path: string]: unknown } | null = null,
    unsetPaths: string[] | null = null,
    interview: UserFrontendInterviewAttributes | null = null,
    callback: (interview: UserFrontendInterviewAttributes) => void
) {
    return {
        queue: 'UPDATE_INTERVIEW',
        callback: async function (next, dispatch, getState) {
            //surveyHelper.devLog(`Update interview and section with values by path`, valuesByPath);
            try {
                if (interview === null) {
                    interview = _cloneDeep(getState().survey.interview);
                }

                //interview.sectionLoaded = null;

                dispatch(incrementLoadingState());

                if (valuesByPath && Object.keys(valuesByPath).length > 0) {
                    surveyHelper.devLog(
                        'Update interview and section with values by path',
                        JSON.parse(JSON.stringify(valuesByPath))
                    );
                }

                //const oldInterview = _cloneDeep(interview);
                //const previousSection = surveyHelper.getResponse(interview, '_activeSection', null);

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
                //const oldLanguage    = _get(interview, 'responses._language', null);
                //const actualLanguage = null;//i18n.language;
                //if (oldLanguage !== actualLanguage)
                //{
                //   valuesByPath['responses._language'] = actualLanguage;
                //}

                if (valuesByPath) {
                    if (valuesByPath['_all'] === true) {
                        affectedPaths['_all'] = true;
                    }
                    for (const path in valuesByPath) {
                        affectedPaths[path] = true;
                        if (interview) {
                            _set(interview, path, valuesByPath[path]);
                        }
                    }
                }

                // TODO: update this so it works well with validationOnePager (admin). Should we force this? Anyway this code should be replaced/updated completely in the next version.
                sectionShortname =
                    sectionShortname === 'validationOnePager'
                        ? 'validationOnePager'
                        : (surveyHelper.getResponse(
                              interview as UserFrontendInterviewAttributes,
                              '_activeSection',
                              sectionShortname
                        ) as string);
                //if (sectionShortname !== previousSection) // need to update all widgets if new section
                //{
                //  affectedPaths['_all'] = true;
                //}
                const updatedInterviewAndValuesByPath = updateSection(
                    sectionShortname,
                    interview as UserFrontendInterviewAttributes,
                    affectedPaths,
                    valuesByPath as { [path: string]: unknown }
                );
                interview = updatedInterviewAndValuesByPath[0];
                valuesByPath = updatedInterviewAndValuesByPath[1];

                if (!interview.sectionLoaded || interview.sectionLoaded !== sectionShortname) {
                    valuesByPath['sectionLoaded'] = sectionShortname;
                    interview.sectionLoaded = sectionShortname;
                }

                // convert undefined values to unset (delete) because stringify will remove undefined values:
                for (const path in valuesByPath) {
                    if (valuesByPath[path] === undefined) {
                        unsetPaths.push(path);
                    }
                }

                if (isEqual(valuesByPath, { _all: true }) && _isBlank(unsetPaths)) {
                    dispatch(updateInterview(_cloneDeep(interview)));
                    dispatch(decrementLoadingState());
                    if (typeof callback === 'function') {
                        callback(interview);
                    }
                    return null;
                }

                //const differences = surveyHelper.differences(interview.responses, oldInterview.responses);
                const response = await fetch(`/api/survey/updateValidateInterview/${interview.uuid}`, {
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    method: 'POST',
                    body: JSON.stringify({
                        id: interview.id,
                        participant_id: interview.participant_id,
                        valuesByPath: valuesByPath,
                        unsetPaths: unsetPaths
                        //responses  : interview.responses,
                        //validations: interview.validations
                    })
                });
                if (response.status === 200) {
                    const body = await response.json();
                    if (body.status === 'success' && body.interviewId === interview.uuid) {
                        //surveyHelper.devLog('Interview saved to db');
                        //setTimeout(function() {
                        dispatch(updateInterview(_cloneDeep(interview)));
                        if (typeof callback === 'function') {
                            callback(interview);
                        }
                        //}, 500, 'That was really slow!');
                    } else {
                        // we need to do something if no interview is returned (error)
                    }
                } else {
                    console.log(`startUpdateSurveyValidateInterview: wrong responses status: ${response.status}`);
                    handleHttpOtherResponseCode(response.status, dispatch);
                }
                // Loading state needs to be decremented, no matter the return value, otherwise the page won't get updated
                dispatch(decrementLoadingState());
            } catch (error) {
                console.log('Error updating interview', error);
                // Loading state needs to be decremented, no matter the return value, otherwise the page won't get updated
                // TODO Put in the finally block if we are sure there are no side effect in the code path that returns before the fetch
                dispatch(decrementLoadingState());
            } finally {
                next();
            }
        }
    };
};

/**
 * Fetch an interview from server and set it for edition in validation mode.
 *
 * @param {*} interviewUuid The uuid of the interview to open
 * @param {*} callback
 * @returns
 */
export const startSetSurveyValidateInterview = (
    interviewUuid: string,
    callback: (interview: UserFrontendInterviewAttributes) => void = function () {
        return;
    }
) => {
    return (dispatch, _getState) => {
        return fetch(`/api/survey/validateInterview/${interviewUuid}`, {
            credentials: 'include'
        })
            .then((response) => {
                if (response.status === 200) {
                    response.json().then((body) => {
                        if (body.interview) {
                            const interview = body.interview;
                            dispatch(startUpdateSurveyValidateInterview('home', {}, null, interview, callback));
                        }
                    });
                }
            })
            .catch((err) => {
                surveyHelper.devLog('Error fetching interview to validate.', err);
            });
    };
};

export const startValidateAddGroupedObjects = (
    newObjectsCount,
    insertSequence,
    path,
    attributes = [],
    callback,
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
            dispatch(
                startUpdateSurveyValidateInterview('validationOnePager', changedValuesByPath, null, null, callback)
            );
        }
    };
};

export const startSurveyValidateRemoveGroupedObjects = function (paths, callback, returnOnly = false) {
    surveyHelper.devLog('Remove grouped objects at paths', paths);
    return (dispatch, getState) => {
        const interview = _cloneDeep(getState().survey.interview); // needed because we cannot mutate state
        let unsetPaths: string[] = [];
        let valuesByPath: { [path: string]: unknown } = {};
        [valuesByPath, unsetPaths] = surveyHelper.removeGroupedObjects(interview, paths);
        if (returnOnly) {
            return [valuesByPath, unsetPaths];
        } else {
            dispatch(startUpdateSurveyValidateInterview(null, valuesByPath, unsetPaths, null, callback));
        }
    };
};

export const startSurveyValidateAddGroupedObjects = (
    newObjectsCount,
    insertSequence,
    path,
    attributes = [],
    callback,
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
            dispatch(startUpdateSurveyValidateInterview(null, changedValuesByPath, null, null, callback));
        }
    };
};

export const startValidateRemoveGroupedObjects = function (paths, callback, returnOnly = false) {
    surveyHelper.devLog('Remove grouped objects at paths', paths);
    return (dispatch, getState) => {
        const interview = _cloneDeep(getState().survey.interview); // needed because we cannot mutate state
        let unsetPaths: string[] = [];
        let valuesByPath: { [path: string]: unknown } = {};
        [valuesByPath, unsetPaths] = surveyHelper.removeGroupedObjects(interview, paths);
        if (returnOnly) {
            return [valuesByPath, unsetPaths];
        } else {
            dispatch(
                startUpdateSurveyValidateInterview('validationOnePager', valuesByPath, unsetPaths, null, callback)
            );
        }
    };
};

/**
 * Fetch an interview from server and re-initialize the validated_data to the
 * participant's responses, but keeping the validation comments.
 *
 * @param {*} interviewUuid The uuid of the interview to open
 * @param {*} callback
 * @returns
 */
export const startResetValidateInterview = (
    interviewUuid,
    callback = function () {
        return;
    }
) => {
    return (dispatch, _getState) => {
        return fetch(`/api/survey/validateInterview/${interviewUuid}?reset=true`, {
            credentials: 'include'
        })
            .then((response) => {
                if (response.status === 200) {
                    response.json().then((body) => {
                        if (body.interview) {
                            const interview = body.interview;
                            dispatch(
                                startUpdateSurveyValidateInterview('validationOnePager', {}, null, interview, callback)
                            );
                        }
                    });
                }
            })
            .catch((err) => {
                surveyHelper.devLog('Error fetching interview to reset.', err);
            });
    };
};

export const startSetInterview = (
    activeSection: string | null = null,
    surveyUuid: string | undefined = undefined,
    _history: History | undefined = undefined,
    preFilledResponses: { [key: string]: unknown } | undefined = undefined
) => {
    return (dispatch, _getState) => {
        const browserTechData = bowser.getParser(window.navigator.userAgent).parse();
        return fetch(`/api/survey/activeInterview/${surveyUuid ? `${encodeURI(surveyUuid)}` : ''}`, {
            credentials: 'include'
        })
            .then((response) => {
                if (response.status === 200) {
                    response.json().then((body) => {
                        if (body.interview) {
                            const interview = body.interview;
                            if (!activeSection) {
                                for (const sectionShortname in applicationConfiguration.sections) {
                                    if (config.isPartTwo === true) {
                                        if (
                                            applicationConfiguration.sections[sectionShortname]
                                                .isPartTwoFirstSection === true
                                        ) {
                                            activeSection = sectionShortname;
                                            break;
                                        }
                                    } else {
                                        if (
                                            applicationConfiguration.sections[sectionShortname].previousSection === null
                                        ) {
                                            activeSection = sectionShortname;
                                            break;
                                        }
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
                            const existingBrowserUa = _get(interview, 'responses._browser._ua', null);
                            const newBrowserUa = browserTechData.getUA();
                            if (existingBrowserUa !== newBrowserUa) {
                                valuesByPath['responses._browser'] = browserTechData;
                            }
                            dispatch(startUpdateInterview(activeSection, valuesByPath, undefined, interview));
                        } else {
                            dispatch(
                                startCreateInterview(preFilledResponses as { [key: string]: unknown } | undefined)
                            );
                        }
                    });
                } else {
                    console.log(`Get active interview: wrong responses status: ${response.status}`);
                    handleHttpOtherResponseCode(response.status, dispatch);
                }
            })
            .catch((err) => {
                surveyHelper.devLog('Error fetching interview.', err);
            });
    };
};

export const startCreateInterview = (preFilledResponses: { [key: string]: unknown } | undefined = undefined) => {
    const browserTechData = bowser.getParser(window.navigator.userAgent).parse();
    return (dispatch, _getState) => {
        return fetch('/api/survey/createInterview', {
            credentials: 'include'
        })
            .then((response) => {
                if (response.status === 200) {
                    response.json().then((body) => {
                        if (body.interview) {
                            let activeSection: string | null = null;
                            if (applicationConfiguration.sections['registrationCompleted']) {
                                activeSection = 'registrationCompleted';
                            } else {
                                for (const sectionShortname in applicationConfiguration.sections) {
                                    if (applicationConfiguration.sections[sectionShortname].previousSection === null) {
                                        activeSection = sectionShortname;
                                        break;
                                    }
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
                            dispatch(startUpdateInterview(activeSection, responses, undefined, body.interview));
                        } else {
                            // we need to do something if no interview is returned (error)
                        }
                    });
                } else {
                    console.log(`Creating interview: wrong responses status: ${response.status}`);
                    handleHttpOtherResponseCode(response.status, dispatch);
                }
            })
            .catch((err) => {
                surveyHelper.devLog('Error creating interview.', err);
            });
    };
};

/**
 * Fetch an interview from server and set it for display in a one page summary.
 *
 * TODO Only the section ('home', 'validationOnePager') is different from 'startSetSurveyValidateInterview' Re-use
 *
 * @param {*} interviewUuid The uuid of the interview to open
 * @param {*} callback
 * @returns
 */
export const startSetValidateInterview = (
    interviewUuid,
    callback = function () {
        return;
    }
) => {
    return (dispatch, _getState) => {
        return fetch(`/api/survey/validateInterview/${interviewUuid}`, {
            credentials: 'include'
        })
            .then((response) => {
                if (response.status === 200) {
                    response.json().then((body) => {
                        if (body.interview) {
                            const interview = body.interview;
                            dispatch(
                                startUpdateSurveyValidateInterview('validationOnePager', {}, null, interview, callback)
                            );
                        }
                    });
                }
            })
            .catch((err) => {
                surveyHelper.devLog('Error fetching interview to validate.', err);
            });
    };
};
