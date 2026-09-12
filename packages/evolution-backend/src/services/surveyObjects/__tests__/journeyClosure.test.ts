/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import {
    computeIsJourneyClosed,
    computeIsJourneyClosedMoreThanOnce,
    type VisitedPlaceJourneyClosureAttributes
} from '../derivedFlags/journeyClosure';

type ClosureCase = {
    description: string;
    visitedPlaces?: { [uuid: string]: VisitedPlaceJourneyClosureAttributes };
            isClosed: boolean;
            isClosedMoreThanOnce: boolean;
};

describe('journey closure', () => {
    test.each<ClosureCase>([
        {
            description: 'no visited places map',
            visitedPlaces: undefined,
            isClosed: false,
            isClosedMoreThanOnce: false
        },
        {
            description: 'empty visited places map',
            visitedPlaces: {},
            isClosed: false,
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
        }
    ])('$description', ({ visitedPlaces, isClosed, isClosedMoreThanOnce }) => {
        expect(computeIsJourneyClosed(visitedPlaces)).toBe(isClosed);
        expect(computeIsJourneyClosedMoreThanOnce(visitedPlaces)).toBe(isClosedMoreThanOnce);
    });
});
