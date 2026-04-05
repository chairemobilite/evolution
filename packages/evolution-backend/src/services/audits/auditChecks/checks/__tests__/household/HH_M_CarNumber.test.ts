/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { householdAuditChecks } from '../../HouseholdAuditChecks';
import { createContextWithHouseholdAndHome } from './testHelper';

describe('HH_M_CarNumber audit check', () => {
    const validHouseholdUuid = uuidV4();
    const validHomeUuid = uuidV4();

    it('should pass when household has car number defined', () => {
        const context = createContextWithHouseholdAndHome({ carNumber: 0 }, undefined, validHouseholdUuid, validHomeUuid);

        const result = householdAuditChecks.HH_M_CarNumber(context);

        expect(result).toBeUndefined();
    });

    it('should error when household car number is undefined', () => {
        const context = createContextWithHouseholdAndHome(
            { carNumber: undefined },
            undefined,
            validHouseholdUuid,
            validHomeUuid
        );

        const result = householdAuditChecks.HH_M_CarNumber(context);

        expect(result).toMatchObject({
            objectType: 'household',
            objectUuid: validHouseholdUuid,
            errorCode: 'HH_M_CarNumber',
            version: 1,
            level: 'error',
            message: 'Car number is missing',
            ignore: false
        });
    });
});
