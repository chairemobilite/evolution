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

// TODO Can this be InterviewResponse from 'evolution-common/lib/services/interviews/interview'? To be confirmed
export type InterviewResponse = { [key: string]: any };

export type InterviewState =
    | { status: 'list'; response: InterviewResponse }
    | { status: 'creating'; response: InterviewResponse; username: string }
    | { status: 'error'; response: InterviewResponse }
    | { status: 'success'; response: InterviewResponse; interviewUuid: string }
    | { status: 'entering'; response: InterviewResponse };

type InterviewAction =
    | { type: 'createNew'; username: string; queryData: URLSearchParams }
    | { type: 'list' }
    | { type: 'update_response'; response: InterviewResponse }
    | { type: 'success'; interviewUuid: string }
    | { type: 'enter'; queryData: URLSearchParams };

const queryDataToResponse = (queryData: URLSearchParams, stateResponse: InterviewResponse) => {
    const alphaNumRegex = /^[a-z0-9-_]+/i;
    const response: { [key: string]: string } = {};
    appConfig.allowedUrlFields.forEach((field) => {
        const value = queryData.get(field) as string;
        if (!_isBlank(value)) {
            const alphaNumSource = value.match(alphaNumRegex);
            if (alphaNumSource && _get(stateResponse, field) !== alphaNumSource[0]) response[field] = alphaNumSource[0];
        }
    });
    return Object.keys(response).length !== 0 ? Object.assign({}, stateResponse, response) : stateResponse;
};

export function interviewReducer(state: InterviewState, action: InterviewAction): InterviewState {
    switch (action.type) {
    case 'createNew':
        return {
            status: 'creating',
            response: queryDataToResponse(action.queryData, state.response),
            username: action.username
        };
    case 'list':
        return { ...state, status: 'list' };
    case 'success':
        return { status: 'success', response: state.response, interviewUuid: action.interviewUuid };
    case 'update_response':
        return { ...state, status: 'list', response: action.response };
    case 'enter':
        return {
            status: 'entering',
            response: queryDataToResponse(action.queryData, state.response)
        };
    }
}

export const initialState = { status: 'list' as const, response: {} };

export const InterviewContext = React.createContext<{
    state: InterviewState;
    dispatch: React.Dispatch<InterviewAction>;
}>({
    state: initialState,
    dispatch: () => {
        /* To be replaced with actual dispatch */
    }
});
