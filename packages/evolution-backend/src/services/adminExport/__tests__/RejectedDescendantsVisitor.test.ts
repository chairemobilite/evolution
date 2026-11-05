/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { walkSurveyObjects } from 'evolution-common/lib/services/baseObjects/walkSurveyObjects';
import { ParentSurveyObjects } from 'evolution-common/lib/services/baseObjects/types';
import { RejectedDescendantsVisitor } from '../RejectedDescendantsVisitor';
import { ExportedObjectType } from '../exportedSurveyObjectParents';

// The walker only reads `uuid` and the child collections. The household has
// the uuid of the interview, as in the survey objects.
const segment = { uuid: 'segment1' };
const trip = { uuid: 'trip1', segments: [segment] };
const journey = { uuid: 'journey1', visitedPlaces: [{ uuid: 'visitedPlace1' }], trips: [trip] };
const person1 = { uuid: 'person1', journeys: [journey] };
const person2 = { uuid: 'person2', journeys: [] };
const surveyObjects = {
    interview: { uuid: 'interview1' },
    home: { uuid: 'interview1' },
    household: { uuid: 'interview1', members: [person1, person2] }
} as unknown as ParentSurveyObjects;

const allObjects: [ExportedObjectType, string][] = [
    ['interview', 'interview1'],
    ['home', 'interview1'],
    ['household', 'interview1'],
    ['person', 'person1'],
    ['person', 'person2'],
    ['journey', 'journey1'],
    ['visitedPlace', 'visitedPlace1'],
    ['trip', 'trip1'],
    ['segment', 'segment1']
];

describe('RejectedDescendantsVisitor', () => {
    test.each([
        { description: 'nothing rejected', rejected: [], expected: [] },
        {
            description: 'rejected segment',
            rejected: ['segment:segment1'],
            expected: ['interview:interview1', 'household:interview1', 'person:person1', 'journey:journey1', 'trip:trip1']
        },
        {
            description: 'rejected person',
            rejected: ['person:person2'],
            expected: ['interview:interview1', 'household:interview1']
        },
        {
            description: 'rejected household, an ancestor is not its own descendant',
            rejected: ['household:interview1'],
            expected: ['interview:interview1']
        },
        { description: 'rejected interview, without parent', rejected: ['interview:interview1'], expected: [] }
    ])('$description', async ({ rejected, expected }) => {
        const visitor = new RejectedDescendantsVisitor((objectType, objectUuid) =>
            rejected.includes(`${objectType}:${objectUuid}`) ? 'rejected' : 'approved'
        );
        await walkSurveyObjects(surveyObjects, visitor);
        const withRejectedDescendant = allObjects
            .filter(([objectType, uuid]) => visitor.hasRejectedDescendant(objectType, uuid))
            .map(([objectType, uuid]) => `${objectType}:${uuid}`);
        expect(withRejectedDescendant).toEqual(expected);
    });
});
