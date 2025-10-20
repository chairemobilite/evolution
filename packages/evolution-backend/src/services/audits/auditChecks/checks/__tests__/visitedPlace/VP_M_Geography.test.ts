/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { visitedPlaceAuditChecks } from '../../VisitedPlaceAuditChecks';
import { createContextWithVisitedPlace } from './testHelper';

describe('VP_M_Geography audit check', () => {
    const validUuid = uuidV4();

    it('should pass when visited place has geography', () => {
        const context = createContextWithVisitedPlace();

        const result = visitedPlaceAuditChecks.VP_M_Geography(context);

        expect(result).toBeUndefined();
    });

    it('should error when visited place has no geography', () => {
        const context = createContextWithVisitedPlace({ geography: undefined }, validUuid);

        const result = visitedPlaceAuditChecks.VP_M_Geography(context);

        expect(result).toMatchObject({
            objectType: 'visitedPlace',
            objectUuid: validUuid,
            errorCode: 'VP_M_Geography',
            version: 1,
            level: 'error',
            message: 'Visited place geography is missing',
            ignore: false
        });
    });
});

