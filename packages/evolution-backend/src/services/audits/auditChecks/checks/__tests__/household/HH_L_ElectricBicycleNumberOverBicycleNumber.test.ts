/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { householdAuditChecks } from '../../HouseholdAuditChecks';
import { createContextWithHouseholdAndHome } from './testHelper';

describe('HH_L_ElectricBicycleNumberOverBicycleNumber audit check', () => {
    const validHouseholdUuid = uuidV4();
    const validHomeUuid = uuidV4();

    const getResult = (bicycleNumber: number | undefined, electricBicycleNumber: number | undefined) =>
        householdAuditChecks.HH_L_ElectricBicycleNumberOverBicycleNumber(
            createContextWithHouseholdAndHome(
                { bicycleNumber, electricBicycleNumber },
                undefined,
                validHouseholdUuid,
                validHomeUuid
            )
        );

    // When bicycleNumber is missing, skip: some surveys only ask electric bicycles.
    it.each([
        ['fewer electric bicycles than bicycles', 3, 1],
        ['as many electric bicycles as bicycles', 3, 3],
        ['no bicycle at all', 0, 0],
        ['survey only asks electric bicycles', undefined, 2],
        ['electric bicycle number is not answered', 2, undefined],
        ['neither is answered', undefined, undefined]
    ])('should pass with %s', (_title, bicycleNumber: number | undefined, electricBicycleNumber: number | undefined) => {
        expect(getResult(bicycleNumber, electricBicycleNumber)).toBeUndefined();
    });

    it.each([
        ['one more electric bicycle than bicycles', 2, 3],
        ['electric bicycles but no bicycle', 0, 1]
    ])('should error with %s', (_title, bicycleNumber: number, electricBicycleNumber: number) => {
        expect(getResult(bicycleNumber, electricBicycleNumber)).toMatchObject({
            objectType: 'household',
            objectUuid: validHouseholdUuid,
            errorCode: 'HH_L_ElectricBicycleNumberOverBicycleNumber',
            version: 1,
            level: 'error',
            message: 'Electric bicycle number is higher than bicycle number',
            ignore: false
        });
    });
});
