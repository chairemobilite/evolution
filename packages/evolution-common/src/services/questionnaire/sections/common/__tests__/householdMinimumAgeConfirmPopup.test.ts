/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import each from 'jest-each';
import _cloneDeep from 'lodash/cloneDeep';

import { getHouseholdMinimumAgeConfirmPopup } from '../householdMinimumAgeConfirmPopup';
import projectConfig from '../../../../../config/project.config';
import { interviewAttributesForTestCases } from '../../../../../tests/surveys';
import * as utilHelpers from '../../../../../utils/helpers';

const minimumAge = 16;

/** Get an interview with a household of persons of the requested ages */
const interviewWithAges = (ages: (number | undefined)[]) => {
    const interview = _cloneDeep(interviewAttributesForTestCases);
    interview.response.household!.persons = Object.fromEntries(
        ages.map((age, index) => [`personId${index + 1}`, { _uuid: `personId${index + 1}`, _sequence: index + 1, age }])
    );
    return interview;
};

beforeEach(() => {
    projectConfig.ages.householdMinimumAge = minimumAge;
});

describe('getHouseholdMinimumAgeConfirmPopup', () => {
    test('should return a popup that can only be dismissed', () => {
        expect(getHouseholdMinimumAgeConfirmPopup()).toEqual({
            content: expect.any(Function),
            showConfirmButton: false,
            cancelButtonColor: 'blue',
            cancelButtonLabel: expect.any(Function),
            conditional: expect.any(Function)
        });
    });

    each([
        ['nobody old enough', [minimumAge - 1, 3], true],
        ['one person old enough', [minimumAge - 1, minimumAge], false],
        // The age is required, an unanswered age does not dismiss the popup
        ['a person without age', [minimumAge - 1, undefined], true],
        ['a person without age and a person old enough', [undefined, minimumAge], false]
    ]).test('conditional with %s', (_title, ages: (number | undefined)[], expected: boolean) => {
        const conditional = getHouseholdMinimumAgeConfirmPopup()!.conditional!;
        expect(conditional(interviewWithAges(ages), 'path')).toEqual(expected);
    });

    each([
        ['an empty household', [], 0],
        ['a single person household', [minimumAge - 1], 1],
        ['a multiple persons household', [minimumAge - 1, 3], 2]
    ]).test('content for %s', (_title, ages: number[], expectedCount: number) => {
        const mockedT = jest.fn();
        const content = getHouseholdMinimumAgeConfirmPopup()!.content;
        utilHelpers.translateString(content, { t: mockedT } as any, interviewWithAges(ages), 'path');
        // The count selects the empty household, singular or plural message
        expect(mockedT).toHaveBeenCalledWith('survey:errors:householdMinimumAge', {
            count: expectedCount,
            age: minimumAge
        });
    });
});
