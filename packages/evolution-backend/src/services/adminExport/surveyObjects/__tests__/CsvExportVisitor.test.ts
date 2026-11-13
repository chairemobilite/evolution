/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { walkSurveyObjects } from 'evolution-common/lib/services/baseObjects/walkSurveyObjects';
import { ParentSurveyObjects } from 'evolution-common/lib/services/baseObjects/types';
import { CsvExportVisitor } from '../CsvExportVisitor';
import { SurveyObjectsCsvWriter } from '../SurveyObjectsCsvWriter';
import { ExportedReview, ReviewStatusVisitor } from '../ReviewStatusVisitor';

// Plain objects with the parts read by the walker and the visitor
const segment = { uuid: 'segment1', attributes: { mode: 'walk' }, customAttributes: {} };
const trip = { uuid: 'trip1', attributes: { _sequence: 1 }, customAttributes: {}, segments: [segment] };
const visitedPlace = {
    uuid: 'visitedPlace1',
    attributes: { activity: 'home' },
    customAttributes: {},
    place: { uuid: 'place1', attributes: { name: 'My home' }, customAttributes: { placeCustom: 'c' } }
};
const visitedPlaceWithoutPlace = { uuid: 'visitedPlace2', attributes: { activity: 'work' }, customAttributes: {} };
const journey = {
    uuid: 'journey1',
    attributes: { name: 'journey' },
    customAttributes: {},
    visitedPlaces: [visitedPlace, visitedPlaceWithoutPlace],
    trips: [trip]
};
const person = { uuid: 'person1', attributes: { age: 30 }, customAttributes: { custom: 'a' }, journeys: [journey] };
const surveyObjects = {
    interview: { uuid: 'interview1', attributes: { accessCode: '1234' }, customAttributes: {} },
    home: { uuid: 'home1', attributes: { name: 'home' }, customAttributes: {} },
    household: { uuid: 'household1', attributes: { size: 1 }, customAttributes: {}, members: [person] }
} as unknown as ParentSurveyObjects;

// Reviews of the objects, the others are approved without rejected descendant
const reviewByObject = new Map<unknown, ExportedReview>([
    [person, { reviewStatus: 'approved', hasRejectedDescendant: true }],
    [visitedPlace, { reviewStatus: 'rejected', hasRejectedDescendant: false }]
]);
const reviewStatuses = {
    getReview: (object: unknown) =>
        reviewByObject.get(object) ?? { reviewStatus: 'approved', hasRejectedDescendant: false }
} as unknown as ReviewStatusVisitor;

describe('CsvExportVisitor', () => {
    const writeRow = jest.fn();

    beforeAll(async () => {
        await walkSurveyObjects(
            surveyObjects,
            new CsvExportVisitor({ writeRow } as unknown as SurveyObjectsCsvWriter, reviewStatuses)
        );
    });

    test('writes one row per object', () => {
        expect(writeRow).toHaveBeenCalledTimes(9);
    });

    // Only the object types that contain others have the `has_rejected_descendant` column
    test.each([
        {
            objectType: 'interview',
            expectedRow: {
                _uuid: 'interview1',
                _interviewUuid: 'interview1',
                review_status: 'approved',
                has_rejected_descendant: false,
                accessCode: '1234'
            }
        },
        {
            objectType: 'home',
            expectedRow: { _uuid: 'home1', _interviewUuid: 'interview1', review_status: 'approved', name: 'home' }
        },
        {
            objectType: 'household',
            expectedRow: {
                _uuid: 'household1',
                _interviewUuid: 'interview1',
                review_status: 'approved',
                has_rejected_descendant: false,
                size: 1
            }
        },
        {
            objectType: 'person',
            expectedRow: {
                _uuid: 'person1',
                _interviewUuid: 'interview1',
                _householdUuid: 'household1',
                review_status: 'approved',
                has_rejected_descendant: true,
                age: 30,
                custom: 'a'
            }
        },
        {
            objectType: 'journey',
            expectedRow: {
                _uuid: 'journey1',
                _interviewUuid: 'interview1',
                _personUuid: 'person1',
                review_status: 'approved',
                has_rejected_descendant: false,
                name: 'journey'
            }
        },
        {
            // The attributes and custom attributes of the place are in the row of the visited place
            objectType: 'visitedPlace',
            expectedRow: {
                _uuid: 'visitedPlace1',
                _interviewUuid: 'interview1',
                _journeyUuid: 'journey1',
                review_status: 'rejected',
                activity: 'home',
                'place.name': 'My home',
                'place.placeCustom': 'c'
            }
        },
        {
            objectType: 'visitedPlace',
            expectedRow: {
                _uuid: 'visitedPlace2',
                _interviewUuid: 'interview1',
                _journeyUuid: 'journey1',
                review_status: 'approved',
                activity: 'work'
            }
        },
        {
            objectType: 'trip',
            expectedRow: {
                _uuid: 'trip1',
                _interviewUuid: 'interview1',
                _journeyUuid: 'journey1',
                review_status: 'approved',
                has_rejected_descendant: false,
                _sequence: 1
            }
        },
        {
            objectType: 'segment',
            expectedRow: {
                _uuid: 'segment1',
                _interviewUuid: 'interview1',
                _tripUuid: 'trip1',
                review_status: 'approved',
                mode: 'walk'
            }
        }
    ])('writes the row of $expectedRow._uuid in the $objectType file', ({ objectType, expectedRow }) => {
        expect(writeRow).toHaveBeenCalledWith(objectType, expectedRow);
    });
});
