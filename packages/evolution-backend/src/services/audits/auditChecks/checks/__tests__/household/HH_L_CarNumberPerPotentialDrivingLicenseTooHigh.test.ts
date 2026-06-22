/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { Person } from 'evolution-common/lib/services/baseObjects/Person';
import { householdAuditChecks, MAX_CAR_NUMBER_PER_POTENTIAL_DRIVING_LICENSE } from '../../HouseholdAuditChecks';
import { createContextWithHouseholdAndHome } from './testHelper';

describe('HH_L_CarNumberPerPotentialDrivingLicenseTooHigh audit check', () => {
    const validHouseholdUuid = uuidV4();
    const validHomeUuid = uuidV4();

    // Members are plain objects cast as Person, consistent with the other household test helpers.
    const licenseHolder = { drivingLicenseOwnership: 'yes' } as Person;
    const adultUnknownLicense = { age: 40, drivingLicenseOwnership: 'dontKnow' } as Person;
    const adultMissingLicenseOwnership = { age: 40 } as Person;
    const childNoLicense = { age: 10, drivingLicenseOwnership: 'dontKnow' } as Person;
    const childMissingLicenseOwnership = { age: 10 } as Person;
    const adultNoLicense = { age: 40, drivingLicenseOwnership: 'no' } as Person;
    const memberMissingAgeAndLicense = {} as Person;

    // [title, carNumber, members, shouldWarn]
    const cases: [string, number | undefined, Person[], boolean][] = [
        [
            'ratio at the threshold does not warn',
            MAX_CAR_NUMBER_PER_POTENTIAL_DRIVING_LICENSE,
            [licenseHolder],
            false
        ],
        ['ratio above the threshold warns', MAX_CAR_NUMBER_PER_POTENTIAL_DRIVING_LICENSE + 1, [licenseHolder], true],
        ['adult with unknown license counts as a potential driver', 4, [adultUnknownLicense], true],
        [
            'adult without drivingLicenseOwnership counts as a potential driver',
            4,
            [adultMissingLicenseOwnership],
            true
        ],
        [
            'one car with adult without drivingLicenseOwnership does not warn',
            1,
            [adultMissingLicenseOwnership],
            false
        ],
        ['cars but only a child (no potential driver) warns', 1, [childNoLicense], true],
        [
            'child without drivingLicenseOwnership does not count as a potential driver',
            1,
            [childMissingLicenseOwnership],
            true
        ],
        ['cars but only an adult without license (no potential driver) warns', 2, [adultNoLicense], true],
        [
            'member without age or drivingLicenseOwnership does not count as a potential driver',
            2,
            [memberMissingAgeAndLicense],
            true
        ],
        ['cars but no members at all (no potential driver) warns', 5, [], true],
        ['low ratio does not warn', 4, [licenseHolder, adultUnknownLicense], false],
        ['undefined car number does not warn', undefined, [licenseHolder], false],
        ['no cars does not warn even without a potential driver', 0, [childNoLicense], false]
    ];

    it.each(cases)('%s', (_title, carNumber, members, shouldWarn) => {
        const context = createContextWithHouseholdAndHome(
            { carNumber, members },
            undefined,
            validHouseholdUuid,
            validHomeUuid
        );

        const result = householdAuditChecks.HH_L_CarNumberPerPotentialDrivingLicenseTooHigh(context);

        if (shouldWarn) {
            expect(result).toMatchObject({
                objectType: 'household',
                objectUuid: validHouseholdUuid,
                errorCode: 'HH_L_CarNumberPerPotentialDrivingLicenseTooHigh',
                version: 1,
                level: 'warning',
                message: 'Car number per potential driving license holder > 3',
                ignore: false
            });
        } else {
            expect(result).toBeUndefined();
        }
    });
});
