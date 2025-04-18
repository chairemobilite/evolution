/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import _set from 'lodash/set';
import _cloneDeep from 'lodash/cloneDeep';
import isEqual from 'lodash/isEqual';
import _unset from 'lodash/unset';

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
import {
    StartAddGroupedObjects,
    StartRemoveGroupedObjects,
    StartUpdateInterview,
    UserRuntimeInterviewAttributes
} from 'evolution-common/lib/services/questionnaire/types';
import { incrementLoadingState, decrementLoadingState } from './LoadingState';
import { handleHttpOtherResponseCode } from '../services/errorManagement/errorHandling';
import { updateSection, updateInterview } from './Survey';
import { ThunkDispatch } from 'redux-thunk';
import { RootState } from '../store/configureStore';
import { SurveyAction } from '../store/survey';
import { LoadingStateAction } from '../store/loadingState';
import { AuthAction } from 'chaire-lib-frontend/lib/store/auth';

export const startUpdateSurveyValidateInterview = (
    sectionShortname: Parameters<StartUpdateInterview>[0],
    valuesByPath?: Parameters<StartUpdateInterview>[1],
    unsetPaths?: Parameters<StartUpdateInterview>[2],
    interview?: Parameters<StartUpdateInterview>[3],
    callback?: Parameters<StartUpdateInterview>[4]
) => {
    return async (
        dispatch: ThunkDispatch<RootState, unknown, SurveyAction | AuthAction | LoadingStateAction>,
        getState: () => RootState
    ) => {
        //surveyHelper.devLog(`Update interview and section with values by path`, valuesByPath);
        try {
            interview = interview
                ? interview
                : (_cloneDeep(getState().survey.interview) as UserRuntimeInterviewAttributes);

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
                          interview as UserRuntimeInterviewAttributes,
                          '_activeSection',
                          sectionShortname
                    ) as string);
            //if (sectionShortname !== previousSection) // need to update all widgets if new section
            //{
            //  affectedPaths['_all'] = true;
            //}
            const updatedInterviewAndValuesByPath = updateSection(
                sectionShortname,
                interview as UserRuntimeInterviewAttributes,
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
// TODO: unit test
export const startSetSurveyValidateInterview = (
    interviewUuid: string,
    callback: (interview: UserRuntimeInterviewAttributes) => void = function () {
        return;
    }
) => {
    return async (
        dispatch: ThunkDispatch<RootState, unknown, SurveyAction | AuthAction | LoadingStateAction>,
        _getState: () => RootState
    ) => {
        return fetch(`/api/survey/validateInterview/${interviewUuid}`, {
            credentials: 'include'
        })
            .then((response) => {
                if (response.status === 200) {
                    response.json().then((body) => {
                        if (body.interview) {
                            const interview = body.interview;
                            dispatch(startUpdateSurveyValidateInterview(null, {}, undefined, interview, callback));
                        }
                    });
                }
            })
            .catch((err) => {
                surveyHelper.devLog('Error fetching interview to validate.', err);
            });
    };
};

// TODO: unit test
export const startSurveyValidateAddGroupedObjects = (
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
            dispatch(startUpdateSurveyValidateInterview(null, changedValuesByPath, undefined, undefined, callback));
        }
    };
};

// TODO: unit test
export const startSurveyValidateRemoveGroupedObjects = (
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
            dispatch(startUpdateSurveyValidateInterview(null, valuesByPath, unsetPaths, undefined, callback));
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
// TODO: unit test
export const startResetValidateInterview = (
    interviewUuid: string,
    callback: (interview: UserRuntimeInterviewAttributes) => void = function () {
        return;
    }
) => {
    return (
        dispatch: ThunkDispatch<RootState, unknown, SurveyAction | AuthAction | LoadingStateAction>,
        _getState: () => RootState
    ) => {
        return fetch(`/api/survey/validateInterview/${interviewUuid}?reset=true`, {
            credentials: 'include'
        })
            .then((response) => {
                if (response.status === 200) {
                    response.json().then((body) => {
                        if (body.interview) {
                            const interview = body.interview;
                            dispatch(startUpdateSurveyValidateInterview(null, {}, undefined, interview, callback));
                        }
                    });
                }
            })
            .catch((err) => {
                surveyHelper.devLog('Error fetching interview to reset.', err);
            });
    };
};
