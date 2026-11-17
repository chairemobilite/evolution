/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import type { ErrorsBySurveyObject } from 'evolution-common/lib/services/baseObjects/types';
import { hasSurveyObjectCreationErrors } from '../hasSurveyObjectCreationErrors';

const noErrors: ErrorsBySurveyObject = {
    interviewUuid: 'interview1',
    interview: [],
    homeUuid: 'interview1',
    home: [],
    householdUuid: 'interview1',
    household: [],
    personsByUuid: {},
    journeysByUuid: {},
    visitedPlacesByUuid: {},
    tripsByUuid: {},
    segmentsByUuid: {}
};
const error = new Error('invalid');

describe('hasSurveyObjectCreationErrors', () => {
    test.each([
        { description: 'no errors', errors: {}, expected: false },
        { description: 'objects by uuid without errors', errors: { personsByUuid: { person1: [] } }, expected: false },
        { description: 'interview errors', errors: { interview: [error] }, expected: true },
        { description: 'household errors', errors: { household: [error] }, expected: true },
        { description: 'person errors', errors: { personsByUuid: { person1: [error] } }, expected: true },
        {
            description: 'segment errors',
            errors: { segmentsByUuid: { segment1: [], segment2: [error] } },
            expected: true
        }
    ])('$description', ({ errors, expected }) => {
        expect(hasSurveyObjectCreationErrors({ ...noErrors, ...errors })).toEqual(expected);
    });
});
