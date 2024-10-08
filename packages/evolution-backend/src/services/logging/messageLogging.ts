/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

/**
 * Log a message coming from the client to the console with the appropriate log level
 * @param args
 * @param {number|undefined} args.interviewId The interview ID this message applies to
 * @param {unknown|undefined} args.message The message to log
 * @param {'error'|'warn'|'info'|'log'} args.logLevel The log level to use
 */
export const logClientSide = ({
    interviewId = -1,
    message,
    logLevel = 'error'
}: { interviewId?: number; message?: unknown; logLevel?: 'error' | 'warn' | 'info' | 'log' } = {}) => {
    const logFct =
        logLevel === 'error'
            ? console.error
            : logLevel === 'warn'
                ? console.warn
                : logLevel === 'info'
                    ? console.info
                    : console.log;
    if (message) {
        const messageString = typeof message !== 'string' ? String(message) : message;
        // Log up to 1000 characters of the message to avoid spamming the logs
        // TODO Add rate limit mechanism in case the same string comes very often
        logFct('Client-side %s in interview %d: %s', logLevel, interviewId, messageString.substring(0, 1000));
    } else {
        console.error('Client-side %s in interview %d: missing message data', logLevel, interviewId);
    }
};
