/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _cloneDeep from 'lodash/cloneDeep';
import each from 'jest-each';
import * as odHelpers from 'evolution-common/lib/services/odSurvey/helpers';
import { interviewAttributesForTestCases } from 'evolution-common/lib/tests/surveys';
import { setResponse } from 'evolution-common/lib/utils/helpers';
import * as helpers from '../helpers';
import { Journey, Person } from 'evolution-common/lib/services/interviews/interview';

describe('getPreviousTripSingleSegment', () => {

    test('No active trip', () => {
        // Prepare test data
        const interview = _cloneDeep(interviewAttributesForTestCases);
        interview.responses._activePersonId = 'personId1';
        interview.responses._activeJourneyId = 'journeyId1';
        interview.responses._activeTripId = undefined;

        // Get person and test the function
        const person = odHelpers.getPerson({interview}) as Person;
        expect(helpers.getPreviousTripSingleSegment({ interview, person })).toBeUndefined();
    });

    test('No active journey', () => {
        // Prepare test data
        const interview = _cloneDeep(interviewAttributesForTestCases);
        interview.responses._activePersonId = 'personId1';
        interview.responses._activeJourneyId = undefined;
        interview.responses._activeTripId = 'tripId1P1';

        // Get person and test the function
        const person = odHelpers.getPerson({interview}) as Person;
        expect(helpers.getPreviousTripSingleSegment({ interview, person })).toBeUndefined();
    });

    test('No previous trips', () => {
        // Prepare test data
        const interview = _cloneDeep(interviewAttributesForTestCases);
        interview.responses._activePersonId = 'personId1';
        interview.responses._activeJourneyId = 'journeyId1';
        interview.responses._activeTripId = 'tripId1P1';

        // Get person and test the function
        const person = odHelpers.getPerson({interview}) as Person;
        expect(helpers.getPreviousTripSingleSegment({ interview, person })).toBeUndefined();
    });

    test('Previous trip, but no segments', () => {
        // Prepare test data
        const interview = _cloneDeep(interviewAttributesForTestCases);
        interview.responses._activePersonId = 'personId1';
        interview.responses._activeJourneyId = 'journeyId1';
        interview.responses._activeTripId = 'tripId2P1';

        // Get person and test the function
        const person = odHelpers.getPerson({interview}) as Person;
        expect(helpers.getPreviousTripSingleSegment({ interview, person })).toBeUndefined();
    });

    test('Previous trip, one segment', () => {
        // Prepare test data, trip 2 of person 2 as trip 1 has a single mode
        const interview = _cloneDeep(interviewAttributesForTestCases);
        interview.responses._activePersonId = 'personId2';
        interview.responses._activeJourneyId = 'journeyId2';
        interview.responses._activeTripId = 'tripId2P2';

        // Get person and test the function
        const person = odHelpers.getPerson({interview}) as Person;
        expect(helpers.getPreviousTripSingleSegment({ interview, person })).toEqual(interview.responses.household!.persons!.personId2.journeys!.journeyId2.trips!.tripId1P2.segments!.segmentId1P2T1);
    });

    test('Previous trip, multiple segments', () => {
        // Prepare test data, trip 3 of person 2 as trip 2 has 2 modes
        const interview = _cloneDeep(interviewAttributesForTestCases);
        interview.responses._activePersonId = 'personId2';
        interview.responses._activeJourneyId = 'journeyId2';
        interview.responses._activeTripId = 'tripId3P2';

        // Get person and test the function
        const person = odHelpers.getPerson({interview}) as Person;
        expect(helpers.getPreviousTripSingleSegment({ interview, person })).toBeUndefined();
    });
});

describe('isSimpleChainSingleModeReturnTrip', () => {

    each([
        ['origin', 'household.persons.personId3.journeys.journeyId3.trips.tripId2P3._originVisitedPlaceUuid'],
        ['destination', 'household.persons.personId3.journeys.journeyId3.trips.tripId2P3._destinationVisitedPlaceUuid'],
        ['previous origin', 'household.persons.personId3.journeys.journeyId3.trips.tripId1P3._originVisitedPlaceUuid'],
        ['geography', 'home.geography'],
    ]).test('undefined data for %s', (_field, pathOfValueToUndefine) => {
        // Prepare test data, trip 2 of person 3 should be a simple chain
        const interview = _cloneDeep(interviewAttributesForTestCases);
        interview.responses._activePersonId = 'personId3';
        interview.responses._activeJourneyId = 'journeyId3';
        interview.responses._activeTripId = 'tripId2P3';
        setResponse(interview, pathOfValueToUndefine, undefined);
        const person = odHelpers.getPerson({interview}) as Person;
        const journey = odHelpers.getActiveJourney({interview, person }) as Journey;

        // Add a segment to trip1 to make sure it would return `true` if everything was right otherwise
        journey.trips!.tripId1P3.segments = {
            segmentId1P3T1: {
                _uuid: 'segmentId1P3T1',
                _sequence: 1,
                _isNew: false,
                mode: 'walk'
            }
        }

        expect(helpers.isSimpleChainSingleModeReturnTrip({
            interview,
            journey,
            person,
            trip: journey.trips!.tripId2P3,
            previousTrip: journey.trips!.tripId1P3
        })).toEqual(false);
    });

    test('Previous trip is not a simple chain', () => {
        // Prepare test data, trip 2 of person 2 is not a simple as it has other destinations
        const interview = _cloneDeep(interviewAttributesForTestCases);
        interview.responses._activePersonId = 'personId2';
        interview.responses._activeJourneyId = 'journeyId2';
        interview.responses._activeTripId = 'tripId2P2';
        const person = odHelpers.getPerson({interview}) as Person;
        const journey = odHelpers.getActiveJourney({interview, person }) as Journey;

        // Add a segment to trip1 with simple mode
        journey.trips!.tripId1P2.segments = {
            segmentId1P2T1: {
                _uuid: 'segmentId1P2T1',
                _sequence: 1,
                _isNew: false,
                mode: 'walk'
            }
        }

        expect(helpers.isSimpleChainSingleModeReturnTrip({
            interview,
            journey,
            person,
            trip: journey.trips!.tripId2P2,
            previousTrip: journey.trips!.tripId1P2
        })).toEqual(false);
    });

    test('Previous trip is simple chain and has single not simple mode', () => {
        // Prepare test data, trip 2 of person 3 should be a simple chain
        const interview = _cloneDeep(interviewAttributesForTestCases);
        interview.responses._activePersonId = 'personId3';
        interview.responses._activeJourneyId = 'journeyId3';
        interview.responses._activeTripId = 'tripId2P3';
        const person = odHelpers.getPerson({interview}) as Person;
        const journey = odHelpers.getActiveJourney({interview, person }) as Journey;

        // Add a segment to trip1 with not simle mode
        journey.trips!.tripId1P3.segments = {
            segmentId1P3T1: {
                _uuid: 'segmentId1P3T1',
                _sequence: 1,
                _isNew: false,
                mode: 'transitFerry'
            }
        }

        expect(helpers.isSimpleChainSingleModeReturnTrip({
            interview,
            journey,
            person,
            trip: journey.trips!.tripId2P3,
            previousTrip: journey.trips!.tripId1P3
        })).toEqual(false);
    });

    test('Previous trip is simlpe chain and has 2 simple modes', () => {
        // Prepare test data, trip 2 of person 3 should be a simple chain
        const interview = _cloneDeep(interviewAttributesForTestCases);
        interview.responses._activePersonId = 'personId3';
        interview.responses._activeJourneyId = 'journeyId3';
        interview.responses._activeTripId = 'tripId2P3';
        const person = odHelpers.getPerson({interview}) as Person;
        const journey = odHelpers.getActiveJourney({interview, person }) as Journey;

        // Add 2 segments with simple modes to trip1 with not simle mode
        journey.trips!.tripId1P3.segments = {
            segmentId1P3T1: {
                _uuid: 'segmentId1P3T1',
                _sequence: 1,
                _isNew: false,
                mode: 'walk'
            },
            segmentId2P3T1: {
                _uuid: 'segmentId2P3T1',
                _sequence: 1,
                _isNew: false,
                mode: 'bicycle'
            }
        }

        expect(helpers.isSimpleChainSingleModeReturnTrip({
            interview,
            journey,
            person,
            trip: journey.trips!.tripId2P3,
            previousTrip: journey.trips!.tripId1P3
        })).toEqual(false);
    });

    test('Previous trip is simple chain and has single simple mode', () => {
        // Prepare test data, trip 2 of person 3 should be a simple chain
        const interview = _cloneDeep(interviewAttributesForTestCases);
        interview.responses._activePersonId = 'personId3';
        interview.responses._activeJourneyId = 'journeyId3';
        interview.responses._activeTripId = 'tripId2P3';
        const person = odHelpers.getPerson({interview}) as Person;
        const journey = odHelpers.getActiveJourney({interview, person }) as Journey;

        // Add a segment to trip1 with single simple mode
        journey.trips!.tripId1P3.segments = {
            segmentId1P3T1: {
                _uuid: 'segmentId1P3T1',
                _sequence: 1,
                _isNew: false,
                mode: 'walk'
            }
        }

        expect(helpers.isSimpleChainSingleModeReturnTrip({
            interview,
            journey,
            person,
            trip: journey.trips!.tripId2P3,
            previousTrip: journey.trips!.tripId1P3
        })).toEqual(true);
    });

    test('simple chain/simple mode, but moving activity at origin', () => {
        // Prepare test data, trip 2 of person 3 should be a simple chain
        const interview = _cloneDeep(interviewAttributesForTestCases);
        interview.responses._activePersonId = 'personId3';
        interview.responses._activeJourneyId = 'journeyId3';
        interview.responses._activeTripId = 'tripId2P3';
        const person = odHelpers.getPerson({interview}) as Person;
        const journey = odHelpers.getActiveJourney({interview, person }) as Journey;

        // Add a segment to trip1 with single simple mode
        journey.trips!.tripId1P3.segments = {
            segmentId1P3T1: {
                _uuid: 'segmentId1P3T1',
                _sequence: 1,
                _isNew: false,
                mode: 'walk'
            }
        }

        // Change activity of origin to a moving one
        journey.visitedPlaces!.schoolPlace1P3.activity = 'workOnTheRoad';

        expect(helpers.isSimpleChainSingleModeReturnTrip({
            interview,
            journey,
            person,
            trip: journey.trips!.tripId2P3,
            previousTrip: journey.trips!.tripId1P3
        })).toEqual(false);
    });

    test('simple chain/simple mode, but moving activity at destination', () => {
        // Prepare test data, trip 2 of person 3 should be a simple chain
        const interview = _cloneDeep(interviewAttributesForTestCases);
        interview.responses._activePersonId = 'personId3';
        interview.responses._activeJourneyId = 'journeyId3';
        interview.responses._activeTripId = 'tripId2P3';
        const person = odHelpers.getPerson({interview}) as Person;
        const journey = odHelpers.getActiveJourney({interview, person }) as Journey;

        // Add a segment to trip1 with single simple mode
        journey.trips!.tripId1P3.segments = {
            segmentId1P3T1: {
                _uuid: 'segmentId1P3T1',
                _sequence: 1,
                _isNew: false,
                mode: 'walk'
            }
        }

        // Change activity destinations to a moving one
        journey.visitedPlaces!.homePlace1P3.activity = 'workOnTheRoad';
        journey.visitedPlaces!.homePlace2P3.activity = 'workOnTheRoad';

        expect(helpers.isSimpleChainSingleModeReturnTrip({
            interview,
            journey,
            person,
            trip: journey.trips!.tripId2P3,
            previousTrip: journey.trips!.tripId1P3
        })).toEqual(false);
    })
});

