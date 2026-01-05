/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _cloneDeep from 'lodash/cloneDeep';
import each from 'jest-each';
import * as odHelpers from '../../../../odSurvey/helpers';
import { interviewAttributesForTestCases } from '../../../../../tests/surveys';
import { getResponse, setResponse } from '../../../../../utils/helpers';
import * as helpers from '../helpers';
import { Journey, Person } from '../../../types';
import { modeValues, modePreValues, Mode } from '../../../../odSurvey/types';

describe('getPreviousTripSingleSegment', () => {

    test('No active trip', () => {
        // Prepare test data
        const interview = _cloneDeep(interviewAttributesForTestCases);
        interview.response._activePersonId = 'personId1';
        interview.response._activeJourneyId = 'journeyId1';
        interview.response._activeTripId = undefined;

        // Get person and test the function
        const person = odHelpers.getPerson({ interview }) as Person;
        expect(helpers.getPreviousTripSingleSegment({ interview, person })).toBeUndefined();
    });

    test('No active journey', () => {
        // Prepare test data
        const interview = _cloneDeep(interviewAttributesForTestCases);
        interview.response._activePersonId = 'personId1';
        interview.response._activeJourneyId = undefined;
        interview.response._activeTripId = 'tripId1P1';

        // Get person and test the function
        const person = odHelpers.getPerson({ interview }) as Person;
        expect(helpers.getPreviousTripSingleSegment({ interview, person })).toBeUndefined();
    });

    test('No previous trips', () => {
        // Prepare test data
        const interview = _cloneDeep(interviewAttributesForTestCases);
        interview.response._activePersonId = 'personId1';
        interview.response._activeJourneyId = 'journeyId1';
        interview.response._activeTripId = 'tripId1P1';

        // Get person and test the function
        const person = odHelpers.getPerson({ interview }) as Person;
        expect(helpers.getPreviousTripSingleSegment({ interview, person })).toBeUndefined();
    });

    test('Previous trip, but no segments', () => {
        // Prepare test data
        const interview = _cloneDeep(interviewAttributesForTestCases);
        interview.response._activePersonId = 'personId1';
        interview.response._activeJourneyId = 'journeyId1';
        interview.response._activeTripId = 'tripId2P1';

        // Get person and test the function
        const person = odHelpers.getPerson({ interview }) as Person;
        expect(helpers.getPreviousTripSingleSegment({ interview, person })).toBeUndefined();
    });

    test('Previous trip, one segment', () => {
        // Prepare test data, trip 2 of person 2 as trip 1 has a single mode
        const interview = _cloneDeep(interviewAttributesForTestCases);
        interview.response._activePersonId = 'personId2';
        interview.response._activeJourneyId = 'journeyId2';
        interview.response._activeTripId = 'tripId2P2';

        // Get person and test the function
        const person = odHelpers.getPerson({ interview }) as Person;
        expect(helpers.getPreviousTripSingleSegment({ interview, person })).toEqual(interview.response.household!.persons!.personId2.journeys!.journeyId2.trips!.tripId1P2.segments!.segmentId1P2T1);
    });

    test('Previous trip, multiple segments', () => {
        // Prepare test data, trip 3 of person 2 as trip 2 has 2 modes
        const interview = _cloneDeep(interviewAttributesForTestCases);
        interview.response._activePersonId = 'personId2';
        interview.response._activeJourneyId = 'journeyId2';
        interview.response._activeTripId = 'tripId3P2';

        // Get person and test the function
        const person = odHelpers.getPerson({ interview }) as Person;
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
        interview.response._activePersonId = 'personId3';
        interview.response._activeJourneyId = 'journeyId3';
        interview.response._activeTripId = 'tripId2P3';
        setResponse(interview, pathOfValueToUndefine, undefined);
        const person = odHelpers.getPerson({ interview }) as Person;
        const journey = odHelpers.getActiveJourney({ interview, person }) as Journey;

        // Add a segment to trip1 to make sure it would return `true` if everything was right otherwise
        journey.trips!.tripId1P3.segments = {
            segmentId1P3T1: {
                _uuid: 'segmentId1P3T1',
                _sequence: 1,
                _isNew: false,
                mode: 'walk'
            }
        };

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
        interview.response._activePersonId = 'personId2';
        interview.response._activeJourneyId = 'journeyId2';
        interview.response._activeTripId = 'tripId2P2';
        const person = odHelpers.getPerson({ interview }) as Person;
        const journey = odHelpers.getActiveJourney({ interview, person }) as Journey;

        // Add a segment to trip1 with simple mode
        journey.trips!.tripId1P2.segments = {
            segmentId1P2T1: {
                _uuid: 'segmentId1P2T1',
                _sequence: 1,
                _isNew: false,
                mode: 'walk'
            }
        };

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
        interview.response._activePersonId = 'personId3';
        interview.response._activeJourneyId = 'journeyId3';
        interview.response._activeTripId = 'tripId2P3';
        const person = odHelpers.getPerson({ interview }) as Person;
        const journey = odHelpers.getActiveJourney({ interview, person }) as Journey;

        // Add a segment to trip1 with not simle mode
        journey.trips!.tripId1P3.segments = {
            segmentId1P3T1: {
                _uuid: 'segmentId1P3T1',
                _sequence: 1,
                _isNew: false,
                mode: 'transitFerry'
            }
        };

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
        interview.response._activePersonId = 'personId3';
        interview.response._activeJourneyId = 'journeyId3';
        interview.response._activeTripId = 'tripId2P3';
        const person = odHelpers.getPerson({ interview }) as Person;
        const journey = odHelpers.getActiveJourney({ interview, person }) as Journey;

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
        };

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
        interview.response._activePersonId = 'personId3';
        interview.response._activeJourneyId = 'journeyId3';
        interview.response._activeTripId = 'tripId2P3';
        const person = odHelpers.getPerson({ interview }) as Person;
        const journey = odHelpers.getActiveJourney({ interview, person }) as Journey;

        // Add a segment to trip1 with single simple mode
        journey.trips!.tripId1P3.segments = {
            segmentId1P3T1: {
                _uuid: 'segmentId1P3T1',
                _sequence: 1,
                _isNew: false,
                mode: 'walk'
            }
        };

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
        interview.response._activePersonId = 'personId3';
        interview.response._activeJourneyId = 'journeyId3';
        interview.response._activeTripId = 'tripId2P3';
        const person = odHelpers.getPerson({ interview }) as Person;
        const journey = odHelpers.getActiveJourney({ interview, person }) as Journey;

        // Add a segment to trip1 with single simple mode
        journey.trips!.tripId1P3.segments = {
            segmentId1P3T1: {
                _uuid: 'segmentId1P3T1',
                _sequence: 1,
                _isNew: false,
                mode: 'walk'
            }
        };

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
        interview.response._activePersonId = 'personId3';
        interview.response._activeJourneyId = 'journeyId3';
        interview.response._activeTripId = 'tripId2P3';
        const person = odHelpers.getPerson({ interview }) as Person;
        const journey = odHelpers.getActiveJourney({ interview, person }) as Journey;

        // Add a segment to trip1 with single simple mode
        journey.trips!.tripId1P3.segments = {
            segmentId1P3T1: {
                _uuid: 'segmentId1P3T1',
                _sequence: 1,
                _isNew: false,
                mode: 'walk'
            }
        };

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
    });
});

describe('shouldShowSameAsReverseTripQuestion', () => {

    // Prepare test data with default active person/journey/trip, tripId2P1 is return trip of a simple chain
    const baseTestInterview = _cloneDeep(interviewAttributesForTestCases);
    baseTestInterview.response._activePersonId = 'personId1';
    baseTestInterview.response._activeJourneyId = 'journeyId1';
    baseTestInterview.response._activeTripId = 'tripId2P1';
    // Add a segment for tripId1P1, with simple mode
    baseTestInterview.response.household!.persons!.personId1.journeys!.journeyId1.trips!.tripId1P1.segments = {
        segmentId1P1T1: { _isNew: false, modePre: 'walk', mode: 'walk', _uuid: 'segmentId1P1T1', _sequence: 1 }
    };

    // Add a segment for tripId2P1, tests will initialize it
    const baseTestSegment = { _uuid: 'segmentId1P1T2', _sequence: 1, _isNew: true };
    baseTestInterview.response.household!.persons!.personId1.journeys!.journeyId1.trips!.tripId2P1.segments = {
        segmentId1P1T2: baseTestSegment
    };

    test('Segment is not new, but simple chain', () => {
        // Prepare interview data, setting segment as not new
        const testSegment = _cloneDeep(baseTestSegment);
        testSegment._isNew = false;

        // Test conditional
        const result = helpers.shouldShowSameAsReverseTripQuestion!({ interview: baseTestInterview, segment: testSegment });
        expect(result).toEqual(false);
    });

    test('Segment is new, trip is null, previousTrip is null', () => {
        // Unset active trip
        const interview = _cloneDeep(baseTestInterview);
        delete interview.response._activeTripId;

        // Test conditional
        const result = helpers.shouldShowSameAsReverseTripQuestion!({ interview, segment: baseTestSegment });
        expect(result).toEqual(false);
    });

    test('Segment is new, trip not null, previousTrip is null', () => {
        // Prepare interview data, use the segment from the first trip of P1
        const interview = _cloneDeep(baseTestInterview);
        // Unset active trip
        interview.response._activeTripId = 'tripId1P1';
        setResponse(interview, 'household.persons.personId1.journeys.journeyId1.trips.tripId1P1.segments.segmentId1P1T1._isNew', true);
        const segment = getResponse(interview, 'household.persons.personId1.journeys.journeyId1.trips.tripId1P1.segments.segmentId1P1T1') as any;

        // Test conditional
        const result = helpers.shouldShowSameAsReverseTripQuestion!({ interview, segment });
        expect(result).toEqual(false);
    });

    test('Segment is new, with previous trip, not simple chain', () => {
        // Prepare interview data, take tripId2P2, it is not a simple chain
        const interview = _cloneDeep(baseTestInterview);
        interview.response._activePersonId = 'personId2';
        interview.response._activeJourneyId = 'journeyId2';
        interview.response._activeTripId = 'tripId2P2';
        setResponse(interview, 'household.persons.personId2.journeys.journeyId2.trips.tripId2P2.segments.segmentId1P2T2._isNew', true);
        const segment = getResponse(interview, 'household.persons.personId2.journeys.journeyId2.trips.tripId2P2.segments.segmentId1P2T2') as any;

        // Test conditional
        const result = helpers.shouldShowSameAsReverseTripQuestion!({ interview, segment });
        expect(result).toEqual(false);
    });

    test('Segment is new, simple chain', () => {
        // Test conditional
        const result = helpers.shouldShowSameAsReverseTripQuestion!({ interview: baseTestInterview, segment: baseTestSegment });
        expect(result).toEqual(true);
    });

});

describe('conditionalPersonMayHaveDisability', () => {

    test('Person has disability set to "yes"', () => {
        // Prepare test data
        const interview = _cloneDeep(interviewAttributesForTestCases);
        interview.response._activePersonId = 'personId1';
        setResponse(interview, 'household.persons.personId1.hasDisability', 'yes');

        // Test conditional
        const result = helpers.conditionalPersonMayHaveDisability(interview, 'household.persons.personId1');
        expect(result).toEqual(true);
    });

    test('Person has disability set to "preferNotToAnswer"', () => {
        // Prepare test data
        const interview = _cloneDeep(interviewAttributesForTestCases);
        interview.response._activePersonId = 'personId1';
        setResponse(interview, 'household.persons.personId1.hasDisability', 'preferNotToAnswer');

        // Test conditional
        const result = helpers.conditionalPersonMayHaveDisability(interview, 'household.persons.personId1');
        expect(result).toEqual(true);
    });

    test('Person has disability set to "dontKnow"', () => {
        // Prepare test data
        const interview = _cloneDeep(interviewAttributesForTestCases);
        interview.response._activePersonId = 'personId1';
        setResponse(interview, 'household.persons.personId1.hasDisability', 'dontKnow');

        // Test conditional
        const result = helpers.conditionalPersonMayHaveDisability(interview, 'household.persons.personId1');
        expect(result).toEqual(true);
    });

    test('Person has disability set to "no"', () => {
        // Prepare test data
        const interview = _cloneDeep(interviewAttributesForTestCases);
        interview.response._activePersonId = 'personId1';
        setResponse(interview, 'household.persons.personId1.hasDisability', 'no');

        // Test conditional
        const result = helpers.conditionalPersonMayHaveDisability(interview, 'household.persons.personId1');
        expect(result).toEqual(false);
    });

    test('Person has disability not set (undefined)', () => {
        // Prepare test data
        const interview = _cloneDeep(interviewAttributesForTestCases);
        interview.response._activePersonId = 'personId1';
        // hasDisability is undefined by default in test data

        // Test conditional
        const result = helpers.conditionalPersonMayHaveDisability(interview, 'household.persons.personId1');
        // FIXME When undefined, should it return true or false? There's a FIXME in OD helpers to decide this
        expect(result).toEqual(false);
    });

    test('No persons in household', () => {
        // Prepare test data
        const interview = _cloneDeep(interviewAttributesForTestCases);
        setResponse(interview, 'household.persons', {});

        // Test conditional
        const result = helpers.conditionalPersonMayHaveDisability(interview, 'path');
        expect(result).toEqual(true);
    });
});

describe('conditionalHhMayHaveDisability', () => {

    test('At least one person has disability set to "yes"', () => {
        // Prepare test data
        const interview = _cloneDeep(interviewAttributesForTestCases);
        setResponse(interview, 'household.persons.personId1.hasDisability', 'yes');
        setResponse(interview, 'household.persons.personId2.hasDisability', 'no');

        // Test conditional
        const result = helpers.conditionalHhMayHaveDisability(interview, 'path');
        expect(result).toEqual(true);
    });

    test('At least one person has disability set to "preferNotToAnswer"', () => {
        // Prepare test data
        const interview = _cloneDeep(interviewAttributesForTestCases);
        setResponse(interview, 'household.persons.personId1.hasDisability', 'no');
        setResponse(interview, 'household.persons.personId2.hasDisability', 'preferNotToAnswer');

        // Test conditional
        const result = helpers.conditionalHhMayHaveDisability(interview, 'path');
        expect(result).toEqual(true);
    });

    test('At least one person has disability set to "dontKnow"', () => {
        // Prepare test data
        const interview = _cloneDeep(interviewAttributesForTestCases);
        setResponse(interview, 'household.persons.personId1.hasDisability', 'no');
        setResponse(interview, 'household.persons.personId2.hasDisability', 'dontKnow');

        // Test conditional
        const result = helpers.conditionalHhMayHaveDisability(interview, 'path');
        expect(result).toEqual(true);
    });

    test('All persons have disability set to "no"', () => {
        // Prepare test data
        const interview = _cloneDeep(interviewAttributesForTestCases);
        setResponse(interview, 'household.persons.personId1.hasDisability', 'no');
        setResponse(interview, 'household.persons.personId2.hasDisability', 'no');
        setResponse(interview, 'household.persons.personId3.hasDisability', 'no');

        // Test conditional
        const result = helpers.conditionalHhMayHaveDisability(interview, 'path');
        expect(result).toEqual(false);
    });

    test('Multiple persons with mixed disability values', () => {
        // Prepare test data
        const interview = _cloneDeep(interviewAttributesForTestCases);
        setResponse(interview, 'household.persons.personId1.hasDisability', 'yes');
        setResponse(interview, 'household.persons.personId2.hasDisability', 'preferNotToAnswer');
        setResponse(interview, 'household.persons.personId3.hasDisability', 'no');

        // Test conditional
        const result = helpers.conditionalHhMayHaveDisability(interview, 'path');
        expect(result).toEqual(true);
    });

    test('All persons have hasDisability undefined', () => {
        // Prepare test data - hasDisability is undefined by default in test data
        const interview = _cloneDeep(interviewAttributesForTestCases);

        // Test conditional
        const result = helpers.conditionalHhMayHaveDisability(interview, 'path');
        expect(result).toEqual(false);
    });

    test('No persons in household', () => {
        // Prepare test data
        const interview = _cloneDeep(interviewAttributesForTestCases);
        setResponse(interview, 'household.persons', {});

        // Test conditional
        const result = helpers.conditionalHhMayHaveDisability(interview, 'path');
        expect(result).toEqual(false);
    });
});

describe('Mode/modePre filtering based on configuration', () => {
    test('getFilteredModes should return no mode when section is disabled', () => {
        const segmentConfig = { enabled: false };
        const filteredModes = helpers.getFilteredModes(segmentConfig);
        expect(filteredModes).toEqual([]);
    });

    test('getFilteredModes should return all modes when segmentConfig is undefined', () => {
        const filteredModes = helpers.getFilteredModes(undefined);
        expect(filteredModes).toEqual(modeValues);
    });

    test('getFilteredModes should return all modes when section is enabled but has no other configuration', () => {
        const segmentConfig = { enabled: true };
        const filteredModes = helpers.getFilteredModes(segmentConfig);
        expect(filteredModes).toEqual(modeValues);
    });

    test('getFilteredModes should filter with modesIncludeOnly and keep entered order', () => {
        const segmentConfig = {
            enabled: true,
            modesIncludeOnly: ['walk', 'bicycle', 'transitBus', 'carDriver'] as Mode[]
        };
        const filteredModes = helpers.getFilteredModes(segmentConfig);

        expect(filteredModes).toEqual(['walk', 'bicycle', 'transitBus', 'carDriver']);
        expect(filteredModes.length).toEqual(4);
        expect(filteredModes).not.toContain('carPassenger');
        expect(filteredModes).not.toContain('transitRRT');
    });

    test('getFilteredModes should filter with modesExclude', () => {
        const segmentConfig = {
            enabled: true,
            modesExclude: ['plane', 'ferryWithCar', 'snowmobile'] as Mode[]
        };
        const filteredModes = helpers.getFilteredModes(segmentConfig);

        // Should exclude those 3 modes
        expect(filteredModes.length).toBe(modeValues.length - 3);
        expect(filteredModes).not.toContain('plane');
        expect(filteredModes).not.toContain('ferryWithCar');
        expect(filteredModes).not.toContain('snowmobile');
        expect(filteredModes).toContain('walk');
        expect(filteredModes).toContain('bicycle');
    });

    test('getFilteredModes should handle modesIncludeOnly with non-existent modes', () => {
        const segmentConfig = {
            enabled: true,
            modesIncludeOnly: ['walk', 'bicycle', 'nonExistentMode' as any] as any
        };
        const filteredModes = helpers.getFilteredModes(segmentConfig);

        // Should only include the valid modes
        expect(filteredModes).toEqual(['walk', 'bicycle']);
    });

    test('getFilteredModesPre should only include categories with available modes', () => {
        const availableModes = ['walk', 'bicycle', 'bicycleElectric'] as Mode[];
        const filteredModesPre = helpers.getFilteredModesPre(availableModes);

        // Should include walk and bicycle categories
        expect(filteredModesPre).toContain('walk');
        expect(filteredModesPre).toContain('bicycle');
        expect(filteredModesPre.length).toEqual(2);
        // Should not include categories that have no available modes
        expect(filteredModesPre).not.toContain('carDriver');
        expect(filteredModesPre).not.toContain('carPassenger');
        expect(filteredModesPre).not.toContain('transit');
    });

    test('getFilteredModesPre should include transit when any transit mode is available', () => {
        const availableModes = ['transitBus', 'walk'] as Mode[];
        const filteredModesPre = helpers.getFilteredModesPre(availableModes);

        // Should include transit because transitBus is available
        expect(filteredModesPre).toContain('transit');
        expect(filteredModesPre).toContain('walk');
        expect(filteredModesPre).not.toContain('carDriver');
        expect(filteredModesPre.length).toEqual(2);
    });

    test('getFilteredModesPre should handle modes that belong to multiple categories', () => {
        const availableModes = ['wheelchair', 'mobilityScooter'] as Mode[];
        const filteredModesPre = helpers.getFilteredModesPre(availableModes);

        // wheelchair and mobilityScooter belong to both 'walk' and 'other'
        expect(filteredModesPre).toContain('walk');
        expect(filteredModesPre).toContain('other');
        expect(filteredModesPre).not.toContain('transit');
        expect(filteredModesPre).not.toContain('carDriver');
        expect(filteredModesPre.length).toEqual(2);
    });
});
