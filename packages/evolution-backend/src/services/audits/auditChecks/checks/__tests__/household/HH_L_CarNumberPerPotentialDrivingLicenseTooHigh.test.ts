/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { Person } from 'evolution-common/lib/services/baseObjects/Person';
import type { PersonAttributes } from 'evolution-common/lib/services/baseObjects/Person';
import { householdAuditChecks, MAX_CAR_NUMBER_PER_POTENTIAL_DRIVING_LICENSE } from '../../HouseholdAuditChecks';
import { createContextWithHouseholdAndHome } from './testHelper';
import { SurveyObjectsRegistry } from 'evolution-common/lib/services/baseObjects/SurveyObjectsRegistry';

describe('HH_L_CarNumberPerPotentialDrivingLicenseTooHigh audit check', () => {
    const validHouseholdUuid = uuidV4();
    const validHomeUuid = uuidV4();
    const surveyObjectsRegistry = new SurveyObjectsRegistry();

    const makeMember = (attrs: Partial<PersonAttributes> = {}) =>
        new Person({ _uuid: uuidV4(), ...attrs }, surveyObjectsRegistry);

    const licenseHolder = makeMember({ drivingLicenseOwnership: 'yes' });
    const adultUnknownLicense = makeMember({ age: 40, drivingLicenseOwnership: 'dontKnow' });
    const adultMissingLicenseOwnership = makeMember({ age: 40 });
    const childNoLicense = makeMember({ age: 10, drivingLicenseOwnership: 'dontKnow' });
    const childMissingLicenseOwnership = makeMember({ age: 10 });
    const adultNoLicense = makeMember({ age: 40, drivingLicenseOwnership: 'no' });
    const memberMissingAgeAndLicense = makeMember();

    // [title, carNumber, members, shouldWarn]
    const cases: [string, number | undefined, Person[], boolean][] = [
        [
            'ratio at the threshold does not warn',
            MAX_CAR_NUMBER_PER_POTENTIAL_DRIVING_LICENSE,
            [licenseHolder],
            false
        ],
        ['ratio above the threshold warns', MAX_CAR_NUMBER_PER_POTENTIAL_DRIVING_LICENSE + 1, [licenseHolder], true],
        ['adult with unknown license counts as a potential driver', 1, [adultUnknownLicense], false],
        ['adult with unknown license, ratio above threshold warns', 4, [adultUnknownLicense], true],
        ['adult without drivingLicenseOwnership counts as a potential driver', 1, [adultMissingLicenseOwnership], false],
        [
            'adult without drivingLicenseOwnership, ratio above threshold warns',
            4,
            [adultMissingLicenseOwnership],
            true
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
