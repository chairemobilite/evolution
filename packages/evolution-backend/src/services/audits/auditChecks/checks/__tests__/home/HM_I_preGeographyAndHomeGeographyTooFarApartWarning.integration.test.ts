/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { homeAuditChecks } from '../../HomeAuditChecks';
import { createContextWithHome } from './testHelper';

describe('HM_I_preGeographyAndHomeGeographyTooFarApartWarning audit check - Integration tests with real turfDistance', () => {
    const validUuid = uuidV4();

    it('should warn when coordinates are moderately far apart (~93.5 meters)', () => {
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
                    geometry: { type: 'Point' as const, coordinates: [-73.5661, 45.5017] }
                }
            },
            validUuid
        );

        const result = homeAuditChecks.HM_I_preGeographyAndHomeGeographyTooFarApartWarning(context);

        expect(result).toBeDefined();
        expect(result?.errorCode).toBe('HM_I_preGeographyAndHomeGeographyTooFarApartWarning');
        expect(result?.level).toBe('warning');
        expect(result?.objectType).toBe('home');
        expect(result?.objectUuid).toBe(validUuid);
    });

    it('should pass when coordinates are very close together (~7.8 meters)', () => {
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

        const result = homeAuditChecks.HM_I_preGeographyAndHomeGeographyTooFarApartWarning(context);

        expect(result).toBeUndefined();
    });

    it('should pass when coordinates are far apart (~250km) - handled by error check', () => {
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

        const result = homeAuditChecks.HM_I_preGeographyAndHomeGeographyTooFarApartWarning(context);

        expect(result).toBeUndefined();
    });
});

