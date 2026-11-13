/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { walkSurveyObjects } from 'evolution-common/lib/services/baseObjects/walkSurveyObjects';
import { ParentSurveyObjects } from 'evolution-common/lib/services/baseObjects/types';
import type { ReviewDecision } from 'evolution-common/lib/services/reviews/types';
import { ExportedReview, ReviewStatusVisitor } from '../ReviewStatusVisitor';

// The walker only reads the child collections and the visitor the uuid. The
// home and household have the uuid of the interview, as in the survey objects.
const segment = { uuid: 'segment1' };
const trip = { uuid: 'trip1', segments: [segment] };
const visitedPlace = { uuid: 'visitedPlace1' };
const journey = { uuid: 'journey1', visitedPlaces: [visitedPlace], trips: [trip] };
const person1 = { uuid: 'person1', journeys: [journey] };
const person2 = { uuid: 'person2', journeys: [] };
const household = { uuid: 'interview1', members: [person1, person2] };
const home = { uuid: 'interview1' };
const interview = { uuid: 'interview1' };
const surveyObjects = { interview, home, household } as unknown as ParentSurveyObjects;

const approve = (objectType: ReviewDecision['objectType'], objectUuid: string, userId = 1): ReviewDecision => ({
    objectType,
    objectUuid,
    userId,
    decision: 'approve'
});
const reject = (objectType: ReviewDecision['objectType'], objectUuid: string, userId = 1): ReviewDecision => ({
    objectType,
    objectUuid,
    userId,
    decision: 'reject'
});

const notReviewed: ExportedReview = { reviewStatus: 'notReviewed', hasRejectedDescendant: false };
const approved: ExportedReview = { reviewStatus: 'approved', hasRejectedDescendant: false };
const rejected: ExportedReview = { reviewStatus: 'rejected', hasRejectedDescendant: false };
const forceApproved: ExportedReview = { reviewStatus: 'forceApproved', hasRejectedDescendant: false };
const withRejectedDescendant = (review: ExportedReview): ExportedReview => ({ ...review, hasRejectedDescendant: true });

describe('ReviewStatusVisitor', () => {
    test.each([
        {
            description: 'no review decisions',
            reviewDecisions: [],
            expected: {
                interview: notReviewed,
                home: notReviewed,
                household: notReviewed,
                person1: notReviewed,
                person2: notReviewed,
                journey: notReviewed,
                visitedPlace: notReviewed,
                trip: notReviewed,
                segment: notReviewed
            }
        },
        {
            description: 'approved household: its objects inherit, not the home with the same uuid',
            reviewDecisions: [approve('household', 'interview1')],
            expected: {
                interview: notReviewed,
                home: notReviewed,
                household: approved,
                person1: approved,
                person2: approved,
                journey: approved,
                visitedPlace: approved,
                trip: approved,
                segment: approved
            }
        },
        {
            description: 'approved interview: all objects inherit',
            reviewDecisions: [approve('interview', 'interview1')],
            expected: {
                interview: approved,
                home: approved,
                household: approved,
                person1: approved,
                person2: approved,
                journey: approved,
                visitedPlace: approved,
                trip: approved,
                segment: approved
            }
        },
        {
            description: 'rejected person in an approved household: its ancestors have a rejected descendant',
            reviewDecisions: [approve('household', 'interview1'), reject('person', 'person1')],
            expected: {
                interview: withRejectedDescendant(notReviewed),
                home: notReviewed,
                household: withRejectedDescendant(approved),
                person1: rejected,
                person2: approved,
                journey: rejected,
                visitedPlace: rejected,
                trip: rejected,
                segment: rejected
            }
        },
        {
            description: 'rejected segment: all its ancestors have a rejected descendant',
            reviewDecisions: [reject('segment', 'segment1')],
            expected: {
                interview: withRejectedDescendant(notReviewed),
                home: notReviewed,
                household: withRejectedDescendant(notReviewed),
                person1: withRejectedDescendant(notReviewed),
                person2: notReviewed,
                journey: withRejectedDescendant(notReviewed),
                visitedPlace: notReviewed,
                trip: withRejectedDescendant(notReviewed),
                segment: rejected
            }
        },
        {
            description: 'force-approved trip in a rejected household: the decision on the trip wins',
            reviewDecisions: [
                reject('household', 'interview1'),
                { objectType: 'trip' as const, objectUuid: 'trip1', userId: 2, forceApproved: true }
            ],
            expected: {
                interview: withRejectedDescendant(notReviewed),
                home: notReviewed,
                household: rejected,
                person1: rejected,
                person2: rejected,
                journey: rejected,
                visitedPlace: rejected,
                trip: forceApproved,
                segment: forceApproved
            }
        },
        {
            description: 'household in conflict: its status is not inherited',
            reviewDecisions: [approve('household', 'interview1', 1), reject('household', 'interview1', 2)],
            expected: {
                interview: notReviewed,
                home: notReviewed,
                household: { reviewStatus: 'conflict', hasRejectedDescendant: false },
                person1: notReviewed,
                person2: notReviewed,
                journey: notReviewed,
                visitedPlace: notReviewed,
                trip: notReviewed,
                segment: notReviewed
            }
        }
    ])('$description', async ({ reviewDecisions, expected }) => {
        const visitor = new ReviewStatusVisitor(reviewDecisions);
        await walkSurveyObjects(surveyObjects, visitor);
        expect({
            interview: visitor.getReview(interview),
            home: visitor.getReview(home),
            household: visitor.getReview(household),
            person1: visitor.getReview(person1),
            person2: visitor.getReview(person2),
            journey: visitor.getReview(journey),
            visitedPlace: visitor.getReview(visitedPlace),
            trip: visitor.getReview(trip),
            segment: visitor.getReview(segment)
        }).toEqual(expected);
    });

    test('getReview throws for an object that was not visited', () => {
        const visitor = new ReviewStatusVisitor([]);
        expect(() => visitor.getReview({ uuid: 'notVisited' })).toThrow(
            'The review of the survey object notVisited is requested before the object is visited'
        );
    });
});
