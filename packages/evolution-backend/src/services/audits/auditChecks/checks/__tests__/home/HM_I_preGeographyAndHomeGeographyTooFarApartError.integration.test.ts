/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { homeAuditChecks } from '../../HomeAuditChecks';
import { createContextWithHome } from './testHelper';
import type { AuditForObject } from 'evolution-common/lib/services/audits/types';

describe('HM_I_preGeographyAndHomeGeographyTooFarApartError audit check - Integration tests with real turfDistance', () => {
    const validUuid = uuidV4();

    it('should error when coordinates are far apart (Montreal to Quebec City, ~250km)', async () => {
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
        expect((result as AuditForObject)?.errorCode).toBe('HM_I_preGeographyAndHomeGeographyTooFarApartError');
        expect((result as AuditForObject)?.level).toBe('error');
        expect((result as AuditForObject)?.objectType).toBe('home');
        expect((result as AuditForObject)?.objectUuid).toBe(validUuid);
    });

    it('should pass when coordinates are close together (~7.8 meters)', async () => {
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

