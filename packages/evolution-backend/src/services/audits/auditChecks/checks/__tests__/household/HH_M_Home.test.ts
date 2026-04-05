/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { householdAuditChecks } from '../../HouseholdAuditChecks';
import { createContextWithHouseholdAndHome } from './testHelper';

describe('HH_M_Home audit check', () => {
    const validHouseholdUuid = uuidV4();
    const validHomeUuid = uuidV4();

    it('should pass when household has valid home', () => {
        const context = createContextWithHouseholdAndHome(undefined, {}, validHouseholdUuid, validHomeUuid);

        const result = householdAuditChecks.HH_M_Home(context);

        expect(result).toBeUndefined();
    });

    it('should error when home is undefined', () => {
        const context = createContextWithHouseholdAndHome(undefined, undefined, validHouseholdUuid, validHomeUuid);

        const result = householdAuditChecks.HH_M_Home(context);

        expect(result).toMatchObject({
            objectType: 'household',
            objectUuid: validHouseholdUuid,
            errorCode: 'HH_M_Home',
            version: 1,
            level: 'error',
            message: 'Home is missing',
            ignore: false
        });
    });
});

