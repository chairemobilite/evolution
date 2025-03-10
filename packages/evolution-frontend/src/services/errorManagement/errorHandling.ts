/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { ThunkDispatch } from 'redux-thunk';
import verifyAuthentication from 'chaire-lib-frontend/lib/services/auth/verifyAuthentication';
import { GotoFunction } from 'evolution-common/lib/services/questionnaire/types';
import { AuthAction, AuthState } from 'chaire-lib-frontend/lib/store/auth';

const unauthorizedPage = '/unauthorized';
const errorPage = '/error';

const redirectToErrorPage = (navigate?: GotoFunction) => {
    if (navigate) {
        // FIXME: Used history previous with following comment, make sure it is
        // still valid and update if necessary: History avoids reload the page
        // to get to the error page, it keeps the current state of the
        // interview.
        navigate(errorPage);
    } else {
        // if navigate is not available, we still need to redirect to error page
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
    { interviewId, navigate }: { interviewId?: number; navigate?: GotoFunction }
) => {
    logClientSideMessage(error, { interviewId });
    redirectToErrorPage(navigate);
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
export const handleHttpOtherResponseCode = async (
    responseCode: number,
    dispatch: ThunkDispatch<{ auth: AuthState }, unknown, AuthAction>,
    navigate?: GotoFunction
) => {
    if (responseCode === 401) {
        // Verify authentication, so that we get the new authentication status
        // from the server. At this point, it is not possible to know if the 401
        // is for a specific query, or if the user's session has ended.
        await verifyAuthentication(dispatch);
        if (navigate) {
            navigate(unauthorizedPage);
        }
        // If history is not available, the user has still been logged out of
        // the application, the proper flow of the application will redirect him
        // to the right page (login or unauthorized). We don't need to set href
        // to 'unauthorized' here.
    } else {
        // TODO Should there be other use cases that lead to other pages?
        redirectToErrorPage(navigate);
    }
};

/**
 * Send messages and exceptions to the server
 *
 * @param clientMessage The message to log or exception that was thrown
 * @param {Object} options The options object
 * @param {number|undefined} options.interviewId The numeric ID of the current
 * interview, if available
 * @param {'error'|'warn'|'info'|'log'} options.logLevel The log level of the message. default is 'error'
 * @returns
 */
export const logClientSideMessage = async (
    clientMessage: unknown,
    {
        interviewId = undefined,
        logLevel = 'error'
    }: { interviewId?: number; logLevel?: 'error' | 'warn' | 'info' | 'log' } = {}
) => {
    // TODO This started by logging only Error objects, but now it logs anything
    // and just converts to string. See if we can do better, more formal logging
    // and send something other than a simple string to the server to let it
    // handle the logging format.
    const message =
        clientMessage instanceof Error
            ? clientMessage.message
            : Array.isArray(clientMessage)
                ? clientMessage.map((e) => String(e)).join('') // Concatenate all elements of the array
                : typeof clientMessage === 'object'
                    ? JSON.stringify(clientMessage)
                    : String(clientMessage);
    // We send the error message in the wild, not waiting for the answer as the
    // network might be down, in which point the server will not know about this
    // error anyway
    return fetch('/api/survey/logClientSideMessage', {
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        method: 'POST',
        body: JSON.stringify({
            message,
            interviewId,
            logLevel
        })
    });
};

const originalConsoleFunctions: {
    log: typeof console.log;
    info: typeof console.info;
    warn: typeof console.warn;
    error: typeof console.error;
} = {
    log: window.console.log,
    info: window.console.info,
    warn: window.console.warn,
    error: window.console.error
};
let consoleOverridden = false;

/**
 * Override the console functions to send data to the server
 * @param options
 * @param {function|undefined} options.getInterviewId An optional function to
 * retrieve the interview ID to send to the server along with the logs.
 * @returns
 */
export const overrideConsoleLogs = ({ getInterviewId }: { getInterviewId?: () => number | undefined } = {}) => {
    if (consoleOverridden) {
        return;
    }
    const callClientSideMessage = (data: any[], logLevel: 'log' | 'error' | 'warn' | 'info') => {
        logClientSideMessage(data.length === 1 ? data[0] : data, {
            interviewId: getInterviewId !== undefined ? getInterviewId() : undefined,
            logLevel
        });
    };
    // Do not override console.log in dev mode, as the `devLog` helper method
    // makes the console very verbose and has pretty formatted messages which do
    // not transform well into simple strings on the server.
    // TODO This is a bit arbitrary. Maybe we could configure the log levels to override instead of hardcoding it and per environment.
    if (process.env.NODE_ENV !== 'development') {
        window.console.log = (...data: any[]) => {
            originalConsoleFunctions.log(...data);
            callClientSideMessage(data, 'log');
        };
    }
    window.console.error = (...data: any[]) => {
        originalConsoleFunctions.error(...data);
        callClientSideMessage(data, 'error');
    };
    window.console.warn = (...data: any[]) => {
        originalConsoleFunctions.warn(...data);
        callClientSideMessage(data, 'warn');
    };
    window.console.info = (...data: any[]) => {
        originalConsoleFunctions.info(...data);
        callClientSideMessage(data, 'info');
    };
    consoleOverridden = true;
};

/**
 * Restore the console functions to their original state
 * @returns
 */
export const restoreConsoleLogs = () => {
    if (!consoleOverridden) {
        return;
    }
    window.console.log = originalConsoleFunctions.log;
    window.console.error = originalConsoleFunctions.error;
    window.console.warn = originalConsoleFunctions.warn;
    window.console.info = originalConsoleFunctions.info;
    consoleOverridden = false;
};
