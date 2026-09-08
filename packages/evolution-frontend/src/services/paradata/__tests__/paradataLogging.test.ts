/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { logClientEvent, setLogClientEventRoute } from '../paradataLogging';
import { UserAction } from 'evolution-common/lib/services/questionnaire/types';

describe('logClientEvent', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('should send a participant event without an interview ID by default', async () => {
        const clientEvent: UserAction = {
            type: 'buttonClick',
            buttonId: 'next'
        };
        const response = { ok: true } as Response;
        const fetchSpy = jest.spyOn(window, 'fetch').mockResolvedValue(response);

        await expect(logClientEvent(clientEvent)).resolves.toBe(response);

        expect(fetchSpy).toHaveBeenCalledWith('/public/logClientEvent', {
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            method: 'POST',
            body: JSON.stringify({
                clientEvent,
                interviewId: undefined
            })
        });
    });

    test('should send an admin event with the supplied interview ID', async () => {
        const clientEvent: UserAction = {
            type: 'widgetInteraction',
            widgetType: 'inputRadio',
            path: 'person.age',
            value: 35
        };
        const fetchSpy = jest.spyOn(window, 'fetch').mockResolvedValue({} as Response);

        await logClientEvent(clientEvent, { interviewId: 42 });

        expect(fetchSpy).toHaveBeenCalledWith('/public/logClientEvent', {
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            method: 'POST',
            body: JSON.stringify({
                clientEvent,
                interviewId: 42
            })
        });
    });

    test.each<UserAction>([
        {
            type: 'sectionChange',
            targetSection: { sectionShortname: 'home' }
        },
        {
            type: 'languageChange',
            language: 'fr'
        },
        {
            type: 'interviewOpen',
            browser: { name: 'Firefox' },
            language: 'fr'
        }
    ])('should preserve the complete %s event payload', async (clientEvent) => {
        const fetchSpy = jest.spyOn(window, 'fetch').mockResolvedValue({} as Response);

        await logClientEvent(clientEvent);

        expect(fetchSpy).toHaveBeenCalledWith(
            '/public/logClientEvent',
            expect.objectContaining({
                body: JSON.stringify({
                    clientEvent,
                    interviewId: undefined
                })
            })
        );
    });

    test('should use the configured route if set', async () => {
        // Set the route to something else
        const route = '/api/survey/logClientEvent';
        setLogClientEventRoute(route);

        const clientEvent: UserAction = {
            type: 'widgetInteraction',
            widgetType: 'inputRadio',
            path: 'person.age',
            value: 35
        };
        const fetchSpy = jest.spyOn(window, 'fetch').mockResolvedValue({} as Response);

        await logClientEvent(clientEvent, { interviewId: 42 });

        expect(fetchSpy).toHaveBeenCalledWith(route, {
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            method: 'POST',
            body: JSON.stringify({
                clientEvent,
                interviewId: 42
            })
        });
    });
});
