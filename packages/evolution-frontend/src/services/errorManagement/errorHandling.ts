/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { History } from 'history';
import { Dispatch } from 'redux';
import verifyAuthentication from 'chaire-lib-frontend/lib/services/auth/verifyAuthentication';

const unauthorizedPage = '/unauthorized';
const errorPage = '/error';

const redirectToErrorPage = (history?: History) => {
    if (history) {
        // History avoids reload the page to get to the error page, it keeps the
        // current state of the interview.
        history.push(errorPage);
    } else {
        // if history is not available, we still need to redirect to error page
        window.location.href = errorPage;
    }
};

/**
 * Centralized function to handle any caught client exceptions. This function
 * will redirect to the generic error page. Since this is for caught exceptions,
 * callers should take any appropriate action concerning the exception (like
 * logging) before calling this function.
 * @param error The client error object
 * @param {Object} options The options object
 * @param {number|undefined} options.interviewId The numeric ID of the current
 * interview, if available
 * @param {History|undefined} options.history The browser history object, if
 * available
 */
export const handleClientError = (
    error: unknown,
    { interviewId, history }: { interviewId?: number; history?: History }
) => {
    reportClientSideException(error, interviewId);
    redirectToErrorPage(history);
};

/**
 * Properly handles the response code received from the server. If the response
 * is 'unauthorized', the user should be logged out and redirected to the
 * unauthorized page. Other response codes will redirect to the generic error
 * page.
 * @param responseCode The response code received from the server
 * @param dispatch The dispatch redux object
 * @param history The browser history object, if available
 */
export const handleHttpOtherResponseCode = async (responseCode: number, dispatch: Dispatch, history?: History) => {
    if (responseCode === 401) {
        // Verify authentication, so that we get the new authentication status
        // from the server. At this point, it is not possible to know if the 401
        // is for a specific query, or if the user's session has ended.
        await verifyAuthentication(dispatch);
        if (history) {
            history.push(unauthorizedPage);
        }
        // If history is not available, the user has still been logged out of
        // the application, the proper flow of the application will redirect him
        // to the right page (login or unauthorized). We don't need to set href
        // to 'unauthorized' here.
    } else {
        // TODO Should there be other use cases that lead to other pages?
        redirectToErrorPage(history);
    }
};

/**
 * Send report of a client side exception to the server
 *
 * @param interviewId The numeric ID of the current interview
 * @param exception The exception that was thrown
 * @returns
 */
export const reportClientSideException = async (exception: unknown, interviewId?: number) => {
    const exceptionMessage =
        exception instanceof Error
            ? exception.message
            : typeof exception === 'object'
                ? JSON.stringify(exception)
                : String(exception);
    // We send the error message in the wild, not waiting for the answer as the
    // network might be down, in which point the server will not know about this
    // error anyway
    return fetch('/api/survey/clientSideException', {
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        method: 'POST',
        body: JSON.stringify({
            exception: exceptionMessage,
            interviewId
        })
    });
};
