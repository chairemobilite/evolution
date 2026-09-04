/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import {
    interviewShortcutToVisitedPlaceUuid,
    isUsualPlaceInterviewShortcut
} from '../interviewVisitedPlaceShortcut';

describe('interviewShortcutToVisitedPlaceUuid', () => {
    const visitedPlaceId = uuidV4();
    const visitedPlacePath = `household.persons.${uuidV4()}.journeys.${uuidV4()}.visitedPlaces.${visitedPlaceId}`;

    test.each([
        ['visited place uuid', visitedPlaceId, visitedPlaceId],
        ['visited place path', visitedPlacePath, visitedPlaceId],
        ['usual work place path', `household.persons.${uuidV4()}.usualWorkPlace`, undefined],
        ['usual school place path', `household.persons.${uuidV4()}.usualSchoolPlace`, undefined],
        ['unknown string', 'not-a-shortcut', undefined],
        ['path with response prefix', `response.${visitedPlacePath}`, undefined]
    ])('should map %s', (_title, shortcut, expected) => {
        expect(interviewShortcutToVisitedPlaceUuid(shortcut)).toEqual(expected);
    });

    test('should reject a visited place path whose last segment is not a uuid', () => {
        expect(
            interviewShortcutToVisitedPlaceUuid(
                `household.persons.${uuidV4()}.journeys.${uuidV4()}.visitedPlaces.not-a-uuid`
            )
        ).toBeUndefined();
    });
});

describe('isUsualPlaceInterviewShortcut', () => {
    test.each([
        ['usual work place path', `household.persons.${uuidV4()}.usualWorkPlace`, true],
        ['usual school place path', `household.persons.${uuidV4()}.usualSchoolPlace`, true],
        ['visited place path', `household.persons.${uuidV4()}.journeys.${uuidV4()}.visitedPlaces.${uuidV4()}`, false],
        ['uuid', uuidV4(), false],
        ['unknown string', 'household.persons.personId1.home', false]
    ])('should classify %s', (_title, shortcut, expected) => {
        expect(isUsualPlaceInterviewShortcut(shortcut)).toEqual(expected);
    });
});
