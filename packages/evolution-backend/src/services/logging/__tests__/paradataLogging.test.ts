/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { getParadataLoggingFunction } from '../paradataLogging';
import config from 'chaire-lib-backend/lib/config/server.config';

import paradataEventsDbQueries from '../../../models/paradataEvents.db.queries';

jest.mock('../../../models/paradataEvents.db.queries', () => ({
    log: jest.fn().mockResolvedValue(true),
}));
const mockLog = paradataEventsDbQueries.log as jest.MockedFunction<typeof paradataEventsDbQueries.log>;

jest.mock('chaire-lib-backend/lib/config/server.config', () => ({
    logDatabaseUpdates: true
}));

beforeEach(() => {
    jest.clearAllMocks();
});

describe('Log for a participant', () => {

    beforeEach(() => {
        (config as any).logDatabaseUpdates = true;
    });

    const interviewId = 123;

    const logFunction = getParadataLoggingFunction(interviewId);

    it('Should correctly log a widget interaction', async () => {
        expect(logFunction).toBeDefined();
        const userAction = {
            type: 'widgetInteraction' as const,
            widgetType: 'string',
            path: 'testWidget',
            value: 'myValue'
        };
        const logData = { valuesByPath: {someData: 'test'} };

        expect(await logFunction!({ userAction, ...logData})).toBe(true);

        expect(mockLog).toHaveBeenCalledWith({
            eventType: 'widget_interaction',
            eventData: {
                ...logData,
                userAction
            },
            interviewId,
            userId: undefined
        });
    });

    it('Should correctly log a button click', async () => {
        const userAction = {
            type: 'buttonClick' as const,
            buttonId: 'button1'
        };
        const logData = { valuesByPath: {someData: 'test'}, unsetPaths: ['path1', 'path2'] };

        expect(await logFunction!({ userAction, ...logData})).toBe(true);

        expect(mockLog).toHaveBeenCalledWith({
            eventType: 'button_click',
            eventData: {
                ...logData,
                userAction
            },
            interviewId,
            userId: undefined
        });
        
    });

    it('Should correctly log a server event', async () => {
        const logData = { valuesByPath: {someData: 'test'}, server: true };

        expect(await logFunction!(logData)).toBe(true);

        expect(mockLog).toHaveBeenCalledWith({
            eventType: 'server_event',
            eventData: { valuesByPath: logData.valuesByPath },
            interviewId,
            userId: undefined
        });
    });

    it('Should correctly log a side effect', async () => {
        const logData = { valuesByPath: {someData: 'test'}, unsetPaths: ['path1', 'path2'] };

        expect(await logFunction!(logData)).toBe(true);

        expect(mockLog).toHaveBeenCalledWith({
            eventType: 'side_effect',
            eventData: logData,
            interviewId,
            userId: undefined
        });
    });

    it('Should return false if error on user action', async () => {
        const userAction = {
            type: 'buttonClick' as const,
            buttonId: 'button1'
        };
        const logData = { valuesByPath: {someData: 'test'} };
        mockLog.mockRejectedValueOnce(new Error('Database error'));

        expect(await logFunction!({ userAction, ...logData })).toBe(false);

        expect(mockLog).toHaveBeenCalledWith({
            eventType: 'button_click',
            eventData: {
                ...logData,
                userAction
            },
            interviewId,
            userId: undefined
        });
    });

    it('Should return false if error on side effect', async () => {
        const logData = { valuesByPath: {someData: 'test'} };
        mockLog.mockRejectedValueOnce(new Error('Database error'));

        expect(await logFunction!(logData)).toBe(false);

        expect(mockLog).toHaveBeenCalledWith({
            eventType: 'side_effect',
            eventData: logData,
            interviewId,
            userId: undefined
        });
        
    });

    it('Should return false if error on server event', async () => {
        const logData = { valuesByPath: {someData: 'test'}, server: true };
        mockLog.mockRejectedValueOnce(new Error('Database error'));

        expect(await logFunction!(logData)).toBe(false);

        expect(mockLog).toHaveBeenCalledWith({
            eventType: 'server_event',
            eventData: { valuesByPath: logData.valuesByPath },
            interviewId,
            userId: undefined
        });
    });
});

describe('Log for a user', () => {

    const interviewId = 123;
    const userId = 456;
    const logFunction = getParadataLoggingFunction(interviewId, userId);

    beforeEach(() => {
        (config as any).logDatabaseUpdates = true;
    });

    it('Should correctly log a widget interaction', async () => {
        expect(logFunction).toBeDefined();
        const userAction = {
            type: 'widgetInteraction' as const,
            widgetType: 'string',
            path: 'testWidget',
            value: 'myValue'
        };
        const logData = { valuesByPath: {someData: 'test'} };

        expect(await logFunction!({ userAction, ...logData})).toBe(true);

        expect(mockLog).toHaveBeenCalledWith({
            eventType: 'widget_interaction',
            eventData: {
                ...logData,
                userAction
            },
            interviewId,
            userId
        });
    });

    it('Should correctly log a button click', async () => {
        const userAction = {
            type: 'buttonClick' as const,
            buttonId: 'button1'
        };
        const logData = { valuesByPath: {someData: 'test'}, unsetPaths: ['path1', 'path2'] };

        expect(await logFunction!({ userAction, ...logData})).toBe(true);

        expect(mockLog).toHaveBeenCalledWith({
            eventType: 'button_click',
            eventData: {
                ...logData,
                userAction
            },
            interviewId,
            userId
        });
        
    });

    it('Should correctly log a server event', async () => {
        const logData = { valuesByPath: {someData: 'test'}, server: true };

        expect(await logFunction!(logData)).toBe(true);

        expect(mockLog).toHaveBeenCalledWith({
            eventType: 'server_event',
            eventData: { valuesByPath: logData.valuesByPath },
            interviewId,
            userId
        });
    });

    it('Should correctly log a side effect', async () => {
        const logData = { valuesByPath: {someData: 'test'}, unsetPaths: ['path1', 'path2'] };

        expect(await logFunction!(logData)).toBe(true);

        expect(mockLog).toHaveBeenCalledWith({
            eventType: 'side_effect',
            eventData: logData,
            interviewId,
            userId
        });
    });

    it('Should return false if error on user action', async () => {
        const userAction = {
            type: 'buttonClick' as const,
            buttonId: 'button1'
        };
        const logData = { valuesByPath: {someData: 'test'} };
        mockLog.mockRejectedValueOnce(new Error('Database error'));

        expect(await logFunction!({ userAction, ...logData })).toBe(false);

        expect(mockLog).toHaveBeenCalledWith({
            eventType: 'button_click',
            eventData: {
                ...logData,
                userAction
            },
            interviewId,
            userId
        });
    });

});

test('Log when database updates are disabled', () => {

    // Disable database logging from the config
    (config as any).logDatabaseUpdates = false;

    const interviewId = 123;
    const userId = 456;
    const logFunction = getParadataLoggingFunction(interviewId, userId);

    expect(logFunction).toBeUndefined();
});
