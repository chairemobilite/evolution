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

const maxCarsPerPerson = projectConfig.vehicles.maxCarsPerHouseholdMember;

const getEffectiveHouseholdSize = (householdSize: number | undefined): number => {
    if (householdSize !== undefined && Number.isInteger(householdSize) && householdSize > 0) {
        return householdSize;
    }

    return projectConfig.maxHouseholdSize;
};

const getMaxAllowed = (householdSize: number | undefined): number =>
    getEffectiveHouseholdSize(householdSize) * maxCarsPerPerson;

describe('HH_I_CarNumber audit check', () => {
    const validHouseholdUuid = uuidV4();
    const validHomeUuid = uuidV4();

    const householdSizeCases: [string, number | undefined][] = [
        ['household size 2', 2],
        ['household size 4', 4],
        ['unknown household size', undefined]
    ];

    describe.each(householdSizeCases)('%s', (_title, householdSize) => {
        const maxAllowed = getMaxAllowed(householdSize);

        it.each([0, maxAllowed])('should pass when car number is %p', (carNumber) => {
            const context = createContextWithHouseholdAndHome(
                { carNumber, size: householdSize },
                undefined,
                validHouseholdUuid,
                validHomeUuid
            );

            expect(householdAuditChecks.HH_I_CarNumber(context)).toBeUndefined();
        });

        it('should error when car number is above max', () => {
            const context = createContextWithHouseholdAndHome(
                { carNumber: maxAllowed + 1, size: householdSize },
                undefined,
                validHouseholdUuid,
                validHomeUuid
            );
            const result = householdAuditChecks.HH_I_CarNumber(context);

            expect(result).toMatchObject({
                objectType: 'household',
                objectUuid: validHouseholdUuid,
                errorCode: 'HH_I_CarNumber',
                version: 1,
                level: 'error',
                message: 'Car number is out of range',
                ignore: false
            });
        });
    });

    it('should not audit when car number is undefined', () => {
        const context = createContextWithHouseholdAndHome(
            { carNumber: undefined },
            undefined,
            validHouseholdUuid,
            validHomeUuid
        );

        expect(householdAuditChecks.HH_I_CarNumber(context)).toBeUndefined();
    });

    it.each([
        ['negative value', -1],
        ['non-integer value', 1.5]
    ])('should error for %s', (_title, carNumber) => {
        const context = createContextWithHouseholdAndHome(
            { carNumber, size: 4 },
            undefined,
            validHouseholdUuid,
            validHomeUuid
        );
        const result = householdAuditChecks.HH_I_CarNumber(context);

        expect(result).toMatchObject({
            objectType: 'household',
            objectUuid: validHouseholdUuid,
            errorCode: 'HH_I_CarNumber',
            version: 1,
            level: 'error',
            message: 'Car number is out of range',
            ignore: false
        });
    });

    it.each(householdSizeCases)('%s: max allowed is effective household size × maxCarsPerPerson', (_title, householdSize) => {
        const effectiveSize = getEffectiveHouseholdSize(householdSize);

        expect(getMaxAllowed(householdSize)).toBe(effectiveSize * maxCarsPerPerson);
    });
});
