/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import * as React from 'react';

// TODO Can this be InterviewResponses from 'evolution-common/lib/services/interviews/interview'? To be confirmed
export type InterviewResponses = { [key: string]: any };

export type InterviewState =
    | { status: 'list'; responses: InterviewResponses }
    | { status: 'creating'; responses: InterviewResponses; username: string }
    | { status: 'error'; responses: InterviewResponses }
    | { status: 'success'; responses: InterviewResponses; interviewUuid: string }
    | { status: 'entering'; responses: InterviewResponses };

type InterviewAction =
    | { type: 'createNew'; username: string }
    | { type: 'list' }
    | { type: 'update_responses'; responses: InterviewResponses }
    | { type: 'success'; interviewUuid: string }
    | { type: 'enter'; queryData: URLSearchParams };

export function interviewReducer(state: InterviewState, action: InterviewAction): InterviewState {
    switch (action.type) {
    case 'createNew':
        return { status: 'creating', responses: state.responses, username: action.username };
    case 'list':
        return { ...state, status: 'list' };
    case 'success':
        return { status: 'success', responses: state.responses, interviewUuid: action.interviewUuid };
    case 'update_responses':
        return { ...state, status: 'list', responses: action.responses };
    case 'enter': {
        // TODO: The source param is hard-coded. If we need more than that, we should add a project config to white list fields
        const source = action.queryData.get('source');
        const alphaNumRegex = /^[a-z0-9-_]+/i;
        const responses: { [key: string]: string } = {};
        if (source) {
            const alphaNumSource = source.match(alphaNumRegex);
            if (alphaNumSource && state.responses.source !== alphaNumSource[0])
                responses.source = alphaNumSource[0];
        }
        return {
            status: 'entering',
            responses:
                    Object.keys(responses).length !== 0
                        ? Object.assign({}, state.responses, responses)
                        : state.responses
        };
    }
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
