/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { walkSurveyObjects, SurveyObjectVisitor } from '../walkSurveyObjects';
import { ParentSurveyObjects } from '../types';

// The walker only reads the child collections, so plain objects are enough
// to describe the tree. Each object is identified by its uuid.
const segment = { uuid: 'segment1' };
const trip = { uuid: 'trip1', segments: [segment] };
const visitedPlace1 = { uuid: 'visitedPlace1' };
const visitedPlace2 = { uuid: 'visitedPlace2' };
const journey = { uuid: 'journey1', visitedPlaces: [visitedPlace1, visitedPlace2], trips: [trip] };
const person1 = { uuid: 'person1', journeys: [journey] };
const person2 = { uuid: 'person2', journeys: undefined };
const household = { uuid: 'household1', members: [person1, person2] };
const home = { uuid: 'home1' };
const interview = { uuid: 'interview1' };

type Visit = { method: string; object: unknown; context: unknown };

/** Visitor recording the method called, the visited object and its context */
const createRecordingVisitor = (visits: Visit[]): SurveyObjectVisitor => ({
    visitInterview: (object, context) => void visits.push({ method: 'visitInterview', object, context }),
    visitHome: (object, context) => void visits.push({ method: 'visitHome', object, context }),
    visitHousehold: (object, context) => void visits.push({ method: 'visitHousehold', object, context }),
    visitPerson: (object, context) => void visits.push({ method: 'visitPerson', object, context }),
    visitJourney: (object, context) => void visits.push({ method: 'visitJourney', object, context }),
    visitVisitedPlace: (object, context) => void visits.push({ method: 'visitVisitedPlace', object, context }),
    visitTrip: (object, context) => void visits.push({ method: 'visitTrip', object, context }),
    visitSegment: (object, context) => void visits.push({ method: 'visitSegment', object, context })
});

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
            expected: [
                {
                    method: 'visitInterview',
                    object: interview,
                    context: { interview, home: undefined, household: undefined }
                }
            ]
        },
        {
            description: 'household without members',
            surveyObjects: { interview, home: undefined, household: { uuid: 'emptyHousehold' } },
            expected: [
                {
                    method: 'visitInterview',
                    object: interview,
                    context: { interview, home: undefined, household: { uuid: 'emptyHousehold' } }
                },
                {
                    method: 'visitHousehold',
                    object: { uuid: 'emptyHousehold' },
                    context: { interview, home: undefined, household: { uuid: 'emptyHousehold' } }
                }
            ]
        },
        {
            description: 'complete tree, parents before children',
            surveyObjects: { interview, home, household },
            expected: [
                { method: 'visitInterview', object: interview, context: { interview, home, household } },
                { method: 'visitHome', object: home, context: { interview, home, household } },
                { method: 'visitHousehold', object: household, context: { interview, home, household } },
                { method: 'visitPerson', object: person1, context: { interview, home, household } },
                { method: 'visitJourney', object: journey, context: { interview, home, household, person: person1 } },
                {
                    method: 'visitVisitedPlace',
                    object: visitedPlace1,
                    context: { interview, home, household, person: person1, journey }
                },
                {
                    method: 'visitVisitedPlace',
                    object: visitedPlace2,
                    context: { interview, home, household, person: person1, journey }
                },
                {
                    method: 'visitTrip',
                    object: trip,
                    context: { interview, home, household, person: person1, journey }
                },
                {
                    method: 'visitSegment',
                    object: segment,
                    context: { interview, home, household, person: person1, journey, trip }
                },
                { method: 'visitPerson', object: person2, context: { interview, home, household } }
            ]
        }
    ])('visits each object with its context: $description', async ({ surveyObjects, expected }) => {
        const visits: Visit[] = [];
        await walkSurveyObjects(surveyObjects as unknown as ParentSurveyObjects, createRecordingVisitor(visits));
        expect(visits).toEqual(expected);
    });

    test('skips the object types the visitor does not implement', async () => {
        const visitTrip = jest.fn();
        await walkSurveyObjects({ interview, home, household } as unknown as ParentSurveyObjects, { visitTrip });
        expect(visitTrip).toHaveBeenCalledTimes(1);
        expect(visitTrip).toHaveBeenCalledWith(trip, { interview, home, household, person: person1, journey });
    });

    test('waits for an asynchronous visit before the next one', async () => {
        const visits: string[] = [];
        await walkSurveyObjects({ interview, home, household } as unknown as ParentSurveyObjects, {
            visitInterview: async () => {
                await new Promise((resolve) => setTimeout(resolve, 5));
                visits.push('interview');
            },
            visitHousehold: () => void visits.push('household')
        });
        expect(visits).toEqual(['interview', 'household']);
    });
});
