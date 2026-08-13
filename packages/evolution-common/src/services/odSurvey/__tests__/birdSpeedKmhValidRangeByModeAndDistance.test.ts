/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import {
    birdSpeedKmhValidRangeByModeAndDistance,
    isBirdSpeedInRangeForModeAndDistance
} from '../birdSpeedKmhValidRangeByModeAndDistance';
import { modeValues, type Mode } from '../types';

describe('range table covers all questionnaire modes', () => {
    test.each(modeValues)('%s has distance-speed bands', (mode) => {
        expect(birdSpeedKmhValidRangeByModeAndDistance[mode]).toBeDefined();
    });
});

describe('isBirdSpeedInRangeForModeAndDistance', () => {
    test.each(modeValues)('%s uses the first distance band', (mode: Mode) => {
        const bands = birdSpeedKmhValidRangeByModeAndDistance[mode];
        expect(bands).toBeDefined();
        const [[distanceMin, distanceMax], [speedMin, speedMax]] = bands![0];
        expect(isBirdSpeedInRangeForModeAndDistance(mode, distanceMin, speedMin)).toEqual({
            wasFound: true,
            inRange: true
        });
        expect(isBirdSpeedInRangeForModeAndDistance(mode, distanceMin, speedMin - 0.1)).toEqual({
            wasFound: true,
            inRange: false
        });
        expect(isBirdSpeedInRangeForModeAndDistance(mode, distanceMin, speedMax + 0.1)).toEqual({
            wasFound: true,
            inRange: false
        });
        if (distanceMin > 0) {
            expect(isBirdSpeedInRangeForModeAndDistance(mode, distanceMin - 0.001, speedMin)).toEqual({
                wasFound: false,
                inRange: false
            });
        }
        expect(distanceMax).toBeGreaterThan(distanceMin);
    });
});
