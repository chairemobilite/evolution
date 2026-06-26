/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { householdAuditChecks } from '../../HouseholdAuditChecks';
import { createContextWithHouseholdAndHome } from './testHelper';

describe('HH_M_AtLeastOnePersonWithDisability audit check', () => {
    const validHouseholdUuid = uuidV4();
    const validHomeUuid = uuidV4();

    // [title, size, atLeastOnePersonWithDisability, shouldError]
    const cases: [string, number | undefined, string | undefined, boolean][] = [
        ['missing when size > 1', 3, undefined, true],
        ['defined when size > 1 does not error', 3, 'yes', false],
        ['defined as no when size > 1 does not error', 2, 'no', false],
        ['single-person household does not require the field', 1, undefined, false],
        ['undefined size does not error', undefined, undefined, false],
        ['size 0 does not error (size validity is HH_I_Size)', 0, undefined, false]
    ];

    it.each(cases)('%s', (_title, size, atLeastOnePersonWithDisability, shouldError) => {
        const context = createContextWithHouseholdAndHome(
            { size, atLeastOnePersonWithDisability },
            undefined,
            validHouseholdUuid,
            validHomeUuid
        );

        const result = householdAuditChecks.HH_M_AtLeastOnePersonWithDisability(context);

        if (shouldError) {
            expect(result).toMatchObject({
                objectType: 'household',
                objectUuid: validHouseholdUuid,
                errorCode: 'HH_M_AtLeastOnePersonWithDisability',
                version: 1,
                level: 'error',
                message: 'At least one person with disability is missing',
                ignore: false
            });
        } else {
            expect(result).toBeUndefined();
        }
    });
});
