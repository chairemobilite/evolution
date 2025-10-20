/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { householdAuditChecks } from '../../HouseholdAuditChecks';
import { createContextWithHousehold } from './testHelper';

describe('HH_M_Size audit check', () => {
    const validUuid = uuidV4();

    it('should pass when household has valid size', () => {
        const context = createContextWithHousehold({ size: 3 }, validUuid);

        const result = householdAuditChecks.HH_M_Size(context);

        expect(result).toBeUndefined();
    });

    it('should error when household size is undefined', () => {
        const context = createContextWithHousehold({ size: undefined }, validUuid);

        const result = householdAuditChecks.HH_M_Size(context);

        expect(result).toMatchObject({
            objectType: 'household',
            objectUuid: validUuid,
            errorCode: 'HH_M_Size',
            version: 1,
            level: 'error',
            message: 'Household size is missing',
            ignore: false
        });
    });
});

