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

// Electric bicycles share the bicycle bound. When the household size is unknown
// or invalid, it falls back to the maximum household size, as in the
// participant validation
const getMaxAllowed = (householdSize: number | undefined): number =>
    (householdSize !== undefined && Number.isInteger(householdSize) && householdSize > 0
        ? householdSize
        : projectConfig.maxHouseholdSize) * projectConfig.vehicles.maxBicyclesPerHouseholdMember;

describe('HH_I_ElectricBicycleNumber audit check', () => {
    const validHouseholdUuid = uuidV4();
    const validHomeUuid = uuidV4();

    const getResult = (electricBicycleNumber: number | undefined, size: number | undefined) =>
        householdAuditChecks.HH_I_ElectricBicycleNumber(
            createContextWithHouseholdAndHome(
                { electricBicycleNumber, size },
                undefined,
                validHouseholdUuid,
                validHomeUuid
            )
        );

    const expectedAudit = {
        objectType: 'household',
        objectUuid: validHouseholdUuid,
        errorCode: 'HH_I_ElectricBicycleNumber',
        version: 1,
        level: 'error',
        message: 'Electric bicycle number is out of range',
        ignore: false
    };

    describe.each([
        ['household size 2', 2],
        ['household size 4', 4],
        ['unknown household size', undefined]
    ])('%s', (_title, householdSize: number | undefined) => {
        const maxAllowed = getMaxAllowed(householdSize);

        it.each([0, maxAllowed])('should pass when electric bicycle number is %p', (electricBicycleNumber) => {
            expect(getResult(electricBicycleNumber, householdSize)).toBeUndefined();
        });

        it('should error when electric bicycle number is above max', () => {
            expect(getResult(maxAllowed + 1, householdSize)).toMatchObject(expectedAudit);
        });
    });

    it('should not audit when electric bicycle number is undefined', () => {
        expect(getResult(undefined, 4)).toBeUndefined();
    });

    // More electric bicycles than declared bicycles is a consistency question, checked elsewhere
    it('should not audit when there are more electric bicycles than bicycles', () => {
        const context = createContextWithHouseholdAndHome(
            { electricBicycleNumber: 3, bicycleNumber: 1, size: 4 },
            undefined,
            validHouseholdUuid,
            validHomeUuid
        );

        expect(householdAuditChecks.HH_I_ElectricBicycleNumber(context)).toBeUndefined();
    });

    it.each([
        ['negative value', -1],
        ['non-integer value', 1.5]
    ])('should error for %s', (_title, electricBicycleNumber: number) => {
        expect(getResult(electricBicycleNumber, 4)).toMatchObject(expectedAudit);
    });
});
