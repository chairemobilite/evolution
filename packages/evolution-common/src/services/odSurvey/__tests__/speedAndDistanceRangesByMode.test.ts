/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import {
    minBirdDistanceMetersByMode,
    isModeOfferedForBirdDistance,
    isModePreOfferedForBirdDistance,
    modesAlwaysOfferedForBirdDistance
} from '../speedAndDistanceRangesByMode';
import { defaultModePreToModeMap, modeValues, type Mode } from '../types';

describe('minimum bird distance covers all questionnaire modes', () => {
    test.each(modeValues)('%s has a minimum bird distance', (mode) => {
        expect(minBirdDistanceMetersByMode[mode]).toEqual(expect.any(Number));
    });
});

describe('isModeOfferedForBirdDistance', () => {
    test.each(modeValues)('offers %s when distance is unknown', (mode) => {
        expect(isModeOfferedForBirdDistance(mode, undefined)).toBe(true);
    });

    const modesWithMinDistance = modeValues.filter(
        (mode) => (minBirdDistanceMetersByMode[mode] ?? 0) > 0 && !modesAlwaysOfferedForBirdDistance.includes(mode)
    );
    test.each(modesWithMinDistance)('hides %s just below min and offers at min', (mode) => {
        const min = minBirdDistanceMetersByMode[mode] as number;
        expect(isModeOfferedForBirdDistance(mode, min - 1)).toBe(false);
        expect(isModeOfferedForBirdDistance(mode, min)).toBe(true);
    });

    test.each(modesAlwaysOfferedForBirdDistance)('always offers %s regardless of distance', (mode) => {
        expect(isModeOfferedForBirdDistance(mode, undefined)).toBe(true);
        expect(isModeOfferedForBirdDistance(mode, 0)).toBe(true);
        expect(isModeOfferedForBirdDistance(mode, Number.MAX_SAFE_INTEGER)).toBe(true);
    });

    const modesWithZeroMin = modeValues.filter((mode) => minBirdDistanceMetersByMode[mode] === 0);
    test.each(modesWithZeroMin)('offers %s regardless of distance', (mode) => {
        expect(isModeOfferedForBirdDistance(mode, 0)).toBe(true);
        expect(isModeOfferedForBirdDistance(mode, Number.MAX_SAFE_INTEGER)).toBe(true);
    });
});

describe('isModePreOfferedForBirdDistance', () => {
    const modePreEntries = Object.entries(defaultModePreToModeMap) as [string, Mode[]][];

    test('hides an empty category', () => {
        expect(isModePreOfferedForBirdDistance([], undefined)).toBe(false);
        expect(isModePreOfferedForBirdDistance([], 0)).toBe(false);
    });

    test.each(modePreEntries)('offers %s when distance is unknown', (_modePre, modes) => {
        expect(isModePreOfferedForBirdDistance(modes, undefined)).toBe(true);
    });

    test.each(
        modePreEntries.map(([modePre, modes]) => {
            const categoryMin = Math.min(
                ...modes.map((mode) =>
                    modesAlwaysOfferedForBirdDistance.includes(mode) ? 0 : (minBirdDistanceMetersByMode[mode] ?? 0)
                )
            );
            return [modePre, categoryMin, modes] as const;
        })
    )('%s is hidden just below %s m and offered at min', (_modePre, categoryMin, modes) => {
        if (categoryMin > 0) {
            expect(isModePreOfferedForBirdDistance(modes, categoryMin - 1)).toBe(false);
        }
        expect(isModePreOfferedForBirdDistance(modes, categoryMin)).toBe(true);
    });
});
