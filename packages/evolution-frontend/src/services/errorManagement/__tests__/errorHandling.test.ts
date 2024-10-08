/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import * as ErrorHandlingFct from '../errorHandling';
import each from 'jest-each';

describe('logClientSideMessage', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    })

    each([
        ['Error object and interview id', new Error('Test error'), 1, undefined, {
            message: 'Test error',
            interviewId: 1,
            logLevel: 'error'
        }],
        ['Error object, no interview id', new Error('Test error'), undefined, undefined, {
            message: 'Test error',
            interviewId: undefined,
            logLevel: 'error'
        }],
        ['String error and interview id', 'This is a string error', 1, undefined, {
            message: 'This is a string error',
            interviewId: 1,
            logLevel: 'error'
        }],
        ['Number error and interview id', 3, 1, undefined, {
            message: '3',
            interviewId: 1,
            logLevel: 'error'
        }],
        ['Object error and interview id', { a: 'This is not an error!', b: 'Yes, this is', c: 'We accept you as you are' }, 1, undefined, {
            message: '{"a":"This is not an error!","b":"Yes, this is","c":"We accept you as you are"}',
            interviewId: 1,
            logLevel: 'error'
        }],
        ['Array error and interview id', ['This is a log message', 'then another', { a: '2' }], 1, undefined, {
            message: 'This is a log messagethen another[object Object]',
            interviewId: 1,
            logLevel: 'error'
        }],
        ['Undefined error and interview id', undefined, 1, undefined, {
            message: 'undefined',
            interviewId: 1,
            logLevel: 'error'
        }],
        ['Error object, interview id, log level error', new Error('Test error'), 1, 'error', {
            message: 'Test error',
            interviewId: 1,
            logLevel: 'error'
        }],
        ['Undefined error, interview id, log level warn', new Error('Test error'), 1, 'warn', {
            message: 'Test error',
            interviewId: 1,
            logLevel: 'warn'
        }],
        ['Undefined error, no interview id, log level log', new Error('Test error'), undefined, 'log', {
            message: 'Test error',
            interviewId: undefined,
            logLevel: 'log'
        }],
    ]).test('should send a report of a client side exception to the server: %s', async(_title, error, interviewId, logLevel, expected) => {
        const fetchSpy = jest.spyOn(window, 'fetch').mockResolvedValue({} as any);

        await ErrorHandlingFct.logClientSideMessage(error, { interviewId, logLevel });

        expect(fetchSpy).toHaveBeenCalledWith('/api/survey/logClientSideMessage', {
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            method: 'POST',
            credentials: 'include',
            body: JSON.stringify(expected)
        });
    });

    test('With only one argument', async() => {
        const fetchSpy = jest.spyOn(window, 'fetch').mockResolvedValue({} as any);

        await ErrorHandlingFct.logClientSideMessage('This is an error');

        expect(fetchSpy).toHaveBeenCalledWith('/api/survey/logClientSideMessage', {
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            method: 'POST',
            credentials: 'include',
            body: JSON.stringify({
                message: 'This is an error',
                interviewId: undefined,
                logLevel: 'error'
            })
        });
    });

});

describe('Console log overwriting', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        ErrorHandlingFct.restoreConsoleLogs();
        jest.spyOn(ErrorHandlingFct, 'logClientSideMessage').mockResolvedValue(true as any);
    })

    test('should override console.log, console.warn and console.error', () => {
        const logSpy = jest.spyOn(window.console, 'log').mockImplementation(() => {});
        const warnSpy = jest.spyOn(window.console, 'warn').mockImplementation(() => {});
        const errorSpy = jest.spyOn(window.console, 'error').mockImplementation(() => {});
        const infoSpy = jest.spyOn(window.console, 'info').mockImplementation(() => {});

        ErrorHandlingFct.overrideConsoleLogs({ getInterviewId: () => 1 });

        expect(logSpy).not.toEqual(window.console.log);
        expect(warnSpy).not.toEqual(window.console.warn);
        expect(errorSpy).not.toEqual(window.console.error);
        expect(infoSpy).not.toEqual(window.console.info);
    });

    test('Call to console.log should report client side exception', () => {
        ErrorHandlingFct. overrideConsoleLogs({ getInterviewId: () => 1 });

        window.console.log('This is a log message');

        expect(ErrorHandlingFct.logClientSideMessage).toHaveBeenCalledWith('This is a log message', { interviewId: 1, logLevel: 'log' });
    });

    test('Call to console.warn should report client side exception, no interview id getter', () => {
        ErrorHandlingFct. overrideConsoleLogs();

        window.console.warn('This is a log message');

        expect(ErrorHandlingFct.logClientSideMessage).toHaveBeenCalledWith('This is a log message', { interviewId: undefined, logLevel: 'warn' });
    });

    test('Call to console.info with multiple arguments should report client side exception, no interview id getter', () => {
        ErrorHandlingFct. overrideConsoleLogs();

        window.console.info('This is a log message', 'with other data', { a: '2', b: '3'});

        expect(ErrorHandlingFct.logClientSideMessage).toHaveBeenCalledWith(['This is a log message', 'with other data', { a: '2', b: '3' }], { interviewId: undefined, logLevel: 'info' });
    });

    test('Call to console.info with multiple arguments should report client side exception, no interview id getter', () => {
        ErrorHandlingFct. overrideConsoleLogs();

        window.console.info('This is a log message', 'with other data', { a: '2', b: '3'});

        expect(ErrorHandlingFct.logClientSideMessage).toHaveBeenCalledWith(['This is a log message', 'with other data', { a: '2', b: '3' }], { interviewId: undefined, logLevel: 'info' });
    });

    test('Restore console functions should not report client side exception anymore', () => {
        ErrorHandlingFct. overrideConsoleLogs();

        ErrorHandlingFct.restoreConsoleLogs();

        window.console.log('Hello');
        window.console.info('Hello');
        window.console.warn('Hello');
        window.console.error('Hello');

        expect(ErrorHandlingFct.logClientSideMessage).not.toHaveBeenCalled();
    });

});