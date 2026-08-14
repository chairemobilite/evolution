/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import projectConfig from '../../../../config/project.config';
import {
    bicycleNumberValidation,
    carNumberValidation,
    twoWheelNumberValidation
} from '../householdAssetCountValidation';

const interviewWithSize = (size: number) =>
    ({
        response: { household: { size } }
    }) as any;

const interviewWithoutSize = { response: { household: {} } } as any;

const ruleFlags = (
    validationFn: typeof carNumberValidation,
    value: unknown,
    interview: any
): boolean[] => validationFn(value, undefined, interview, 'household.carNumber').map((rule) => rule.validation);

const getEffectiveHouseholdSize = (householdSize: number | undefined): number => {
    if (householdSize !== undefined && Number.isInteger(householdSize) && householdSize > 0) {
        return householdSize;
    }

    return projectConfig.maxHouseholdSize;
};

describe('household asset count validation', () => {
    describe.each([
        ['carNumberValidation', carNumberValidation, projectConfig.vehicles.maxCarsPerHouseholdMember],
        ['bicycleNumberValidation', bicycleNumberValidation, projectConfig.vehicles.maxBicyclesPerHouseholdMember],
        ['twoWheelNumberValidation', twoWheelNumberValidation, projectConfig.vehicles.maxTwoWheelsPerHouseholdMember]
    ])('%s', (_label, validationFn, maxPerPerson) => {
        const maxForSize4 = getEffectiveHouseholdSize(4) * maxPerPerson;
        const maxForUnknownSize = getEffectiveHouseholdSize(undefined) * maxPerPerson;

        test.each([
            [0, 4],
            [maxForSize4, 4]
        ])('accepts value %p with household size %p', (value, householdSize) => {
            expect(ruleFlags(validationFn, value, interviewWithSize(householdSize))).toEqual([
                false,
                false,
                false,
                false
            ]);
        });

        test.each([
            [0, interviewWithoutSize],
            [maxForUnknownSize, interviewWithoutSize]
        ])('accepts value %p when household size is unknown', (value, interview) => {
            expect(ruleFlags(validationFn, value, interview)).toEqual([false, false, false, false]);
        });

        test.each([
            ['', 4, [true, false, false, false]],
            [undefined, 4, [true, false, false, false]],
            ['abc', 4, [false, true, false, false]],
            [NaN, 4, [false, true, false, false]],
            [-1, 4, [false, false, true, false]],
            [1.5, 4, [false, true, false, false]],
            [maxForSize4 + 1, 4, [false, false, false, true]],
            [maxForUnknownSize + 1, interviewWithoutSize, [false, false, false, true]]
        ])('rejects value %p with household size %p as %p', (value, householdSizeOrInterview, expectedFlags) => {
            const interview =
                typeof householdSizeOrInterview === 'number'
                    ? interviewWithSize(householdSizeOrInterview)
                    : householdSizeOrInterview;
            expect(ruleFlags(validationFn, value, interview)).toEqual(expectedFlags);
        });

        test.each([0, -2])('uses maxHouseholdSize fallback when household size is %p', (invalidHouseholdSize) => {
            const maxAllowed = getEffectiveHouseholdSize(invalidHouseholdSize) * maxPerPerson;
            const interview = interviewWithSize(invalidHouseholdSize);

            expect(ruleFlags(validationFn, maxAllowed, interview)).toEqual([false, false, false, false]);
            expect(ruleFlags(validationFn, maxAllowed + 1, interview)).toEqual([false, false, false, true]);
        });
    });
});
