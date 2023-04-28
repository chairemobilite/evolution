import _set from 'lodash.set';
import _cloneDeep from 'lodash.clonedeep';
import isEqual from 'lodash.isequal';
import _unset from 'lodash.unset';
import { History } from 'history';

const fetchRetry = require('@zeit/fetch-retry')(require('node-fetch'));
// TODO Default options for retry are as high as 15 seconds, during which the
// user get no feedback. Since update requests are queued in that time, are
// sequential and it is not possible to empty the queue, the requests will try
// to execute for n*15 seconds, during which time the user may have refreshed
// the page and will not see that the updated values have been udpated. With 4
// retries, the user will get feedback within 3 seconds and the queue will empty
// much faster, reducing the risk of invisible updates. The risk is still
// present if the server is quickly back online and the user is fast enough. See
// https://github.com/chairemobilite/transition/issues/1266
const fetch = async (url, opts) => {
    return await fetchRetry(url, Object.assign({ retry: { retries: 4 }, ...opts }));
};

import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import * as surveyHelper from 'evolution-common/lib/utils/helpers';
import { prepareWidgets } from './utils';
import { UserFrontendInterviewAttributes } from '../services/interviews/interview';
import { incrementLoadingState, decrementLoadingState } from './LoadingState';
import { CliUser } from 'chaire-lib-common/lib/services/user/userType';

// called whenever an update occurs in interview responses or when section is switched to
export const updateSection = <CustomSurvey, CustomHousehold, CustomHome, CustomPerson>(
    sectionShortname: string,
    _interview: UserFrontendInterviewAttributes<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>,
    affectedPaths: { [path: string]: boolean },
    valuesByPath: { [path: string]: unknown },
    updateKey = false,
    user?: CliUser
): [
    UserFrontendInterviewAttributes<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>,
    { [path: string]: unknown }
] => {
    let interview = _cloneDeep(_interview);
    let needToUpdate = true; // will stay true if an assigned value changed the initial value after a conditional failed
    let updateCount = 0;
    let foundOneOpenedModal = false;

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

const startUpdateInterviewCallback = async <CustomSurvey, CustomHousehold, CustomHome, CustomPerson>(
    next,
    dispatch,
    getState,
    requestedSectionShortname: string | null,
    valuesByPath: { [path: string]: unknown } = {},
    unsetPaths?: string[],
    initialInterview?: UserFrontendInterviewAttributes<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>,
    callback?: (
        interview: UserFrontendInterviewAttributes<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>
    ) => void,
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
        const actualLanguage = null; //i18n.language;
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

        const [updatedInterview, updatedValuesByPath] = updateSection<
            CustomSurvey,
            CustomHousehold,
            CustomHome,
            CustomPerson
        >(sectionShortname, interview, affectedPaths, valuesByPath, false, user);

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
                    // Need to update the widget status with server data, there should be no side-effect, so no loop update here
                    serverUpdatedInterview = updateSection(
                        sectionShortname,
                        updatedInterview,
                        serverAffectedPath,
                        body.updatedValuesByPath,
                        true,
                        user
                    )[0];
                }

                dispatch(
                    updateInterview(
                        _cloneDeep(serverUpdatedInterview),
                        Object.assign(currentServerErrors, newServerErrors)
                    )
                );
                if (typeof callback === 'function') {
                    callback(updatedInterview);
                }
            } else {
                // we need to do something if no interview is returned (error)
            }
        } else {
            console.log(`Update interview: wrong responses status: ${response.status}`);
            if (history && response.status === 401) {
                history.push('/unauthorized');
            }
        }
        // Loading state needs to be decremented, no matter the return value, otherwise the page won't get updated
        dispatch(decrementLoadingState());
    } catch (error) {
        console.log('Error updating interview', error);
        // Loading state needs to be decremented, no matter the return value, otherwise the page won't get updated
        // TODO Put in the finally block if we are sure there are no side effect in the code path that returns before the fetch
        dispatch(decrementLoadingState());
        if (history) {
            history.push('/maintenance');
        }
    } finally {
        next();
    }
};

export const updateInterview = <CustomSurvey, CustomHousehold, CustomHome, CustomPerson>(
    interview: UserFrontendInterviewAttributes<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>,
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

export const startUpdateInterview = <CustomSurvey, CustomHousehold, CustomHome, CustomPerson>(
    sectionShortname: string | null,
    valuesByPath?: { [path: string]: unknown },
    unsetPaths?: string[],
    interview?: UserFrontendInterviewAttributes<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>,
    callback?: () => void,
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
