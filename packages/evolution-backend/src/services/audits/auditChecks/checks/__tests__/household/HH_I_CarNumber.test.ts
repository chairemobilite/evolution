/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { householdAuditChecks } from '../../HouseholdAuditChecks';
import { createContextWithHouseholdAndHome } from './testHelper';

describe('HH_I_CarNumber audit check', () => {
    const validHouseholdUuid = uuidV4();
    const validHomeUuid = uuidV4();

    it.each([0, 5, 13])('should pass when household car number is %p', (carNumber) => {
        const context = createContextWithHouseholdAndHome({ carNumber }, undefined, validHouseholdUuid, validHomeUuid);
        const result = householdAuditChecks.HH_I_CarNumber(context);

        expect(result).toBeUndefined();
    });

    const invalidCases: ReadonlyArray<number> = [-1, 14, 1.5];

    it.each(invalidCases)('should error when household car number is invalid (%p)', (carNumber) => {
        const context = createContextWithHouseholdAndHome({ carNumber }, undefined, validHouseholdUuid, validHomeUuid);
        const result = householdAuditChecks.HH_I_CarNumber(context);

        expect(result).toMatchObject({
            objectType: 'household',
            objectUuid: validHouseholdUuid,
            errorCode: 'HH_I_CarNumber',
            version: 1,
            level: 'error',
            message: 'Car number is out of range (should be an integer between 0 and 13)',
            ignore: false
        });
    });
});
