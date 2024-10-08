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