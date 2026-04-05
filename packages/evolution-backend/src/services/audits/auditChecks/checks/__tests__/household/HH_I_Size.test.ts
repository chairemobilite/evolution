/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { householdAuditChecks } from '../../HouseholdAuditChecks';
import { createContextWithHouseholdAndHome } from './testHelper';

describe('HH_I_Size audit check', () => {
    const validHouseholdUuid = uuidV4();
    const validHomeUuid = uuidV4();

    it('should pass when household has valid size', () => {
        const context = createContextWithHouseholdAndHome({ size: 3 }, undefined, validHouseholdUuid, validHomeUuid);

        const result = householdAuditChecks.HH_I_Size(context);

        expect(result).toBeUndefined();
    });

    it('should error when household size is too small', () => {
        const context = createContextWithHouseholdAndHome({ size: 0 }, undefined, validHouseholdUuid, validHomeUuid);

        const result = householdAuditChecks.HH_I_Size(context);

        expect(result).toMatchObject({
            objectType: 'household',
            objectUuid: validHouseholdUuid,
            errorCode: 'HH_I_Size',
            version: 1,
            level: 'error',
            message: 'Household size is out of range (should be an integer between 1 and 18)',
            ignore: false
        });
    });

    it('should error when household size is too large', () => {
        const context = createContextWithHouseholdAndHome({ size: 25 }, undefined, validHouseholdUuid, validHomeUuid);

        const result = householdAuditChecks.HH_I_Size(context);

        expect(result).toMatchObject({
            objectType: 'household',
            objectUuid: validHouseholdUuid,
            errorCode: 'HH_I_Size',
            version: 1,
            level: 'error',
            message: 'Household size is out of range (should be an integer between 1 and 18)',
            ignore: false
        });
    });

    it('should error when household size is not an integer', () => {
        const context = createContextWithHouseholdAndHome({ size: 2.5 }, undefined, validHouseholdUuid, validHomeUuid);

        const result = householdAuditChecks.HH_I_Size(context);

        expect(result).toMatchObject({
            objectType: 'household',
            objectUuid: validHouseholdUuid,
            errorCode: 'HH_I_Size',
            version: 1,
            level: 'error',
            message: 'Household size is out of range (should be an integer between 1 and 18)',
            ignore: false
        });
    });

    it('should pass when household size is at minimum boundary', () => {
        const context = createContextWithHouseholdAndHome({ size: 1 }, undefined, validHouseholdUuid, validHomeUuid);
        const result = householdAuditChecks.HH_I_Size(context);
        expect(result).toBeUndefined();
    });

    it('should pass when household size is at maximum boundary', () => {
        const context = createContextWithHouseholdAndHome({ size: 18 }, undefined, validHouseholdUuid, validHomeUuid);
        const result = householdAuditChecks.HH_I_Size(context);
        expect(result).toBeUndefined();
    });

    it('should error when household size is just above maximum', () => {
        const context = createContextWithHouseholdAndHome({ size: 19 }, undefined, validHouseholdUuid, validHomeUuid);
        const result = householdAuditChecks.HH_I_Size(context);
        expect(result).toMatchObject({
            objectType: 'household',
            objectUuid: validHouseholdUuid,
            errorCode: 'HH_I_Size',
            version: 1,
            level: 'error',
            message: 'Household size is out of range (should be an integer between 1 and 18)',
            ignore: false
        });
    });

});

