/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { householdAuditChecks } from '../../HouseholdAuditChecks';
import { createContextWithHousehold } from './testHelper';

describe('HH_I_Size audit check', () => {
    const validUuid = uuidV4();

    it('should pass when household has valid size', () => {
        const context = createContextWithHousehold({ size: 3 }, validUuid);

        const result = householdAuditChecks.HH_I_Size(context);

        expect(result).toBeUndefined();
    });

    it('should error when household size is too small', () => {
        const context = createContextWithHousehold({ size: 0 }, validUuid);

        const result = householdAuditChecks.HH_I_Size(context);

        expect(result).toMatchObject({
            objectType: 'household',
            objectUuid: validUuid,
            errorCode: 'HH_I_Size',
            version: 1,
            level: 'error',
            message: 'Household size is out of range (should be between 1 and 20)',
            ignore: false
        });
    });

    it('should error when household size is too large', () => {
        const context = createContextWithHousehold({ size: 25 }, validUuid);

        const result = householdAuditChecks.HH_I_Size(context);

        expect(result).toMatchObject({
            objectType: 'household',
            objectUuid: validUuid,
            errorCode: 'HH_I_Size',
            version: 1,
            level: 'error',
            message: 'Household size is out of range (should be between 1 and 20)',
            ignore: false
        });
    });

    it('should pass when household size is at minimum boundary', () => {
        const context = createContextWithHousehold({ size: 1 });
        const result = householdAuditChecks.HH_I_Size(context);
        expect(result).toBeUndefined();
    });

    it('should pass when household size is at maximum boundary', () => {
        const context = createContextWithHousehold({ size: 20 });
        const result = householdAuditChecks.HH_I_Size(context);
        expect(result).toBeUndefined();
    });

});

