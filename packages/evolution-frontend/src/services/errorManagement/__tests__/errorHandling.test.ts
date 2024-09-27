/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { reportClientSideException } from '../errorHandling';

describe('reportClientSideException', () => {
    test('should send a report of a client side exception to the server with interview', async () => {
        const error = new Error('Test error');
        const interviewId = 1;
        const fetchSpy = jest.spyOn(window, 'fetch').mockResolvedValue({} as any);

        await reportClientSideException(error, interviewId);

        expect(fetchSpy).toHaveBeenCalledWith('/api/survey/clientSideException', {
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            method: 'POST',
            credentials: 'include',
            body: JSON.stringify({
                exception: error.message,
                interviewId
            })
        });
    });

    it('should send a report of a client side exception to the server without interview id', async () => {
        const error = new Error('Test error');
        const interviewId = 1;
        const fetchSpy = jest.spyOn(window, 'fetch').mockResolvedValue({} as any);

        await reportClientSideException(error, interviewId);

        expect(fetchSpy).toHaveBeenCalledWith('/api/survey/clientSideException', {
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            method: 'POST',
            credentials: 'include',
            body: JSON.stringify({
                exception: error.message,
                interviewId
            })
        });
    });
});