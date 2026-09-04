/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { mapInterviewVisitedPlaceTimes } from '../interviewVisitedPlaceTimes';

describe('mapInterviewVisitedPlaceTimes', () => {
    test.each([
        [
            'interview names only',
            { arrivalTime: 3600, departureTime: 7200 },
            { startTime: 3600, endTime: 7200 }
        ],
        [
            'midnight (0) interview times',
            { arrivalTime: 0, departureTime: 0 },
            { startTime: 0, endTime: 0 }
        ],
        [
            'object names only',
            { startTime: 100, endTime: 200 },
            { startTime: 100, endTime: 200 }
        ],
        [
            'object names win when both are present',
            { startTime: 100, endTime: 200, arrivalTime: 3600, departureTime: 7200 },
            { startTime: 100, endTime: 200 }
        ],
        [
            'object startTime 0 wins over arrivalTime',
            { startTime: 0, arrivalTime: 3600 },
            { startTime: 0 }
        ],
        [
            'arrivalTime only',
            { arrivalTime: 3600, activity: 'work' },
            { startTime: 3600, activity: 'work' }
        ],
        [
            'departureTime only',
            { departureTime: 7200, activity: 'home' },
            { endTime: 7200, activity: 'home' }
        ],
        ['no times', { activity: 'work' }, { activity: 'work' }]
    ])('should map %s', (_title, attributes, expected) => {
        expect(mapInterviewVisitedPlaceTimes(attributes)).toEqual(expected);
    });

    test('should delete interview time names so they do not become custom attributes', () => {
        const mapped = mapInterviewVisitedPlaceTimes({
            arrivalTime: 3600,
            departureTime: 7200,
            startTime: 100,
            endTime: 200
        });
        expect(mapped).not.toHaveProperty('arrivalTime');
        expect(mapped).not.toHaveProperty('departureTime');
    });

    test('should not mutate the original attributes', () => {
        const attributes = { arrivalTime: 3600, departureTime: 7200, activity: 'work' };
        mapInterviewVisitedPlaceTimes(attributes);
        expect(attributes).toEqual({ arrivalTime: 3600, departureTime: 7200, activity: 'work' });
    });
});
