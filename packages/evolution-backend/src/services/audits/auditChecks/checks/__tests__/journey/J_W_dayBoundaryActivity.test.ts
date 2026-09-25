/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import type { VisitedPlace } from 'evolution-common/lib/services/baseObjects/VisitedPlace';
import { journeyAuditChecks } from '../../JourneyAuditChecks';
import { createContextWithJourney } from './testHelper';

const places = (activities: Array<string | undefined>): VisitedPlace[] =>
    activities.map((activity) => ({ activity }) as VisitedPlace);

const journeyUuid = uuidV4();

const warning = (errorCode: string, message: string) => ({
    objectType: 'journey',
    objectUuid: journeyUuid,
    errorCode,
    version: 1,
    level: 'warning',
    message,
    ignore: false
});

describe('J_W_DepartureOfDayNotHomeOrCompatibleActivity and J_W_ArrivalOfDayNotHomeOrCompatibleActivity', () => {
    test.each([
        { description: 'home then shopping', activities: ['home', 'shopping'], closed: true, departure: false, arrival: true },
        {
            description: 'home then shopping, journey not closed',
            activities: ['home', 'shopping'],
            closed: false,
            departure: false,
            arrival: false
        },
        { description: 'shopping then home', activities: ['shopping', 'home'], departure: true, arrival: false },
        {
            description: 'tourism overnight',
            activities: ['leisureTourism', 'leisureTourism'],
            departure: false,
            arrival: false
        },
        { description: 'restaurant', activities: ['restaurant'], departure: false, arrival: false },
        { description: 'usual work', activities: ['workUsual'], departure: false, arrival: false },
        { description: 'hotel for work', activities: ['workNotUsual'], departure: false, arrival: false },
        { description: 'secondary home', activities: ['secondaryHome'], departure: false, arrival: false },
        { description: 'visiting', activities: ['visiting'], departure: false, arrival: false },
        { description: 'other parent home', activities: ['otherParentHome'], departure: false, arrival: false },
        { description: 'missing activity', activities: [undefined, 'home'], departure: false, arrival: false },
        { description: 'no visited place', activities: [], departure: false, arrival: false },
        { description: 'usual school at the end', activities: ['home', 'schoolUsual'], closed: true, departure: false, arrival: false },
        { description: 'non-usual school at the start', activities: ['schoolNotUsual', 'home'], departure: false, arrival: false }
    ])('J_W_Departure/ArrivalOfDayNotHomeOrCompatibleActivity: $description', ({ activities, closed, departure, arrival }) => {
        const context = createContextWithJourney(
            { visitedPlaces: places(activities), isJourneyClosed: closed },
            journeyUuid
        );

        const departureResult = journeyAuditChecks.J_W_DepartureOfDayNotHomeOrCompatibleActivity(context);
        const arrivalResult = journeyAuditChecks.J_W_ArrivalOfDayNotHomeOrCompatibleActivity(context);

        if (departure) {
            expect(departureResult).toEqual(
                warning(
                    'J_W_DepartureOfDayNotHomeOrCompatibleActivity',
                    'Activity at start of journey is not home or a compatible activity'
                )
            );
        } else {
            expect(departureResult).toBeUndefined();
        }
        if (arrival) {
            expect(arrivalResult).toEqual(
                warning(
                    'J_W_ArrivalOfDayNotHomeOrCompatibleActivity',
                    'Activity at end of journey is not home or a compatible activity'
                )
            );
        } else {
            expect(arrivalResult).toBeUndefined();
        }
    });
});

describe('J_W_SchoolActivityAtStartOfJourney and J_W_SchoolActivityAtEndOfJourney', () => {
    test.each([
        {
            description: 'usual school at the end',
            activities: ['home', 'schoolUsual'],
            closed: true,
            departure: false,
            arrival: true
        },
        {
            description: 'usual school at the end, journey not closed',
            activities: ['home', 'schoolUsual'],
            closed: false,
            departure: false,
            arrival: false
        },
        {
            description: 'non-usual school at the start',
            activities: ['schoolNotUsual', 'home'],
            departure: true,
            arrival: false
        },
        {
            description: 'school in the middle',
            activities: ['home', 'schoolUsual', 'home'],
            departure: false,
            arrival: false
        },
        { description: 'shopping', activities: ['shopping'], closed: true, departure: false, arrival: false }
    ])('J_W_SchoolActivityAtStart/EndOfJourney: $description', ({ activities, closed, departure, arrival }) => {
        const context = createContextWithJourney(
            { visitedPlaces: places(activities), isJourneyClosed: closed },
            journeyUuid
        );
        const departureResult = journeyAuditChecks.J_W_SchoolActivityAtStartOfJourney(context);
        const arrivalResult = journeyAuditChecks.J_W_SchoolActivityAtEndOfJourney(context);

        if (departure) {
            expect(departureResult).toEqual(
                warning('J_W_SchoolActivityAtStartOfJourney', 'School activity at the start of the journey')
            );
        } else {
            expect(departureResult).toBeUndefined();
        }
        if (arrival) {
            expect(arrivalResult).toEqual(
                warning('J_W_SchoolActivityAtEndOfJourney', 'School activity at the end of the journey')
            );
        } else {
            expect(arrivalResult).toBeUndefined();
        }
    });
});
