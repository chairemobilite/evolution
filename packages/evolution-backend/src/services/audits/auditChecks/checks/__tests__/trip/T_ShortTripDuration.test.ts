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

const minutes = (count: number) => count * 60;

describe('short trip duration audit checks', () => {
    const validUuid = uuidV4();

    const expectedWarning = {
        objectType: 'trip',
        objectUuid: validUuid,
        errorCode: 'T_W_ShortTripDuration',
        version: 1,
        level: 'warning',
        message: 'Trip duration is long for this short distance',
        ignore: false
    };

    const expectedError = {
        objectType: 'trip',
        objectUuid: validUuid,
        errorCode: 'T_L_ShortTripDuration',
        version: 1,
        level: 'error',
        message: 'Trip duration is too long for this short distance',
        ignore: false
    };

    test.each([
        { description: 'car under 1 km in 19 min', modes: ['carDriver'] as Mode[], distanceMeters: 800, durationSeconds: minutes(19), level: 'accepted' },
        { description: 'car under 1 km in 20 min', modes: ['carDriver'] as Mode[], distanceMeters: 800, durationSeconds: minutes(20), level: 'warning' },
        { description: 'car under 1 km in 44 min', modes: ['carDriver'] as Mode[], distanceMeters: 200, durationSeconds: minutes(44), level: 'warning' },
        { description: 'car under 1 km in 45 min', modes: ['carDriver'] as Mode[], distanceMeters: 800, durationSeconds: minutes(45), level: 'error' },
        { description: 'car at 1 km in 20 min', modes: ['carDriver'] as Mode[], distanceMeters: 1000, durationSeconds: minutes(20), level: 'warning' },
        { description: 'car just over 1 km in 20 min', modes: ['carDriver'] as Mode[], distanceMeters: 1001, durationSeconds: minutes(20), level: 'accepted' },
        { description: 'walk under 500 m in 19 min', modes: ['walk'] as Mode[], distanceMeters: 400, durationSeconds: minutes(19), level: 'accepted' },
        { description: 'wheelchair under 500 m in 20 min', modes: ['wheelchair'] as Mode[], distanceMeters: 400, durationSeconds: minutes(20), level: 'warning' },
        { description: 'walk under 500 m in 20 min', modes: ['walk'] as Mode[], distanceMeters: 400, durationSeconds: minutes(20), level: 'warning' },
        { description: 'bicycle under 500 m in 44 min', modes: ['bicycle'] as Mode[], distanceMeters: 200, durationSeconds: minutes(44), level: 'warning' },
        { description: 'walk under 500 m in 45 min', modes: ['walk'] as Mode[], distanceMeters: 400, durationSeconds: minutes(45), level: 'error' },
        { description: 'walk at 500 m in 20 min', modes: ['walk'] as Mode[], distanceMeters: 500, durationSeconds: minutes(20), level: 'warning' },
        { description: 'walk just over 500 m in 20 min', modes: ['walk'] as Mode[], distanceMeters: 501, durationSeconds: minutes(20), level: 'accepted' },
        { description: 'walk and car under 1 km in 20 min', modes: ['walk', 'carDriver'] as Mode[], distanceMeters: 800, durationSeconds: minutes(20), level: 'warning' },
        { description: 'bus under 1 km in 44 min', modes: ['transitBus'] as Mode[], distanceMeters: 800, durationSeconds: minutes(44), level: 'warning' },
        { description: 'bus under 1 km in 45 min', modes: ['transitBus'] as Mode[], distanceMeters: 800, durationSeconds: minutes(45), level: 'error' },
        { description: 'car with no duration', modes: ['carDriver'] as Mode[], distanceMeters: 800, durationSeconds: undefined, level: 'accepted' },
        { description: 'car under 1 km in 0 min', modes: ['carDriver'] as Mode[], distanceMeters: 800, durationSeconds: 0, level: 'accepted' },
        { description: 'walk under 500 m in 0 min', modes: ['walk'] as Mode[], distanceMeters: 400, durationSeconds: 0, level: 'accepted' }
    ])('$description: $level', ({ modes, distanceMeters, durationSeconds, level }) => {
        const context = createContextWithTrip(
            {
                getModes: () => modes,
                getTransitModes: () => [],
                isTransitOnly: () => false,
                getBirdDistanceMeters: () => distanceMeters,
                getDurationSeconds: () => durationSeconds
            } as Partial<Trip>,
            validUuid
        );

        const warning = tripAuditChecks.T_W_ShortTripDuration(context);
        const error = tripAuditChecks.T_L_ShortTripDuration(context);

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
