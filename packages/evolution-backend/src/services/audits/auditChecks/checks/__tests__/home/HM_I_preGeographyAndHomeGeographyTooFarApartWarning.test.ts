/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { homeAuditChecks, MAX_DISTANCE_PRE_AND_GEOGRAPHY_ERROR, MIN_DISTANCE_PRE_AND_GEOGRAPHY_WARNING } from '../../HomeAuditChecks';
import { createContextWithHome } from './testHelper';

jest.mock('@turf/distance', () => ({
    distance: jest.fn()
}));

import { distance as turfDistance } from '@turf/distance';

describe('HM_I_preGeographyAndHomeGeographyTooFarApartWarning audit check', () => {
    const validUuid = uuidV4();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('should pass when geographies are missing or undefined', () => {
        it.each([
            {
                name: 'preGeography is missing',
                preGeography: undefined,
                geography: {
                    type: 'Feature' as const,
                    properties: {},
                    geometry: { type: 'Point' as const, coordinates: [-73.5, 45.5] }
                }
            },
            {
                name: 'geography is missing',
                preGeography: {
                    type: 'Feature' as const,
                    properties: {},
                    geometry: { type: 'Point' as const, coordinates: [-73.5, 45.5] }
                },
                geography: undefined
            },
            {
                name: 'both geographies are missing',
                preGeography: undefined,
                geography: undefined
            }
        ])('$name', ({ preGeography, geography }) => {
            const context = createContextWithHome(
                {
                    preGeography,
                    geography
                },
                validUuid
            );

            const result = homeAuditChecks.HM_I_preGeographyAndHomeGeographyTooFarApartWarning(context);

            expect(result).toBeUndefined();
        });
    });

    describe(`should pass when distance is < ${MIN_DISTANCE_PRE_AND_GEOGRAPHY_WARNING} meters or >= ${MAX_DISTANCE_PRE_AND_GEOGRAPHY_ERROR} meters`, () => {
        it.each([
            {
                name: `distance < ${MIN_DISTANCE_PRE_AND_GEOGRAPHY_WARNING} meters (exactly ${MIN_DISTANCE_PRE_AND_GEOGRAPHY_WARNING - 1} meters)`,
                distance: MIN_DISTANCE_PRE_AND_GEOGRAPHY_WARNING - 1
            },
            {
                name: `distance >= ${MAX_DISTANCE_PRE_AND_GEOGRAPHY_ERROR} meters (exactly ${MAX_DISTANCE_PRE_AND_GEOGRAPHY_ERROR} meters)`,
                distance: MAX_DISTANCE_PRE_AND_GEOGRAPHY_ERROR
            }
        ])('$name', ({ distance }) => {
            (turfDistance as jest.Mock).mockReturnValue(distance);

            const context = createContextWithHome(
                {
                    preGeography: {
                        type: 'Feature' as const,
                        properties: {},
                        geometry: { type: 'Point' as const, coordinates: [-73.5, 45.5] }
                    },
                    geography: {
                        type: 'Feature' as const,
                        properties: {},
                        geometry: { type: 'Point' as const, coordinates: [-73.5, 45.5] }
                    }
                },
                validUuid
            );

            const result = homeAuditChecks.HM_I_preGeographyAndHomeGeographyTooFarApartWarning(context);

            expect(result).toBeUndefined();
        });
    });

    describe(`should warn when distance is >= ${MIN_DISTANCE_PRE_AND_GEOGRAPHY_WARNING} and < ${MAX_DISTANCE_PRE_AND_GEOGRAPHY_ERROR} meters`, () => {
        it.each([
            {
                name: `distance exactly ${MIN_DISTANCE_PRE_AND_GEOGRAPHY_WARNING} meters`,
                distance: MIN_DISTANCE_PRE_AND_GEOGRAPHY_WARNING
            },
            {
                name: `distance exactly ${MAX_DISTANCE_PRE_AND_GEOGRAPHY_ERROR - 1} meters`,
                distance: MAX_DISTANCE_PRE_AND_GEOGRAPHY_ERROR - 1
            }
        ])('$name', ({ distance }) => {
            (turfDistance as jest.Mock).mockReturnValue(distance);

            const context = createContextWithHome(
                {
                    preGeography: {
                        type: 'Feature' as const,
                        properties: {},
                        geometry: { type: 'Point' as const, coordinates: [-73.5, 45.5] }
                    },
                    geography: {
                        type: 'Feature' as const,
                        properties: {},
                        geometry: { type: 'Point' as const, coordinates: [-73.5, 45.5] }
                    }
                },
                validUuid
            );

            const result = homeAuditChecks.HM_I_preGeographyAndHomeGeographyTooFarApartWarning(context);

            expect(result).toMatchObject({
                objectType: 'home',
                objectUuid: validUuid,
                errorCode: 'HM_I_preGeographyAndHomeGeographyTooFarApartWarning',
                level: 'warning',
                message: 'Pre-filled and declared home geography are a bit far apart',
                ignore: false
            });
        });
    });
});
