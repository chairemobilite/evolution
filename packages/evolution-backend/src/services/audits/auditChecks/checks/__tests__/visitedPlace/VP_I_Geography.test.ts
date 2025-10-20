/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { visitedPlaceAuditChecks } from '../../VisitedPlaceAuditChecks';
import { createContextWithVisitedPlace } from './testHelper';

describe('VP_I_Geography audit check', () => {
    const validUuid = uuidV4();

    it('should pass when visited place has valid geography', () => {
        const context = createContextWithVisitedPlace();

        const result = visitedPlaceAuditChecks.VP_I_Geography(context);

        expect(result).toBeUndefined();
    });

    it('should error when geography has invalid coordinates', () => {
        const context = createContextWithVisitedPlace({
            geography: {
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'Point',
                    coordinates: [-73.5] // Missing latitude
                }
            }
        }, validUuid);

        const result = visitedPlaceAuditChecks.VP_I_Geography(context);

        expect(result).toMatchObject({
            objectType: 'visitedPlace',
            objectUuid: validUuid,
            errorCode: 'VP_I_Geography',
            version: 1,
            level: 'error',
            message: 'Visited place geography is invalid',
            ignore: false
        });
    });

    it('should error when geography has no coordinates', () => {
        const context = createContextWithVisitedPlace({
            geography: {
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'Point',
                    coordinates: [] as number[]
                }
            }
        }, validUuid);

        const result = visitedPlaceAuditChecks.VP_I_Geography(context);

        expect(result).toMatchObject({
            objectType: 'visitedPlace',
            objectUuid: validUuid,
            errorCode: 'VP_I_Geography',
            version: 1,
            level: 'error',
            message: 'Visited place geography is invalid',
            ignore: false
        });
    });

    it('should pass when geography is missing (handled by VP_M_Geography)', () => {
        const context = createContextWithVisitedPlace({ geography: undefined });

        const result = visitedPlaceAuditChecks.VP_I_Geography(context);

        expect(result).toBeUndefined();
    });
});

