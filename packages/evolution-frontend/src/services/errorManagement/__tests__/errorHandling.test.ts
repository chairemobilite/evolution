/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { reportClientSideException } from '../errorHandling';
import each from 'jest-each';

describe('reportClientSideException', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    })

    each([
        ['Error object and interview id', new Error('Test error'), 1, {
            exception: 'Test error',
            interviewId: 1
        }],
        ['Error object, no interview id', new Error('Test error'), undefined, {
            exception: 'Test error',
            interviewId: undefined
        }],
        ['String error and interview id', 'This is a string error', 1, {
            exception: 'This is a string error',
            interviewId: 1
        }],
        ['Number error and interview id', 3, 1, {
            exception: '3',
            interviewId: 1
        }],
        ['Object error and interview id', { a: 'This is not an error!', b: 'Yes, this is', c: 'We accept you as you are' }, 1, {
            exception: '{"a":"This is not an error!","b":"Yes, this is","c":"We accept you as you are"}',
            interviewId: 1
        }],
        ['Undefined error and interview id', undefined, 1, {
            exception: 'undefined',
            interviewId: 1
        }],
    ]).test('should send a report of a client side exception to the server: %s', async(_title, error, interviewId, expected) => {
        const fetchSpy = jest.spyOn(window, 'fetch').mockResolvedValue({} as any);

        await reportClientSideException(error, interviewId);

        expect(fetchSpy).toHaveBeenCalledWith('/api/survey/clientSideException', {
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            method: 'POST',
            credentials: 'include',
            body: JSON.stringify(expected)
        });
    });

});