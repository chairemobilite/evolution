/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { UserAction } from 'evolution-common/lib/services/questionnaire/types';

// Client event route, defaults to the participant app's public route
let clientEventRoute = '/public/logClientEvent';

/**
 * Set the client event route globally for the app. Admin and participant apps
 * will have different routes as one does not require login and the other yes.
 *
 * @param route The backend route to call for client event logging
 * @returns void
 */
export const setLogClientEventRoute = (route: string) => (clientEventRoute = route);

/**
 * Send a paradata event to the server. These events are UI side events that do
 * not necessarily at the moment trigger any other server request or action, but
 * that should be logged as paradata. For example, clicking on help messages, or
 * on a button that shows a popup that may be canceled.
 *
 * @param clientEvent The user action that should be logged @returns Returns the
 * fetch request to the server, but it does not wait for it to complete.
 * @param option Options to pass to paradata function
 * @param option.interviewId The current interview ID. Participant app is not
 * expected to pass anything, it will be retrieved server-side.
 */
export const logClientEvent = async (
    clientEvent: UserAction,
    { interviewId = undefined }: { interviewId?: number } = {}
) => {
    // We send the client event message in the wild, not waiting for the answer
    // as the network might be down or it may take a while and we don't want
    // this request to impact the user experience.
    return fetch(clientEventRoute, {
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        method: 'POST',
        body: JSON.stringify({
            clientEvent,
            interviewId
        })
    });
};
