/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _get from 'lodash/get';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import * as React from 'react';
import appConfig from '../config/application.config';
import { URLSearchParams } from 'url';

// TODO Can this be InterviewResponses from 'evolution-common/lib/services/interviews/interview'? To be confirmed
export type InterviewResponses = { [key: string]: any };

export type InterviewState =
    | { status: 'list'; responses: InterviewResponses }
    | { status: 'creating'; responses: InterviewResponses; username: string }
    | { status: 'error'; responses: InterviewResponses }
    | { status: 'success'; responses: InterviewResponses; interviewUuid: string }
    | { status: 'entering'; responses: InterviewResponses };

type InterviewAction =
    | { type: 'createNew'; username: string; queryData: URLSearchParams }
    | { type: 'list' }
    | { type: 'update_responses'; responses: InterviewResponses }
    | { type: 'success'; interviewUuid: string }
    | { type: 'enter'; queryData: URLSearchParams };

const queryDataToResponses = (queryData: URLSearchParams, stateResponses: InterviewResponses) => {
    const alphaNumRegex = /^[a-z0-9-_]+/i;
    const responses: { [key: string]: string } = {};
    appConfig.allowedUrlFields.forEach((field) => {
        const value = queryData.get(field) as string;
        if (!_isBlank(value)) {
            const alphaNumSource = value.match(alphaNumRegex);
            if (alphaNumSource && _get(stateResponses, field) !== alphaNumSource[0])
                responses[field] = alphaNumSource[0];
        }
    });
    return Object.keys(responses).length !== 0 ? Object.assign({}, stateResponses, responses) : stateResponses;
};

export function interviewReducer(state: InterviewState, action: InterviewAction): InterviewState {
    switch (action.type) {
    case 'createNew':
        return {
            status: 'creating',
            responses: queryDataToResponses(action.queryData, state.responses),
            username: action.username
        };
    case 'list':
        return { ...state, status: 'list' };
    case 'success':
        return { status: 'success', responses: state.responses, interviewUuid: action.interviewUuid };
    case 'update_responses':
        return { ...state, status: 'list', responses: action.responses };
    case 'enter':
        return {
            status: 'entering',
            responses: queryDataToResponses(action.queryData, state.responses)
        };
    }
}

export const initialState = { status: 'list' as const, responses: {} };

export const InterviewContext = React.createContext<{
    state: InterviewState;
    dispatch: React.Dispatch<InterviewAction>;
}>({
    state: initialState,
    dispatch: () => {
        /* To be replaced with actual dispatch */
    }
});
