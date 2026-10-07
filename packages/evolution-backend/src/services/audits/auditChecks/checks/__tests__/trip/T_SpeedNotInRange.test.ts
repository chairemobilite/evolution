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
        {
            description: 'walk at a usual speed',
            modes: ['walk'] as Mode[],
            distanceMeters: 2000,
            speedKph: 8,
            level: undefined
        },
        {
            description: 'walk faster than usual',
            modes: ['walk'] as Mode[],
            distanceMeters: 2000,
            speedKph: 12,
            level: 'warning'
        },
        {
            description: 'walk slower than the error minimum',
            modes: ['walk'] as Mode[],
            distanceMeters: 2000,
            speedKph: 0.2,
            level: 'error'
        },
        {
            description: 'walk at an impossible speed',
            modes: ['walk'] as Mode[],
            distanceMeters: 200_000,
            speedKph: 400,
            level: 'error'
        },
        {
            description: 'walk faster than usual at exactly 1 km',
            modes: ['walk'] as Mode[],
            distanceMeters: 1000,
            speedKph: 12,
            level: 'warning'
        },
        {
            description: 'walk faster than usual at 500 m',
            modes: ['walk'] as Mode[],
            distanceMeters: 500,
            speedKph: 12,
            level: undefined
        },
        {
            description: 'walk faster than usual just above 500 m',
            modes: ['walk'] as Mode[],
            distanceMeters: 501,
            speedKph: 12,
            level: 'warning'
        },
        {
            description: 'walk faster than usual under 500 m',
            modes: ['walk'] as Mode[],
            distanceMeters: 400,
            speedKph: 12,
            level: undefined
        },
        {
            description: 'wheelchair faster than possible above 500 m',
            modes: ['wheelchair'] as Mode[],
            distanceMeters: 600,
            speedKph: 12,
            level: 'error'
        },
        {
            description: 'bicycle at an impossible speed above 500 m',
            modes: ['bicycle'] as Mode[],
            distanceMeters: 600,
            speedKph: 50,
            level: 'error'
        },
        {
            description: 'car at a slow speed under 1 km',
            modes: ['carDriver'] as Mode[],
            distanceMeters: 800,
            speedKph: 4,
            level: undefined
        },
        {
            description: 'car inside the warning range over 1 km',
            modes: ['carDriver'] as Mode[],
            distanceMeters: 2000,
            speedKph: 8,
            level: undefined
        },
        {
            description: 'motorcycle at a car warning speed',
            modes: ['motorcycle'] as Mode[],
            distanceMeters: 2000,
            speedKph: 110,
            level: undefined
        },
        {
            description: 'motorcycle faster than the car warning maximum',
            modes: ['motorcycle'] as Mode[],
            distanceMeters: 2000,
            speedKph: 130,
            level: 'warning'
        },
        {
            description: 'walk with no duration at 1 km',
            modes: ['walk'] as Mode[],
            distanceMeters: 1000,
            speedKph: undefined,
            durationSeconds: 0,
            level: undefined
        },
        {
            description: 'walk with no duration over 1 km',
            modes: ['walk'] as Mode[],
            distanceMeters: 1001,
            speedKph: undefined,
            durationSeconds: 0,
            level: 'error'
        },
        {
            description: 'bus with no duration at 1 km',
            modes: ['transitBus'] as Mode[],
            distanceMeters: 1000,
            speedKph: undefined,
            durationSeconds: 0,
            level: undefined
        },
        {
            description: 'bus with no duration over 1 km',
            modes: ['transitBus'] as Mode[],
            distanceMeters: 1001,
            speedKph: undefined,
            durationSeconds: 0,
            level: 'error'
        },
        {
            description: 'metro with no duration over 1 km',
            modes: ['transitRRT'] as Mode[],
            distanceMeters: 1001,
            speedKph: undefined,
            durationSeconds: 0,
            level: 'error'
        },
        {
            description: 'car with no duration at 5 km',
            modes: ['carDriver'] as Mode[],
            distanceMeters: 5000,
            speedKph: undefined,
            durationSeconds: 0,
            level: undefined
        },
        {
            description: 'car with no duration over 5 km',
            modes: ['carDriver'] as Mode[],
            distanceMeters: 5001,
            speedKph: undefined,
            durationSeconds: 0,
            level: 'error'
        },
        {
            description: 'motorcycle with no duration at 5 km',
            modes: ['motorcycle'] as Mode[],
            distanceMeters: 5000,
            speedKph: undefined,
            durationSeconds: 0,
            level: undefined
        },
        {
            description: 'motorcycle with no duration over 5 km',
            modes: ['motorcycle'] as Mode[],
            distanceMeters: 5001,
            speedKph: undefined,
            durationSeconds: 0,
            level: 'error'
        },
        {
            description: 'walk with no speed',
            modes: ['walk'] as Mode[],
            distanceMeters: 2000,
            speedKph: undefined,
            level: undefined
        },
        { description: 'no mode', modes: [] as Mode[], distanceMeters: 2000, speedKph: 12, level: undefined },
        {
            description: 'bus and walking use the walk range',
            modes: ['walk', 'transitBus'] as Mode[],
            distanceMeters: 3000,
            speedKph: 4,
            level: undefined
        },
        {
            description: 'bus and walking faster than the highest warning maximum',
            modes: ['walk', 'transitBus'] as Mode[],
            distanceMeters: 3000,
            speedKph: 60,
            level: 'warning'
        },
        {
            description: 'walk and car faster than the highest error maximum',
            modes: ['walk', 'carDriver'] as Mode[],
            distanceMeters: 5000,
            speedKph: 200,
            level: 'error'
        },
        {
            description: 'bus inside its warning range',
            modes: ['transitBus'] as Mode[],
            distanceMeters: 3000,
            speedKph: 6,
            level: undefined
        },
        {
            description: 'metro inside its warning range',
            modes: ['transitRRT'] as Mode[],
            distanceMeters: 3000,
            speedKph: 4,
            level: undefined
        },
        {
            description: 'metro slower than its warning minimum',
            modes: ['transitRRT'] as Mode[],
            distanceMeters: 3000,
            speedKph: 2,
            level: 'warning'
        },
        {
            description: 'car and light rail slower than the lowest warning minimum',
            modes: ['carDriver', 'transitLRRT'] as Mode[],
            distanceMeters: 5000,
            speedKph: 5,
            level: 'warning'
        },
        {
            description: 'car and light rail faster than the highest warning maximum',
            modes: ['carDriver', 'transitLRRT'] as Mode[],
            distanceMeters: 5000,
            speedKph: 130,
            level: 'warning'
        },
        {
            description: 'bus and metro inside the metro warning range',
            modes: ['transitBus', 'transitRRT'] as Mode[],
            distanceMeters: 3000,
            speedKph: 4,
            level: undefined
        },
        {
            description: 'bus and metro faster than the highest error maximum',
            modes: ['transitBus', 'transitRRT'] as Mode[],
            distanceMeters: 3000,
            speedKph: 130,
            level: 'error'
        },
        {
            description: 'three bus segments use the bus range',
            modes: ['transitBus', 'transitBus', 'transitBus'] as Mode[],
            distanceMeters: 3000,
            speedKph: 4,
            level: 'warning'
        },
        {
            description: 'walk and plane use the plane range',
            modes: ['walk', 'plane'] as Mode[],
            distanceMeters: 5000,
            speedKph: 10,
            level: 'error'
        },
        {
            description: 'car and intercity bus use the intercity bus range',
            modes: ['carDriver', 'intercityBus'] as Mode[],
            distanceMeters: 5000,
            speedKph: 100,
            level: 'warning'
        },
        {
            description: 'car and intercity train use the intercity train range',
            modes: ['carDriver', 'intercityTrain'] as Mode[],
            distanceMeters: 5000,
            speedKph: 15,
            level: 'warning'
        },
        {
            description: 'car and high speed rail use the high speed rail range',
            modes: ['carDriver', 'transitHSR'] as Mode[],
            distanceMeters: 5000,
            speedKph: 20,
            level: 'warning'
        },
        {
            description: 'plane and intercity bus combine only their ranges',
            modes: ['walk', 'plane', 'intercityBus'] as Mode[],
            distanceMeters: 5000,
            speedKph: 10,
            level: 'warning'
        },
        {
            description: 'three car segments use the car range',
            modes: ['carDriver', 'carDriver', 'carDriver'] as Mode[],
            distanceMeters: 3000,
            speedKph: 4,
            level: 'warning'
        },
        {
            description: 'unknown mode is ignored',
            modes: ['notAMode'] as unknown as Mode[],
            distanceMeters: 2000,
            speedKph: 12,
            level: undefined
        },
        {
            description: 'walk with an unknown mode uses the walk range',
            modes: ['walk', 'notAMode'] as unknown as Mode[],
            distanceMeters: 2000,
            speedKph: 12,
            level: 'warning'
        }
    ])('$description', ({ modes, distanceMeters, speedKph, durationSeconds, level }) => {
        const context = tripContext(validUuid, {
            modes,
            distanceMeters,
            speedKph,
            durationSeconds
        });

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
