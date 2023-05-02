/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { Segment } from '../Segment';

type CustomSegment = {
    distance?: number;
};

describe('Segment type tests', () => {
    test('Basic Segment object with custom types', () => {
        const segment: Segment<CustomSegment> = {
            _uuid: 'segment1',
            tripId: 'trip1',
            sequence: 1,
            mode: 'urbanBus',
            modeCategory: 'transit',
            distance: 10,
        };

        expect(segment._uuid).toBe('segment1');
        expect(segment.tripId).toBe('trip1');
        expect(segment.sequence).toBe(1);
        expect(segment.mode).toBe('urbanBus');
        expect(segment.modeCategory).toBe('transit');
        expect(segment.distance).toBe(10);
    });
});
