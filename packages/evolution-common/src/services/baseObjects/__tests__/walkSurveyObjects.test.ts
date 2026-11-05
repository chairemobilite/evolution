/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { walkSurveyObjects, SurveyObjectVisitor, SurveyObjectVisitContext } from '../walkSurveyObjects';
import { ParentSurveyObjects } from '../types';

// The walker only reads `uuid` and the child collections, so plain objects
// are enough to describe the tree.
const segment = { uuid: 'segment1' };
const trip = { uuid: 'trip1', segments: [segment] };
const visitedPlaces = [{ uuid: 'place1' }, { uuid: 'place2' }];
const journey = { uuid: 'journey1', visitedPlaces, trips: [trip] };
const person1 = { uuid: 'person1', journeys: [journey] };
const person2 = { uuid: 'person2', journeys: undefined };
const household = { uuid: 'household1', members: [person1, person2] };
const home = { uuid: 'home1' };
const interview = { uuid: 'interview1' };

const visitMethods = [
    'visitInterview',
    'visitHome',
    'visitHousehold',
    'visitPerson',
    'visitJourney',
    'visitVisitedPlace',
    'visitTrip',
    'visitSegment'
] as const;

/** Visitor recording each call as `method:uuid[context ancestors uuids]` */
const createRecordingVisitor = (calls: string[]): SurveyObjectVisitor =>
    Object.fromEntries(
        visitMethods.map((method) => [
            method,
            (object: { uuid: string }, context: SurveyObjectVisitContext) => {
                const ancestors = (['interview', 'home', 'household', 'person', 'journey', 'trip'] as const)
                    .map((key) => context[key]?.uuid)
                    .filter((uuid) => uuid !== undefined);
                calls.push(`${method}:${object.uuid}[${ancestors.join(',')}]`);
            }
        ])
    );

describe('walkSurveyObjects', () => {
    test.each([
        {
            description: 'no interview',
            surveyObjects: { interview: undefined, home, household },
            expected: []
        },
        {
            description: 'interview only',
            surveyObjects: { interview, home: undefined, household: undefined },
            expected: ['visitInterview:interview1[interview1]']
        },
        {
            description: 'household without members',
            surveyObjects: { interview, home: undefined, household: { uuid: 'household1' } },
            expected: [
                'visitInterview:interview1[interview1,household1]',
                'visitHousehold:household1[interview1,household1]'
            ]
        },
        {
            description: 'complete tree',
            surveyObjects: { interview, home, household },
            expected: [
                'visitInterview:interview1[interview1,home1,household1]',
                'visitHome:home1[interview1,home1,household1]',
                'visitHousehold:household1[interview1,home1,household1]',
                'visitPerson:person1[interview1,home1,household1]',
                'visitJourney:journey1[interview1,home1,household1,person1]',
                'visitVisitedPlace:place1[interview1,home1,household1,person1,journey1]',
                'visitVisitedPlace:place2[interview1,home1,household1,person1,journey1]',
                'visitTrip:trip1[interview1,home1,household1,person1,journey1]',
                'visitSegment:segment1[interview1,home1,household1,person1,journey1,trip1]',
                'visitPerson:person2[interview1,home1,household1]'
            ]
        }
    ])('visits objects in order with their context: $description', async ({ surveyObjects, expected }) => {
        const calls: string[] = [];
        await walkSurveyObjects(surveyObjects as unknown as ParentSurveyObjects, createRecordingVisitor(calls));
        expect(calls).toEqual(expected);
    });

    test('skips the object types the visitor does not implement', async () => {
        const visitTrip = jest.fn();
        await walkSurveyObjects({ interview, home, household } as unknown as ParentSurveyObjects, { visitTrip });
        expect(visitTrip).toHaveBeenCalledTimes(1);
        expect(visitTrip).toHaveBeenCalledWith(trip, expect.objectContaining({ journey, person: person1 }));
    });
});
