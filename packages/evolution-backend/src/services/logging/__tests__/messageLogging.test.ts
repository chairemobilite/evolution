/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { logClientSide } from '../messageLogging';

describe('logClientSide', () => {
    let consoleErrorSpy: jest.SpyInstance;
    let consoleWarnSpy: jest.SpyInstance;
    let consoleInfoSpy: jest.SpyInstance;
    let consoleLogSpy: jest.SpyInstance;

    beforeEach(() => {
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
        consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should log an error with message', () => {
        logClientSide({ interviewId: 123, message: 'Test error', logLevel: 'error' });
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Client-side %s in interview %d: %s',
            'error',
            123,
            'Test error'
        );
    });

    it('should log a warning with message', () => {
        logClientSide({ interviewId: 123, message: 'Test warning', logLevel: 'warn' });
        expect(consoleWarnSpy).toHaveBeenCalledWith(
            'Client-side %s in interview %d: %s',
            'warn',
            123,
            'Test warning'
        );
    });

    it('should log info with message', () => {
        logClientSide({ interviewId: 123, message: 'Test info', logLevel: 'info' });
        expect(consoleInfoSpy).toHaveBeenCalledWith(
            'Client-side %s in interview %d: %s',
            'info',
            123,
            'Test info'
        );
    });

    it('should log a log with message', () => {
        logClientSide({ interviewId: 123, message: 'Test log', logLevel: 'log' });
        expect(consoleLogSpy).toHaveBeenCalledWith(
            'Client-side %s in interview %d: %s',
            'log',
            123,
            'Test log'
        );
    });

    it('should log an error when message is missing', () => {
        logClientSide({ interviewId: 123 });
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Client-side %s in interview %d: missing message data',
            'error',
            123
        );
    });

    it('should truncate long messages to 1000 characters', () => {
        const longException = 'a'.repeat(1500);
        logClientSide({ interviewId: 123, message: longException, logLevel: 'error' });
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Client-side %s in interview %d: %s',
            'error',
            123,
            longException.substring(0, 1000)
        );
    });

    it('should handle non-string messages', () => {
        const messageObject = { message: 'Test object error' };
        logClientSide({ interviewId: 123, message: messageObject, logLevel: 'error' });
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Client-side %s in interview %d: %s',
            'error',
            123,
            String(messageObject)
        );
    });

    it('should log an error when empty parameters', () => {
        logClientSide();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Client-side %s in interview %d: missing message data',
            'error',
            -1
        );
    });

    it('should log an error with message', () => {
        logClientSide({ interviewId: 123, message: 'Test error' });
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Client-side %s in interview %d: %s',
            'error',
            123,
            'Test error'
        );
    });
});
