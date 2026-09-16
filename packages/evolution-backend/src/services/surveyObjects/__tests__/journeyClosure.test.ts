/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import {
    computeIsJourneyClosed,
    computeIsJourneyClosedMoreThanOnce,
    type JourneyClosureAnswers,
    type VisitedPlaceJourneyClosureAttributes
} from '../derivedFlags/journeyClosure';

type ClosureCase = {
    description: string;
    visitedPlaces?: { [uuid: string]: VisitedPlaceJourneyClosureAttributes };
    journeyAnswers?: JourneyClosureAnswers;
    isClosed: boolean | undefined;
    isClosedMoreThanOnce: boolean;
};

describe('journey closure', () => {
    test.each<ClosureCase>([
        {
            description: 'no visited places map',
            visitedPlaces: undefined,
            isClosed: undefined,
            isClosedMoreThanOnce: false
        },
        {
            description: 'empty visited places map',
            visitedPlaces: {},
            isClosed: undefined,
            isClosedMoreThanOnce: false
        },
        {
            description: 'places without nextPlaceCategory',
            visitedPlaces: { a: { _sequence: 1 }, b: { _sequence: 2 } },
            isClosed: false,
            isClosedMoreThanOnce: false
        },
        {
            description: 'single place closes the journey',
            visitedPlaces: { a: { _sequence: 1, nextPlaceCategory: 'stayedThereUntilTheNextDay' } },
            isClosed: true,
            isClosedMoreThanOnce: false
        },
        {
            description: 'last place closes the journey',
            visitedPlaces: {
                a: { _sequence: 1, nextPlaceCategory: 'visitedAnotherPlace' },
                b: { _sequence: 2, nextPlaceCategory: 'stayedThereUntilTheNextDay' }
            },
            isClosed: true,
            isClosedMoreThanOnce: false
        },
        {
            description: 'last place says the person went elsewhere',
            visitedPlaces: { a: { _sequence: 1, nextPlaceCategory: 'wentBackHome' } },
            isClosed: false,
            isClosedMoreThanOnce: false
        },
        {
            description: 'last place unanswered, earlier place answered',
            visitedPlaces: {
                a: { _sequence: 1, nextPlaceCategory: 'stayedThereUntilTheNextDay' },
                b: { _sequence: 2 }
            },
            isClosed: false,
            isClosedMoreThanOnce: false
        },
        {
            description: 'middle place unanswered, last place closes',
            visitedPlaces: {
                a: { _sequence: 1, nextPlaceCategory: 'visitedAnotherPlace' },
                b: { _sequence: 2 },
                c: { _sequence: 3, nextPlaceCategory: 'stayedThereUntilTheNextDay' }
            },
            isClosed: true,
            isClosedMoreThanOnce: false
        },
        {
            description: 'last place by sequence, not insertion order',
            visitedPlaces: {
                later: { _sequence: 2, nextPlaceCategory: 'stayedThereUntilTheNextDay' },
                first: { _sequence: 1, nextPlaceCategory: 'visitedAnotherPlace' }
            },
            isClosed: true,
            isClosedMoreThanOnce: false
        },
        {
            description: 'more than one place closes the journey',
            visitedPlaces: {
                a: { _sequence: 1, nextPlaceCategory: 'stayedThereUntilTheNextDay' },
                b: { _sequence: 2, nextPlaceCategory: 'stayedThereUntilTheNextDay' }
            },
            isClosed: true,
            isClosedMoreThanOnce: true
        },
        {
            description: 'personDidTrips is no, even with leftover places',
            visitedPlaces: { a: { _sequence: 1, nextPlaceCategory: 'visitedAnotherPlace' } },
            journeyAnswers: { personDidTrips: 'no' },
            isClosed: undefined,
            isClosedMoreThanOnce: false
        },
        {
            description: 'personDidTrips is no but confirm is yes, last place open',
            visitedPlaces: { a: { _sequence: 1, nextPlaceCategory: 'visitedAnotherPlace' } },
            journeyAnswers: { personDidTrips: 'no', personDidTripsConfirm: 'yes' },
            isClosed: false,
            isClosedMoreThanOnce: false
        },
        {
            description: 'trip diary skipped',
            visitedPlaces: { a: { _sequence: 1, nextPlaceCategory: 'visitedAnotherPlace' } },
            journeyAnswers: { personDidTrips: 'yes', _skipTripDiary: true },
            isClosed: undefined,
            isClosedMoreThanOnce: false
        }
    ])('$description', ({ visitedPlaces, journeyAnswers, isClosed, isClosedMoreThanOnce }) => {
        expect(computeIsJourneyClosed(visitedPlaces, journeyAnswers)).toBe(isClosed);
        expect(computeIsJourneyClosedMoreThanOnce(visitedPlaces)).toBe(isClosedMoreThanOnce);
    });
});
