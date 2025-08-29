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
import { ThunkDispatch } from 'redux-thunk';
import PQueue from 'p-queue';

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
import { handleClientError, handleHttpOtherResponseCode } from '../services/errorManagement/errorHandling';
import {
    GotoFunction,
    NavigationSection,
    StartAddGroupedObjects,
    StartNavigate,
    StartRemoveGroupedObjects,
    StartUpdateInterview,
    SurveySections,
    UserAction,
    UserRuntimeInterviewAttributes
} from 'evolution-common/lib/services/questionnaire/types';
import { SurveyAction, SurveyActionTypes } from '../store/survey';
import { AuthAction } from 'chaire-lib-frontend/lib/store/auth';
import { LoadingStateAction } from '../store/loadingState';
import { RootState } from '../store/configureStore';
import { createNavigationService } from 'evolution-common/lib/services/questionnaire/sections/NavigationService';

/**
 * Class used to manage a queue of asynchronous update functions, to ensure they
 * are run sequentially.
 *
 * FIXME We used to use the `redux-async-queue` package, but it is old and not
 * compatible with the current redux version. According to the documentation
 * when doing the update, it should not be required to use a queue anymore. The
 * `Thunk` should handle. Either, we are not using redux properly in this case,
 * or the Thunk is not correctly configured, but we need it to avoid concurrent
 * updates where one is lost. But we should not use this approach, or at least
 * investigate other ways. See if we can prevent it by using the
 * `@reduxjs/toolkit` package (see issue
 * https://github.com/chairemobilite/transition/issues/1154 in chaire-lib)
 */
class AsyncDispatchQueue {
    // Create a queue with concurrency of 1 to ensure sequential processing
    private interviewUpdateQueue = new PQueue({ concurrency: 1 });

    // Utility function to add a task to the queue and return a promise
    public enqueueTask = <T>(task: () => Promise<T>): Promise<T> => {
        return this.interviewUpdateQueue.add(task);
    };

    // For debugging purposes
    public getQueueSize = (): number => {
        return this.interviewUpdateQueue.size;
    };

    public getPendingCount = (): number => {
        return this.interviewUpdateQueue.pending;
    };
}
// Exported for the SurveyAdmin action and in case we need to monitor the queue
export const asyncDispatchQueue = new AsyncDispatchQueue();

/**
 * Called whenever an update occurs in interview response or when section is
 * switched to. It will run the validations and side effects for the requested
 * section and prepare the widgets for the next display cycle of the section. It
 * returns the interview, with the widget statuses set for the next cycle, as
 * well as the side effects that should be applied to the interview.
 *
 * This function should only be called by redux actions, in this file and the
 * admin one.
 *
 * TODO: unit test
 *
 * @param {string} sectionShortname The section shortname to prepare
 * @param {UserRuntimeInterviewAttributes} _interview The interview to prepare.
 * It will not be modified
 * @param {{ [path: string]: boolean }} affectedPaths The paths that were
 * affected by the update (usually the keys of the `valuesByPath` object)
 * @param {{ [path: string]: unknown }} valuesByPath The values by path that
 * were affected by the update
 * @param {boolean} [updateKey] If `true`, the section key will be updated to
 * the current section shortname, forcing a re-render of the widgets. Defaults
 * to `false`
 * @param {CliUser} [user] The user, if available, to use for the side effects
 * @returns A tuple with the updated interview and the values by path that
 * should be applied to the interview
 */
export const validateAndPrepareSection = (
    sectionShortname: string,
    _interview: UserRuntimeInterviewAttributes,
    affectedPaths: { [path: string]: boolean },
    valuesByPath: { [path: string]: unknown },
    updateKey: boolean = false,
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

// Get the widget paths that are not visible in the interview.
const getHiddenWidgets = (interview: UserRuntimeInterviewAttributes): string[] | undefined => {
    const hiddenWidgets: string[] = [];
    // For each widget status, if the widget is not visible add to an array of hidden widgets
    const widgets = interview.widgets || {};
    for (const widget of Object.values(widgets)) {
        if (!widget.isVisible) {
            hiddenWidgets.push(widget.path);
        }
    }
    const groups = interview.groups || {};
    for (const groupName in groups) {
        const group = groups[groupName];
        for (const objectId in group) {
            const objectWidgets = group[objectId];
            for (const widget of Object.values(objectWidgets)) {
                if (!widget.isVisible) {
                    hiddenWidgets.push(widget.path);
                }
            }
        }
    }
    return hiddenWidgets.length === 0 ? undefined : hiddenWidgets;
};

const enhanceUserActionOnUpdate = (interview: UserRuntimeInterviewAttributes, userAction: UserAction | undefined) => {
    if (userAction && userAction.type === 'buttonClick') {
        // Save the hidden widgets when a button is clicked, not on section
        // change as this function is run with the next section, but the hidden
        // widgets should be for the previous one. The navigate action will set
        // the hidden widgets for the previous section.
        userAction.hiddenWidgets = getHiddenWidgets(interview);
    }
};

/**
 * Update the interview fields with the modified values.
 *
 * DO NOT CALL from any other part of the code! Only the redux action should
 * call this function.
 *
 * @param interview The interview to update. Its values will be modified
 * @param updatedData The values by path, path to unset and userAction to apply
 * @returns A key/value object where the keys are all paths affected by the
 * update and true as value, for easier lookup
 */
export const updateInterviewData = (
    interview: UserRuntimeInterviewAttributes,
    updatedData: Pick<Parameters<StartUpdateInterview>[0], 'valuesByPath' | 'unsetPaths' | 'userAction'>
): { [key: string]: boolean } => {
    const affectedPaths = {};
    if (Array.isArray(updatedData.unsetPaths)) {
        // unsetPaths if array (each path in array has to be deleted)
        for (let i = 0, count = updatedData.unsetPaths.length; i < count; i++) {
            const path = updatedData.unsetPaths[i];
            affectedPaths[path] = true;
            _unset(interview, path);
        }
    }

    if (updatedData.valuesByPath) {
        if (updatedData.valuesByPath['_all'] === true) {
            affectedPaths['_all'] = true;
        }
        for (const path in updatedData.valuesByPath) {
            if (path !== '_all') {
                affectedPaths[path] = true;
                _set(interview, path, updatedData.valuesByPath[path]);
            }
        }
    }

    if (updatedData.userAction && updatedData.userAction.type === 'widgetInteraction') {
        const path = updatedData.userAction.path;
        if (path) {
            affectedPaths[path] = true;
            _set(interview, path, updatedData.userAction.value);
        }
    }

    return affectedPaths;
};

const updateInterviewCallback = async (
    dispatch: ThunkDispatch<RootState, unknown, SurveyAction | AuthAction | LoadingStateAction>,
    getState: () => RootState,
    {
        sectionShortname: requestedSectionShortname,
        valuesByPath = {},
        unsetPaths = [],
        interview: initialInterview,
        gotoFunction,
        userAction
    }: Parameters<StartUpdateInterview>[0] = {},
    callback?: Parameters<StartUpdateInterview>[1]
) => {
    try {
        const { auth, survey } = getState();
        const user = auth?.user || undefined;
        const navigation = survey?.navigation;

        const interview = initialInterview
            ? initialInterview
            : (_cloneDeep(survey?.interview) as UserRuntimeInterviewAttributes);

        dispatch(incrementLoadingState());
        if (valuesByPath && Object.keys(valuesByPath).length > 0) {
            surveyHelper.devLog(
                'Update interview and section with values by path',
                JSON.parse(JSON.stringify(valuesByPath))
            );
        }

        const affectedPaths = updateInterviewData(interview, { valuesByPath, unsetPaths, userAction });

        // TODO An Interview object could have a getActiveSection function to get this value
        const sectionShortname = requestedSectionShortname
            ? requestedSectionShortname
            : navigation?.currentSection?.sectionShortname || '';
        surveyHelper.devLog('Update section', sectionShortname);

        const [updatedInterview, updatedValuesByPath] = validateAndPrepareSection(
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
            dispatch(updateInterviewState(_cloneDeep(updatedInterview), {}, true));
            if (typeof callback === 'function') {
                callback(updatedInterview);
            }
            return null;
        }

        // The interview has been validated and prepared, see if we need to add anything to the user action
        enhanceUserActionOnUpdate(updatedInterview, userAction);

        // Send update response to the server
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
                unsetPaths: unsetPaths,
                userAction
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
                    if (updatedValuesByPath[`response.${path}`] || unsetPaths[`response.${path}`]) {
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

                    // FIXME Here, it used to re-read the _activeSection from
                    // interview it case it was modified by the server, but
                    // since we don't support _activeSection anymore, we need a
                    // way to let the server change the active section in case
                    // of dire necessity, but all logic should rather aim to be
                    // described in the section configuration. But we may want a
                    // way to let the server allow to trigger a navigation
                    // again, or maybe the entire navigation will be done
                    // server-side eventually.

                    // Need to update the widget status with server data, there should be no side-effect, so no loop update here
                    serverUpdatedInterview = validateAndPrepareSection(
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
                    updateInterviewState(
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
            console.log(`Update interview: wrong response status: ${response.status}`);
            await handleHttpOtherResponseCode(response.status, dispatch, gotoFunction);
        }
    } catch (error) {
        console.log('Error updating interview', error);

        handleClientError(error instanceof Error ? error : new Error(String(error)), {
            navigate: gotoFunction,
            interviewId: getState().survey.interview!.id
        });
    } finally {
        // Loading state needs to be decremented, so the page can be updated
        dispatch(decrementLoadingState());
    }
};

/**
 * Redux action to call with a dispatch to update the interview in the store.
 *
 * DO NOT CALL from any other part of the code! Only the redux action should
 * call this function.
 *
 * @param interview The interview to update
 * @param errors The current errors in the interview
 * @param submitted FIXME Need to document this. Is it when the form was
 * officially submitted with a next button?
 * @returns
 */
export const updateInterviewState = (
    interview: UserRuntimeInterviewAttributes,
    errors: {
        [path: string]: {
            [lang: string]: string;
        };
    } = {},
    submitted = false
): SurveyAction => ({
    type: SurveyActionTypes.UPDATE_INTERVIEW,
    interviewLoaded: true,
    interview,
    errors,
    submitted
});

/**
 * Redux action to call with a dispatch to set the interview in the store.
 *
 * DO NOT CALL from any other part of the code! Only the redux action should
 * call this function.
 *
 * @param interview The interview to update
 * @returns
 */
export const setInterviewState = (interview: UserRuntimeInterviewAttributes): SurveyAction => ({
    type: SurveyActionTypes.SET_INTERVIEW,
    interview,
    interviewLoaded: true
});

/**
 * Redux action to call with a dispatch to send interview updates to the server.
 * This function is not to be called directly by the application, except through
 * redux's dispatch.
 *
 * It will schedule the call to the interview update callback who runs
 * validations and side effects, updates the interview data on the server and
 * refresh any fields and validations coming from the server. It will update the
 * app's loading state before and after the update call. At the end of the call,
 * the callback function will be called if provided, with the updated interview.
 * @returns The dispatched action
 */
export const startUpdateInterview =
    (data?: Parameters<StartUpdateInterview>[0], callback?: Parameters<StartUpdateInterview>[1]) =>
        async (
            dispatch: ThunkDispatch<RootState, unknown, SurveyAction | AuthAction | LoadingStateAction>,
            getState: () => RootState
        ) => {
        // Queue the update operation to ensure sequential processing
            return await asyncDispatchQueue.enqueueTask(async () => {
            // If there's a _activeSection explicitly set in valuesByPath, this is a legacy navigation request
            // Convert it to use the navigation service instead
                if (data?.valuesByPath && data.valuesByPath['response._activeSection']) {
                    console.error(
                        'Warning (startUpdateInterview): _activeSection is deprecated and will no longer be supported in the next release. Define proper navigation in section configuration instead, or use the `startNavigate` callback.'
                    );

                    const targetSection = data.valuesByPath['response._activeSection'] as string;
                    // Remove the _activeSection from valuesByPath
                    const newValuesByPath = { ...data.valuesByPath };
                    delete newValuesByPath['response._activeSection'];

                    // If there are no other values to update, just navigate
                    if (Object.keys(newValuesByPath).length === 0) {
                        return dispatch(startNavigate({ requestedSection: { sectionShortname: targetSection } }));
                    }

                    // Otherwise, update the interview then navigate in the callback
                    const updatedData = { ...data, valuesByPath: newValuesByPath };
                    return await updateInterviewCallback(dispatch, getState, updatedData, (updatedInterview) => {
                        dispatch(startNavigate({ requestedSection: { sectionShortname: targetSection } }));
                        if (callback) callback(updatedInterview);
                    });
                }

                // Standard interview update without navigation
                return await updateInterviewCallback(dispatch, getState, data, callback);
            });
        };

const navigate = (targetSection: NavigationSection): SurveyAction => ({
    type: SurveyActionTypes.NAVIGATE,
    targetSection
});

/**
 * Redux action to call with a dispatch to navigate forward in the current
 * interview
 *
 * DO NOT CALL from any other part of the code! Only the redux action should
 * call this function with proper callback for participant or review interviews.
 *
 * @param {function} [fctUpdateInterview] The update function to call after
 * navigation. For example, a different function can be used for participant or
 * correction survey updates.
 * @returns The dispatched action
 */
export const startNavigateWithUpdateCallback =
    (
        fctUpdateInterview: typeof startUpdateInterview,
        { requestedSection, valuesByPath = {}, gotoFunction }: Parameters<StartNavigate>[0] = {},
        callback?: Parameters<StartNavigate>[1]
    ) =>
        async (
            dispatch: ThunkDispatch<RootState, unknown, SurveyAction | AuthAction | LoadingStateAction>,
            getState: () => RootState
        ) => {
            try {
                dispatch(incrementLoadingState());

                const { survey: surveyState, auth: authState } = getState();
                const { navigation, navigationService, interview } = surveyState;

                // Validate that navigation service and interview are initialized
                if (interview === undefined || navigationService === undefined) {
                    return;
                }

                // Validate current section (prepare widgets for current section and see if they are all valid)
                const validateCurrentSection = (): [
                boolean,
                UserRuntimeInterviewAttributes,
                { [path: string]: unknown }
            ] => {
                    if (requestedSection || navigation === undefined) {
                        return [true, interview, {}];
                    }
                    const [updatedInterview, updatedValuesByPath] = validateAndPrepareSection(
                        navigation?.currentSection?.sectionShortname || '',
                        interview,
                        { _all: true },
                        { _all: true },
                        false,
                        authState?.user || undefined
                    );
                    return [updatedInterview.allWidgetsValid, updatedInterview, updatedValuesByPath];
                };
                const [shouldNavigate, prevSectionInterview, validationValuesByPath] = validateCurrentSection();

                // If the current section is not valid, do not navigate and update interview
                if (!shouldNavigate) {
                    dispatch(updateInterviewState(prevSectionInterview, {}, true));
                    return;
                }

                const allValuesByPath = Object.assign({}, valuesByPath, validationValuesByPath || {});
                // Delete the _all value by path so that next section does not get validated now
                delete allValuesByPath['_all'];
                // If current section is valid, set interview data and call the navigation service
                updateInterviewData(interview, { valuesByPath: allValuesByPath });
                const getTargetSectionResult = () => {
                // If there is a requested section or there is no navigation yet, initialize navigation for interview
                    if (requestedSection || navigation === undefined) {
                        return navigationService.initNavigationState({
                            interview,
                            requestedSection: requestedSection?.sectionShortname,
                            currentSection: navigation?.currentSection
                        });
                    }
                    // Otherwise, navigate forward
                    return navigationService.navigate({ interview, currentSection: navigation.currentSection });
                };
                const targetSectionResult = getTargetSectionResult();

                // Prepare the values by path for next section
                if (targetSectionResult.valuesByPath) {
                // If the target section has values by path, prepare them
                    Object.assign(allValuesByPath, targetSectionResult.valuesByPath);
                }

                // Call the update interview to update to the new section
                await dispatch(
                    fctUpdateInterview({
                        sectionShortname: targetSectionResult.targetSection.sectionShortname,
                        valuesByPath: Object.keys(allValuesByPath).length === 0 ? undefined : allValuesByPath,
                        userAction: {
                            type: 'sectionChange',
                            targetSection: targetSectionResult.targetSection,
                            // Previous section is considered completed in
                            // direct navigation, ie without a requested
                            // section, otherwise it does not follow the survey
                            // flow
                            previousSection: requestedSection === undefined ? navigation?.currentSection : undefined,
                            hiddenWidgets: getHiddenWidgets(prevSectionInterview)
                        }
                    })
                );
                // Update the navigation state
                dispatch(navigate(targetSectionResult.targetSection));
                // Call the callback function
                if (typeof callback === 'function') {
                    callback(getState().survey!.interview!, targetSectionResult.targetSection);
                }
            } catch (error) {
                console.error('Error navigating to section', error);
                handleClientError(error instanceof Error ? error : new Error(String(error)), {
                    navigate: gotoFunction,
                    interviewId: getState().survey.interview?.id
                });
            } finally {
                dispatch(decrementLoadingState());
            }
        };

/**
 * Redux action to call with a dispatch to navigate forward in the current
 * interview for participant interviews. This action includes a call to the
 * interview update callback action, as navigation implies a call to the server
 * and may change data in the interview. Any additional change to the interview
 * can be passed through the `valuesByPath` parameter.
 *
 * @returns The dispatched action
 */
export const startNavigate = (options: Parameters<StartNavigate>[0] = {}, callback?: Parameters<StartNavigate>[1]) =>
    startNavigateWithUpdateCallback(startUpdateInterview, options, callback);

export const initNavigationService = (sections: SurveySections) => ({
    type: SurveyActionTypes.INIT_NAVIGATE as const,
    navigationService: createNavigationService(sections)
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
            dispatch(startUpdateInterview({ valuesByPath: changedValuesByPath }, callback));
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
    paths: Parameters<StartRemoveGroupedObjects>[0],
    callback?: Parameters<StartRemoveGroupedObjects>[1],
    returnOnly: Parameters<StartRemoveGroupedObjects>[2] = false
) {
    surveyHelper.devLog('Remove grouped objects at paths', paths);
    return (
        dispatch: ThunkDispatch<RootState, unknown, SurveyAction | AuthAction | LoadingStateAction>,
        getState: () => RootState
    ) => {
        const interview = _cloneDeep(getState().survey.interview) as UserRuntimeInterviewAttributes; // needed because we cannot mutate state
        const [valuesByPath, unsetPaths] = surveyHelper.removeGroupedObjects(interview, paths);
        if (returnOnly) {
            return [valuesByPath, unsetPaths];
        } else {
            dispatch(startUpdateInterview({ valuesByPath, unsetPaths }, callback));
        }
    };
};

export const startSetInterview = (
    requestedSection: string | undefined = undefined,
    surveyUuid: string | undefined = undefined,
    navigate: GotoFunction | undefined = undefined,
    preFilledResponse: { [key: string]: unknown } | undefined = undefined
) => {
    return async (
        dispatch: ThunkDispatch<RootState, unknown, SurveyAction | AuthAction | LoadingStateAction>,
        _getState: () => RootState
    ) => {
        try {
            const browserTechData = bowser.getParser(window.navigator.userAgent).parse();
            // get the interview from the server for the current user (or create one), or with a specific survey uuid
            const response = await fetch(
                `/api/survey/activeInterview${surveyUuid ? `/${encodeURI(surveyUuid)}` : ''}`,
                {
                    credentials: 'include'
                }
            );
            if (response.status === 200) {
                const body = await response.json();
                // Get the interview from the response
                if (body.interview) {
                    const interview = body.interview;

                    const valuesByPath = {};
                    if (preFilledResponse) {
                        Object.keys(preFilledResponse).forEach((key) => {
                            valuesByPath[`response.${key}`] = preFilledResponse[key];
                        });
                    }
                    // update browser data if different:
                    // TODO We need to track the different browser/user accesses
                    const existingBrowserUa = _get(interview, 'response._browser._ua', null);
                    const newBrowserUa = browserTechData.getUA();
                    if (existingBrowserUa !== newBrowserUa) {
                        valuesByPath['response._browser'] = browserTechData;
                    }
                    // Set the interview in the state first
                    dispatch(setInterviewState(interview));

                    // Then, initialize navigation for the current interview
                    await dispatch(
                        startNavigate({
                            requestedSection: requestedSection ? { sectionShortname: requestedSection } : undefined,
                            valuesByPath
                        })
                    );
                } else {
                    // No interview for this user, create one
                    console.error(
                        'Error: Get active interview: no interview was returned, it\'s not supposed to happen'
                    );
                }
            } else {
                // FIXME Maybe handle specific response codes, like 404
                console.log(`Get active interview: wrong response status: ${response.status}`);
                handleHttpOtherResponseCode(response.status, dispatch, navigate);
            }
        } catch (err) {
            surveyHelper.devLog('Error fetching interview.', err);
            handleClientError(err instanceof Error ? err : new Error(String(err)), {});
        }
    };
};
