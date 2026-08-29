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
        : projectConfig.maxHouseholdSize) * projectConfig.vehicles.maxTwoWheelsPerHouseholdMember;

describe('HH_I_TwoWheelNumber audit check', () => {
    const validHouseholdUuid = uuidV4();
    const validHomeUuid = uuidV4();

    const getResult = (twoWheelNumber: number | undefined, size: number | undefined) =>
        householdAuditChecks.HH_I_TwoWheelNumber(
            createContextWithHouseholdAndHome({ twoWheelNumber, size }, undefined, validHouseholdUuid, validHomeUuid)
        );

    const expectedAudit = {
        objectType: 'household',
        objectUuid: validHouseholdUuid,
        errorCode: 'HH_I_TwoWheelNumber',
        version: 1,
        level: 'error',
        message: 'Two-wheel number is out of range',
        ignore: false
    };

    describe.each([
        ['household size 2', 2],
        ['household size 4', 4],
        ['unknown household size', undefined]
    ])('%s', (_title, householdSize: number | undefined) => {
        const maxAllowed = getMaxAllowed(householdSize);

        it.each([0, maxAllowed])('should pass when two-wheel number is %p', (twoWheelNumber) => {
            expect(getResult(twoWheelNumber, householdSize)).toBeUndefined();
        });

        it('should error when two-wheel number is above max', () => {
            expect(getResult(maxAllowed + 1, householdSize)).toMatchObject(expectedAudit);
        });
    });

    it('should not audit when two-wheel number is undefined', () => {
        expect(getResult(undefined, 4)).toBeUndefined();
    });

    it.each([
        ['negative value', -1],
        ['non-integer value', 1.5]
    ])('should error for %s', (_title, twoWheelNumber: number) => {
        expect(getResult(twoWheelNumber, 4)).toMatchObject(expectedAudit);
    });
});
