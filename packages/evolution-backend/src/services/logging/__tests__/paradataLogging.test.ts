/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { getParadataLoggingFunction, isUserAction } from '../paradataLogging';
import config from 'chaire-lib-backend/lib/config/server.config';

import paradataEventsDbQueries from '../../../models/paradataEvents.db.queries';
import { UserAction } from 'evolution-common/lib/services/questionnaire/types';

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

describe('isUserAction', () => {
    it.each([
        {
            name: 'widget interaction',
            userAction: { type: 'widgetInteraction', widgetType: 'string', path: 'testWidget', value: 'myValue' }
        },
        {
            name: 'button click',
            userAction: { type: 'buttonClick', buttonId: 'button1' }
        },
        {
            name: 'section change',
            userAction: { type: 'sectionChange', targetSection: { sectionShortname: 'section1' } }
        },
        {
            name: 'language change',
            userAction: { type: 'languageChange', language: 'fr' }
        },
        {
            name: 'interview open',
            userAction: { type: 'interviewOpen', browser: { name: 'Firefox' }, language: 'fr' }
        },
        {
            name: 'support request opened',
            userAction: { type: 'supportRequestOpened' }
        }
    ])('valid $name', ({ userAction }) => {
        expect(isUserAction(userAction)).toEqual(true);
    });

    it.each([
        { name: 'undefined', value: undefined },
        { name: 'null', value: null },
        { name: 'not an object', value: 'a string' },
        { name: 'an array', value: [2, 3, 4] },
        { name: 'an object without the type', value: { fieldA: 'abc', fieldB: 2 } },
        { name: 'an object with none of the right type', value: { type: 'unknownType' } }
    ])('invalid $name', ({ value }) => {
        expect(isUserAction(value)).toEqual(false);
    });
})

describe('Log for a participant', () => {

    beforeEach(() => {
        (config as any).logDatabaseUpdates = true;
    });

    const interviewId = 123;

    const logFunction = getParadataLoggingFunction({ interviewId });

    it.each([
        {
            name: 'widget interaction',
            userAction: { type: 'widgetInteraction', widgetType: 'string', path: 'testWidget', value: 'myValue' },
            eventType: 'widget_interaction',
            logData: { valuesByPath: { someData: 'test' } }
        },
        {
            name: 'button click',
            userAction: { type: 'buttonClick', buttonId: 'button1' },
            eventType: 'button_click',
            logData: { valuesByPath: { someData: 'test' }, unsetPaths: ['path1', 'path2'] }
        },
        {
            name: 'section change',
            userAction: { type: 'sectionChange', targetSection: { sectionShortname: 'section1' } },
            eventType: 'section_change',
            logData: { valuesByPath: { someData: 'test' }, unsetPaths: ['path1', 'path2'] }
        },
        {
            name: 'language change',
            userAction: { type: 'languageChange', language: 'fr' },
            eventType: 'language_change',
            logData: { valuesByPath: { someData: 'test' }, unsetPaths: ['path1', 'path2'] }
        },
        {
            name: 'interview open',
            userAction: { type: 'interviewOpen', browser: { name: 'Firefox' }, language: 'fr' },
            eventType: 'interview_open',
            logData: { valuesByPath: { someData: 'test' }, unsetPaths: ['path1', 'path2'] }
        },
        {
            name: 'support request sent',
            userAction: { type: 'supportRequestSent' },
            eventType: 'support_request_sent',
            logData: {}
        },
        {
            name: 'support request opened',
            userAction: { type: 'supportRequestOpened' },
            eventType: 'support_request_opened',
            logData: {}
        }
    ])('Should correctly log a $name', async ({ userAction, eventType, logData }) => {
        expect(logFunction).toBeDefined();
        expect(await logFunction!({ userAction: userAction as UserAction, ...logData })).toBe(true);
        expect(mockLog).toHaveBeenCalledWith({
            eventType,
            eventData: { ...logData, userAction },
            interviewId,
            userId: undefined,
            forCorrection: false
        });
    });

    it('Should correctly log a server event', async () => {
        const logData = { valuesByPath: {someData: 'test'}, server: true };

        expect(await logFunction!(logData)).toBe(true);

        expect(mockLog).toHaveBeenCalledWith({
            eventType: 'server_event',
            eventData: { valuesByPath: logData.valuesByPath },
            interviewId,
            userId: undefined,
            forCorrection: false
        });
    });

    it('Should correctly log a side effect', async () => {
        const logData = { valuesByPath: {someData: 'test'}, unsetPaths: ['path1', 'path2'] };

        expect(await logFunction!(logData)).toBe(true);

        expect(mockLog).toHaveBeenCalledWith({
            eventType: 'side_effect',
            eventData: logData,
            interviewId,
            userId: undefined,
            forCorrection: false
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
            userId: undefined,
            forCorrection: false
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
            userId: undefined,
            forCorrection: false
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
            userId: undefined,
            forCorrection: false
        });
    });
});

describe.each([
    { forCorrection: true },
    { forCorrection: false }
])('Log for a user with forCorrection set to `$forCorrection`', ({ forCorrection }) => {

    const interviewId = 123;
    const userId = 456;
    const logFunction = getParadataLoggingFunction({ interviewId, userId, isCorrectedInterview: forCorrection });

    beforeEach(() => {
        (config as any).logDatabaseUpdates = true;
    });

    it.each([
        {
            name: 'widget interaction',
            userAction: { type: 'widgetInteraction', widgetType: 'string', path: 'testWidget', value: 'myValue' },
            eventType: 'widget_interaction',
            logData: { valuesByPath: { someData: 'test' } }
        },
        {
            name: 'button click',
            userAction: { type: 'buttonClick', buttonId: 'button1' },
            eventType: 'button_click',
            logData: { valuesByPath: { someData: 'test' }, unsetPaths: ['path1', 'path2'] }
        },
        {
            name: 'section change',
            userAction: { type: 'sectionChange', targetSection: { sectionShortname: 'section1' } },
            eventType: 'section_change',
            logData: { valuesByPath: { someData: 'test' }, unsetPaths: ['path1', 'path2'] }
        },
        {
            name: 'language change',
            userAction: { type: 'languageChange', language: 'fr' },
            eventType: 'language_change',
            logData: { valuesByPath: { someData: 'test' }, unsetPaths: ['path1', 'path2'] }
        },
        {
            name: 'interview open',
            userAction: { type: 'interviewOpen', browser: { name: 'Firefox' }, language: 'fr' },
            eventType: 'interview_open',
            logData: { valuesByPath: { someData: 'test' }, unsetPaths: ['path1', 'path2'] }
        },
        {
            name: 'support request sent',
            userAction: { type: 'supportRequestSent' },
            eventType: 'support_request_sent',
            logData: {}
        },
        {
            name: 'support request opened',
            userAction: { type: 'supportRequestOpened' },
            eventType: 'support_request_opened',
            logData: {}
        }
    ])('Should correctly log a $name', async ({ userAction, eventType, logData }) => {
        expect(logFunction).toBeDefined();
        expect(await logFunction!({ userAction: userAction as UserAction, ...logData })).toBe(true);
        expect(mockLog).toHaveBeenCalledWith({
            eventType,
            eventData: { ...logData, userAction },
            interviewId,
            userId,
            forCorrection
        });
    });

    it('Should correctly log a server event', async () => {
        const logData = { valuesByPath: {someData: 'test'}, server: true };

        expect(await logFunction!(logData)).toBe(true);

        expect(mockLog).toHaveBeenCalledWith({
            eventType: 'server_event',
            eventData: { valuesByPath: logData.valuesByPath },
            interviewId,
            userId,
            forCorrection
        });
    });

    it('Should correctly log a side effect', async () => {
        const logData = { valuesByPath: {someData: 'test'}, unsetPaths: ['path1', 'path2'] };

        expect(await logFunction!(logData)).toBe(true);

        expect(mockLog).toHaveBeenCalledWith({
            eventType: 'side_effect',
            eventData: logData,
            interviewId,
            userId,
            forCorrection
        });
    });

    it('Should return false if error when logging paradata', async () => {
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
            userId,
            forCorrection
        });
    });

});

test('Log when database updates are disabled', () => {

    // Disable database logging from the config
    (config as any).logDatabaseUpdates = false;

    const interviewId = 123;
    const userId = 456;
    const logFunction = getParadataLoggingFunction({ interviewId, userId });

    expect(logFunction).toBeUndefined();
});
