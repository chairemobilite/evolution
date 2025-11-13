/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { homeAuditChecks } from '../../HomeAuditChecks';
import { createContextWithHome } from './testHelper';

describe('HM_I_preGeographyAndHomeGeographyTooFarApartError audit check - Integration tests with real turfDistance', () => {
    const validUuid = uuidV4();

    it('should error when coordinates are far apart (Montreal to Quebec City, ~250km)', () => {
        const context = createContextWithHome(
            {
                preGeography: {
                    type: 'Feature' as const,
                    properties: {},
                    geometry: { type: 'Point' as const, coordinates: [-73.5673, 45.5017] } // Montreal
                },
                geography: {
                    type: 'Feature' as const,
                    properties: {},
                    geometry: { type: 'Point' as const, coordinates: [-71.2080, 46.8139] } // Quebec City
                }
            },
            validUuid
        );

        const result = homeAuditChecks.HM_I_preGeographyAndHomeGeographyTooFarApartError(context);

        expect(result).toBeDefined();
        expect(result).toMatchObject({
            errorCode: 'HM_I_preGeographyAndHomeGeographyTooFarApartError',
            level: 'error',
            objectType: 'home',
            objectUuid: validUuid
        });
    });

    it('should pass when coordinates are close together (~7.8 meters)', () => {
        const context = createContextWithHome(
            {
                preGeography: {
                    type: 'Feature' as const,
                    properties: {},
                    geometry: { type: 'Point' as const, coordinates: [-73.5673, 45.5017] }
                },
                geography: {
                    type: 'Feature' as const,
                    properties: {},
                    geometry: { type: 'Point' as const, coordinates: [-73.5672, 45.5017] }
                }
            },
            validUuid
        );

        const result = homeAuditChecks.HM_I_preGeographyAndHomeGeographyTooFarApartError(context);

        expect(result).toBeUndefined();
    });
});

