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

const failingRuleIndex = (
    validationFn: typeof carNumberValidation,
    value: unknown,
    interview: any
) => validationFn(value, undefined, interview, 'household.carNumber').findIndex((rule) => rule.validation);

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
            expect(failingRuleIndex(validationFn, value, interviewWithSize(householdSize))).toBe(-1);
        });

        test.each([
            [0, interviewWithoutSize],
            [maxForUnknownSize, interviewWithoutSize]
        ])('accepts value %p when household size is unknown', (value, interview) => {
            expect(failingRuleIndex(validationFn, value, interview)).toBe(-1);
        });

        test.each([
            ['', 4, 1],
            [undefined, 4, 1],
            [-1, 4, 2],
            [1.5, 4, 0],
            [maxForSize4 + 1, 4, 3],
            [maxForUnknownSize + 1, interviewWithoutSize, 3]
        ])('rejects value %p with household size %p at rule index %p', (value, householdSizeOrInterview, expectedFailingIndex) => {
            const interview =
                typeof householdSizeOrInterview === 'number'
                    ? interviewWithSize(householdSizeOrInterview)
                    : householdSizeOrInterview;
            expect(failingRuleIndex(validationFn, value, interview)).toBe(expectedFailingIndex);
        });

        test.each([0, -2])('uses maxHouseholdSize fallback when household size is %p', (invalidHouseholdSize) => {
            const maxAllowed = getEffectiveHouseholdSize(invalidHouseholdSize) * maxPerPerson;

            expect(failingRuleIndex(validationFn, maxAllowed, interviewWithSize(invalidHouseholdSize))).toBe(-1);
            expect(failingRuleIndex(validationFn, maxAllowed + 1, interviewWithSize(invalidHouseholdSize))).toBe(3);
        });
    });
});
