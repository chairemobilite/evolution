/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { journeyAuditChecks } from '../../JourneyAuditChecks';
import { createContextWithJourney } from './testHelper';
import { VisitedPlace } from 'evolution-common/lib/services/baseObjects/VisitedPlace';
import { Trip } from 'evolution-common/lib/services/baseObjects/Trip';
import { SurveyObjectsRegistry } from 'evolution-common/lib/services/baseObjects/SurveyObjectsRegistry';

type VisitedPlaceSpec = {
    sequence?: number;
    startTime?: number;
    endTime?: number;
    startDate?: string;
    endDate?: string;
    startTimePeriod?: string;
    endTimePeriod?: string;
};

type TripSpec = {
    startTime?: number;
    endTime?: number;
    startDate?: string;
    endDate?: string;
    originSequence?: number;
    destinationSequence?: number;
};

type ChronologyCase = {
    title: string;
    visitedPlaces?: VisitedPlaceSpec[];
    trips?: TripSpec[];
    shouldError: boolean;
};

const surveyObjectsRegistry = new SurveyObjectsRegistry();

const makeVisitedPlaces = (specs: VisitedPlaceSpec[] | undefined) =>
    specs?.map(
        (spec) =>
            new VisitedPlace(
                {
                    _uuid: uuidV4(),
                    _sequence: spec.sequence,
                    startTime: spec.startTime,
                    endTime: spec.endTime,
                    startDate: spec.startDate,
                    endDate: spec.endDate,
                    startTimePeriod: spec.startTimePeriod,
                    endTimePeriod: spec.endTimePeriod
                },
                surveyObjectsRegistry
            )
    );

const makeTrips = (specs: TripSpec[] | undefined, visitedPlaces?: VisitedPlace[]) =>
    specs?.map((spec) => {
        const trip = new Trip(
            {
                _uuid: uuidV4(),
                startTime: spec.startTime,
                endTime: spec.endTime,
                startDate: spec.startDate,
                endDate: spec.endDate
            },
            surveyObjectsRegistry
        );
        if (spec.originSequence !== undefined) {
            trip.startPlace = visitedPlaces?.find((visitedPlace) => visitedPlace._sequence === spec.originSequence);
        }
        if (spec.destinationSequence !== undefined) {
            trip.endPlace = visitedPlaces?.find((visitedPlace) => visitedPlace._sequence === spec.destinationSequence);
        }
        return trip;
    });

describe('J_L_InconsistentChronology audit check', () => {
    const validJourneyUuid = uuidV4();

    const expectedError = {
        objectType: 'journey',
        objectUuid: validJourneyUuid,
        errorCode: 'J_L_InconsistentChronology',
        version: 1,
        level: 'error',
        message: 'Journey chronology is inconsistent',
        ignore: false
    };

    it.each<ChronologyCase>([
        {
            title: 'forward times on the same day',
            visitedPlaces: [
                { sequence: 1, startTime: 28800, endTime: 32400 },
                { sequence: 2, startTime: 32400, endTime: 36000 }
            ],
            shouldError: false
        },
        {
            title: 'equal arrival and departure at a visited place',
            visitedPlaces: [{ sequence: 1, startTime: 28800, endTime: 28800 }],
            shouldError: false
        },
        {
            title: 'equal handoff between visited places',
            visitedPlaces: [
                { sequence: 1, endTime: 32400 },
                { sequence: 2, startTime: 32400 }
            ],
            shouldError: false
        },
        {
            title: 'missing times are skipped',
            visitedPlaces: [{ sequence: 1 }, { sequence: 2 }],
            shouldError: false
        },
        {
            title: 'time periods alone are not compared',
            visitedPlaces: [{ sequence: 1, startTimePeriod: 'am', endTimePeriod: 'pm' }],
            shouldError: false
        },
        {
            title: 'first visited place has no arrival',
            visitedPlaces: [
                { sequence: 1, endTime: 28800 },
                { sequence: 2, startTime: 32400, endTime: 36000 }
            ],
            shouldError: false
        },
        {
            title: 'last visited place has no departure',
            visitedPlaces: [
                { sequence: 1, startTime: 28800, endTime: 32400 },
                { sequence: 2, startTime: 36000 }
            ],
            shouldError: false
        },
        {
            title: 'overnight with dates',
            visitedPlaces: [
                { sequence: 1, startTime: 82800, endTime: 82800, startDate: '2024-06-01', endDate: '2024-06-01' },
                { sequence: 2, startTime: 3600, startDate: '2024-06-02', endDate: '2024-06-02' }
            ],
            shouldError: false
        },
        {
            title: 'overnight as seconds past midnight of the assigned day',
            visitedPlaces: [
                { sequence: 1, endTime: 82800 },
                { sequence: 2, startTime: 90000 }
            ],
            shouldError: false
        },
        { title: 'no visited places', shouldError: false },
        { title: 'empty visited places', visitedPlaces: [], shouldError: false },
        {
            title: 'duplicate sequences skip the consecutive check',
            visitedPlaces: [
                { sequence: 1, endTime: 36000 },
                { sequence: 1, startTime: 10000 }
            ],
            shouldError: false
        },
        {
            title: 'sequence gaps skip the consecutive check',
            visitedPlaces: [
                { sequence: 1, endTime: 36000 },
                { sequence: 3, startTime: 32400 }
            ],
            shouldError: false
        },
        {
            title: 'out-of-order sequences skip the consecutive check',
            visitedPlaces: [
                { sequence: 2, startTime: 32400, endTime: 36000 },
                { sequence: 1, startTime: 28800, endTime: 32400 }
            ],
            shouldError: false
        },
        {
            title: 'visited place left before it was reached',
            visitedPlaces: [{ sequence: 1, startTime: 32400, endTime: 28800 }],
            shouldError: true
        },
        {
            title: 'next visited place reached before the previous one was left',
            visitedPlaces: [
                { sequence: 1, endTime: 36000 },
                { sequence: 2, startTime: 32400 }
            ],
            shouldError: true
        },
        {
            title: 'overnight without dates looks backward',
            visitedPlaces: [
                { sequence: 1, endTime: 82800 },
                { sequence: 2, startTime: 3600 }
            ],
            shouldError: true
        },
        {
            title: 'end date before start date at a visited place',
            visitedPlaces: [
                {
                    sequence: 1,
                    startTime: 10000,
                    endTime: 20000,
                    startDate: '2024-06-02',
                    endDate: '2024-06-01'
                }
            ],
            shouldError: true
        },
        {
            title: 'intra-visited-place error still reported when sequences are invalid',
            visitedPlaces: [
                { sequence: 1, startTime: 20000, endTime: 10000 },
                { sequence: 1, startTime: 10000, endTime: 20000 }
            ],
            shouldError: true
        },
        {
            title: 'trip ends before it starts',
            visitedPlaces: [{ sequence: 1, startTime: 10000, endTime: 20000 }],
            trips: [{ startTime: 20000, endTime: 10000 }],
            shouldError: true
        },
        {
            title: 'trip ends before it starts without visited places',
            trips: [{ startTime: 20000, endTime: 10000 }],
            shouldError: true
        },
        {
            title: 'trip times agree with connected visited places',
            visitedPlaces: [
                { sequence: 1, startTime: 28800, endTime: 32400 },
                { sequence: 2, startTime: 36000, endTime: 43200 }
            ],
            trips: [
                {
                    startTime: 32400,
                    endTime: 36000,
                    originSequence: 1,
                    destinationSequence: 2
                }
            ],
            shouldError: false
        },
        {
            title: 'trip starts before the previous visited place ends',
            visitedPlaces: [
                { sequence: 1, startTime: 28800, endTime: 36000 },
                { sequence: 2, startTime: 40000, endTime: 43200 }
            ],
            trips: [
                {
                    startTime: 32400,
                    endTime: 40000,
                    originSequence: 1,
                    destinationSequence: 2
                }
            ],
            shouldError: true
        },
        {
            title: 'trip ends after the next visited place starts',
            visitedPlaces: [
                { sequence: 1, startTime: 28800, endTime: 32400 },
                { sequence: 2, startTime: 36000, endTime: 43200 }
            ],
            trips: [
                {
                    startTime: 32400,
                    endTime: 40000,
                    originSequence: 1,
                    destinationSequence: 2
                }
            ],
            shouldError: true
        }
    ])('$title', ({ visitedPlaces, trips, shouldError }) => {
        const createdVisitedPlaces = makeVisitedPlaces(visitedPlaces);
        const context = createContextWithJourney(
            {
                visitedPlaces: createdVisitedPlaces,
                trips: makeTrips(trips, createdVisitedPlaces)
            },
            validJourneyUuid
        );

        const result = journeyAuditChecks.J_L_InconsistentChronology(context);

        if (shouldError) {
            expect(result).toMatchObject(expectedError);
        } else {
            expect(result).toBeUndefined();
        }
    });
});
