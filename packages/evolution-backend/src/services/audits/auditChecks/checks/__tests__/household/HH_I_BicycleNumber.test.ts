/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import projectConfig from 'evolution-common/lib/config/project.config';
import { householdAuditChecks } from '../../HouseholdAuditChecks';
import { createContextWithHouseholdAndHome } from './testHelper';

// When the household size is unknown or invalid, the bound falls back to the
// maximum household size, as in the participant validation
const getMaxAllowed = (householdSize: number | undefined): number =>
    (householdSize !== undefined && Number.isInteger(householdSize) && householdSize > 0
        ? householdSize
        : projectConfig.maxHouseholdSize) * projectConfig.vehicles.maxBicyclesPerHouseholdMember;

describe('HH_I_BicycleNumber audit check', () => {
    const validHouseholdUuid = uuidV4();
    const validHomeUuid = uuidV4();

    const getResult = (bicycleNumber: number | undefined, size: number | undefined) =>
        householdAuditChecks.HH_I_BicycleNumber(
            createContextWithHouseholdAndHome({ bicycleNumber, size }, undefined, validHouseholdUuid, validHomeUuid)
        );

    const expectedAudit = {
        objectType: 'household',
        objectUuid: validHouseholdUuid,
        errorCode: 'HH_I_BicycleNumber',
        version: 1,
        level: 'error',
        message: 'Bicycle number is out of range',
        ignore: false
    };

    describe.each([
        ['household size 2', 2],
        ['household size 4', 4],
        ['unknown household size', undefined]
    ])('%s', (_title, householdSize: number | undefined) => {
        const maxAllowed = getMaxAllowed(householdSize);

        it.each([0, maxAllowed])('should pass when bicycle number is %p', (bicycleNumber) => {
            expect(getResult(bicycleNumber, householdSize)).toBeUndefined();
        });

        it('should error when bicycle number is above max', () => {
            expect(getResult(maxAllowed + 1, householdSize)).toMatchObject(expectedAudit);
        });
    });

    it('should not audit when bicycle number is undefined', () => {
        expect(getResult(undefined, 4)).toBeUndefined();
    });

    it.each([
        ['negative value', -1],
        ['non-integer value', 1.5]
    ])('should error for %s', (_title, bicycleNumber: number) => {
        expect(getResult(bicycleNumber, 4)).toMatchObject(expectedAudit);
    });
});
