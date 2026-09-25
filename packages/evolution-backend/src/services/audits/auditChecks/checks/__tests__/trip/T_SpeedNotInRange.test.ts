/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import type { Trip } from 'evolution-common/lib/services/baseObjects/Trip';
import type { Mode } from 'evolution-common/lib/services/odSurvey/types';
import { tripAuditChecks } from '../../TripAuditChecks';
import { createContextWithTrip } from './testHelper';

const tripContext = (
    uuid: string,
    {
        modes,
        transitModes = [],
        transitOnly = false,
        distanceMeters,
        speedKph,
        durationSeconds
    }: {
        modes: Mode[];
        transitModes?: Mode[];
        transitOnly?: boolean;
        distanceMeters: number | undefined;
        speedKph: number | undefined;
        durationSeconds?: number;
    }
) =>
    createContextWithTrip(
        {
            getModes: () => modes,
            getTransitModes: () => transitModes,
            isTransitOnly: () => transitOnly,
            getBirdDistanceMeters: () => distanceMeters,
            getBirdSpeedKph: () => speedKph,
            getDurationSeconds: () => durationSeconds
        } as Partial<Trip>,
        uuid
    );

describe('bird speed audit checks', () => {
    const validUuid = uuidV4();

    const expectedWarning = {
        objectType: 'trip',
        objectUuid: validUuid,
        errorCode: 'T_W_SpeedNotInRange',
        version: 1,
        level: 'warning',
        message: 'Bird speed is unusual for the declared mode',
        ignore: false
    };

    const expectedError = {
        objectType: 'trip',
        objectUuid: validUuid,
        errorCode: 'T_L_SpeedNotInRange',
        version: 1,
        level: 'error',
        message: 'Bird speed is impossible for the declared mode',
        ignore: false
    };

    test.each([
        { description: 'walk at a usual speed', modes: ['walk'] as Mode[], distanceMeters: 2000, speedKph: 8, level: undefined },
        { description: 'walk faster than usual', modes: ['walk'] as Mode[], distanceMeters: 2000, speedKph: 12, level: 'warning' },
        { description: 'walk slower than the error minimum', modes: ['walk'] as Mode[], distanceMeters: 2000, speedKph: 0.2, level: 'error' },
        { description: 'walk at an impossible speed', modes: ['walk'] as Mode[], distanceMeters: 200_000, speedKph: 400, level: 'error' },
        { description: 'walk faster than usual over exactly 1 km', modes: ['walk'] as Mode[], distanceMeters: 1000, speedKph: 12, level: undefined },
        { description: 'walk faster than usual at 500 m', modes: ['walk'] as Mode[], distanceMeters: 500, speedKph: 12, level: undefined },
        { description: 'walk faster than usual under 500 m', modes: ['walk'] as Mode[], distanceMeters: 400, speedKph: 12, level: 'warning' },
        { description: 'wheelchair faster than possible under 500 m', modes: ['wheelchair'] as Mode[], distanceMeters: 400, speedKph: 12, level: 'error' },
        { description: 'bicycle at an impossible speed under 500 m', modes: ['bicycle'] as Mode[], distanceMeters: 200, speedKph: 50, level: 'error' },
        { description: 'car at a slow speed under 500 m', modes: ['carDriver'] as Mode[], distanceMeters: 200, speedKph: 4, level: undefined },
        { description: 'car inside the warning range over 1 km', modes: ['carDriver'] as Mode[], distanceMeters: 2000, speedKph: 8, level: undefined },
        { description: 'walk with no duration at 2 km', modes: ['walk'] as Mode[], distanceMeters: 2000, speedKph: undefined, durationSeconds: 0, level: undefined },
        { description: 'walk with no duration over 2 km', modes: ['walk'] as Mode[], distanceMeters: 2001, speedKph: undefined, durationSeconds: 0, level: 'error' },
        { description: 'walk with no speed', modes: ['walk'] as Mode[], distanceMeters: 2000, speedKph: undefined, level: undefined },
        { description: 'no mode', modes: [] as Mode[], distanceMeters: 2000, speedKph: 12, level: undefined },
        { description: 'bus and walking inside the bus warning range', modes: ['walk', 'transitBus'] as Mode[], transitModes: ['transitBus'] as Mode[], transitOnly: true, distanceMeters: 3000, speedKph: 6, level: undefined },
        { description: 'bus and walking slower than the bus warning minimum', modes: ['walk', 'transitBus'] as Mode[], transitModes: ['transitBus'] as Mode[], transitOnly: true, distanceMeters: 3000, speedKph: 4, level: 'warning' },
        { description: 'walk and car at an unusual speed', modes: ['walk', 'carDriver'] as Mode[], distanceMeters: 5000, speedKph: 200, level: 'warning' }
    ])('$description', ({ modes, transitModes, transitOnly, distanceMeters, speedKph, durationSeconds, level }) => {
        const context = tripContext(validUuid, { modes, transitModes, transitOnly, distanceMeters, speedKph, durationSeconds });

        const warning = tripAuditChecks.T_W_SpeedNotInRange(context);
        const error = tripAuditChecks.T_L_SpeedNotInRange(context);

        if (level === 'warning') {
            expect(warning).toEqual(expectedWarning);
            expect(error).toBeUndefined();
        } else if (level === 'error') {
            expect(warning).toBeUndefined();
            expect(error).toEqual(expectedError);
        } else {
            expect(warning).toBeUndefined();
            expect(error).toBeUndefined();
        }
    });
});
