/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _cloneDeep from 'lodash/cloneDeep';
import each from 'jest-each';
import * as odHelpers from '../../../../odSurvey/helpers';
import { interviewAttributesForTestCases, setActiveSurveyObjects } from '../../../../../tests/surveys';
import { getResponse, setResponse } from '../../../../../utils/helpers';
import * as helpers from '../helpers';
import type { Journey, Person, Segment, UserInterviewAttributes } from '../../../types';
import { modeValues, Mode, defaultModePreToModeMap } from '../../../../odSurvey/types';

describe('getPreviousTripSingleSegment', () => {

    test('No previous trips', () => {
        // Prepare test data
        const interview = _cloneDeep(interviewAttributesForTestCases);
        const journey = interview.response.household!.persons!.personId1.journeys!.journeyId1;
        const trip = journey.trips!.tripId1P1;

        // Test the function
        expect(helpers.getPreviousTripSingleSegment({ journey, trip })).toBeUndefined();
    });

    test('Previous trip, but no segments', () => {
        // Prepare test data
        const interview = _cloneDeep(interviewAttributesForTestCases);
        const journey = interview.response.household!.persons!.personId1.journeys!.journeyId1;
        const trip = journey.trips!.tripId2P1;

        // Test the function
        expect(helpers.getPreviousTripSingleSegment({ journey, trip })).toBeUndefined();
    });

    test('Previous trip, one segment', () => {
        // Prepare test data, trip 2 of person 2 as trip 1 has a single mode
        const interview = _cloneDeep(interviewAttributesForTestCases);
        const journey = interview.response.household!.persons!.personId2.journeys!.journeyId2;
        const trip = journey.trips!.tripId2P2;

        // Test the function
        expect(helpers.getPreviousTripSingleSegment({ journey, trip })).toEqual(journey.trips!.tripId1P2.segments!.segmentId1P2T1);
    });

    test('Previous trip, multiple segments', () => {
        // Prepare test data, trip 3 of person 2 as trip 2 has 2 modes
        const interview = _cloneDeep(interviewAttributesForTestCases);
        const journey = interview.response.household!.persons!.personId2.journeys!.journeyId2;
        const trip = journey.trips!.tripId3P2;

        // Test the function
        expect(helpers.getPreviousTripSingleSegment({ journey, trip })).toBeUndefined();
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

    const path = 'household.persons.personId1.journeys.journeyId1.trips.tripId2P1.segments.segmentId1P1T2';

    test('Segment is not new, but simple chain', () => {
        // Prepare interview data, setting segment as not new
        const testInterview = _cloneDeep(baseTestInterview);
        setResponse(testInterview, path + '._isNew', false);

        // Test conditional
        const result = helpers.shouldShowSameAsReverseTripQuestion!({ interview: testInterview, path });
        expect(result).toEqual(false);
    });

    test('Segment is new, trip context does not resolve context', () => {
        // Test conditional, use an invalid path
        expect(() => helpers.shouldShowSameAsReverseTripQuestion!({ interview: baseTestInterview, path: 'invalid.path' })).toThrow('shouldShowSameAsReverseTripQuestion: segment context not found for path invalid.path');
    });

    test('Segment is new, trip not null, previousTrip is null', () => {
        // Prepare interview data, use the segment from the first trip of P1
        const interview = _cloneDeep(baseTestInterview);
        const path = 'household.persons.personId1.journeys.journeyId1.trips.tripId1P1.segments.segmentId1P1T1';
        setResponse(interview, path + '._isNew', true);

        // Test conditional
        const result = helpers.shouldShowSameAsReverseTripQuestion!({ interview, path });
        expect(result).toEqual(false);
    });

    test('Segment is new, with previous trip, not simple chain', () => {
        // Prepare interview data, take tripId2P2, it is not a simple chain
        const interview = _cloneDeep(baseTestInterview);
        const path = 'household.persons.personId2.journeys.journeyId2.trips.tripId2P2.segments.segmentId1P2T2';
        setActiveSurveyObjects(interview, { personId: 'personId2', journeyId: 'journeyId2', activeTripId: 'tripId2P2' });
        
        setResponse(interview, path + '._isNew', true);

        // Test conditional
        const result = helpers.shouldShowSameAsReverseTripQuestion!({ interview, path });
        expect(result).toEqual(false);
    });

    test('Segment is new, simple chain', () => {
        // Test conditional
        const result = helpers.shouldShowSameAsReverseTripQuestion!({ interview: baseTestInterview, path });
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
        const segmentConfig = { type: 'segments' as const, enabled: false };
        const filteredModes = helpers.getFilteredModes(segmentConfig);
        expect(filteredModes).toEqual([]);
    });

    test('getFilteredModes should return all modes when section is enabled but has no other configuration', () => {
        const segmentConfig = { type: 'segments' as const, enabled: true };
        const filteredModes = helpers.getFilteredModes(segmentConfig);
        expect(filteredModes).toEqual(modeValues);
    });

    test('getFilteredModes should filter with modesIncludeOnly and keep entered order', () => {
        const segmentConfig = {
            type: 'segments' as const,
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
            type: 'segments' as const,
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
            type: 'segments' as const,
            enabled: true,
            modesIncludeOnly: ['walk', 'bicycle', 'nonExistentMode' as any] as any
        };
        const filteredModes = helpers.getFilteredModes(segmentConfig);

        // Should only include the valid modes
        expect(filteredModes).toEqual(['walk', 'bicycle']);
    });

    test('getFilteredModesPre should only include categories with available modes', () => {
        const segmentConfig = {
            type: 'segments' as const,
            enabled: true,
            modesIncludeOnly: ['walk', 'bicycle', 'bicycleElectric'] as Mode[]
        };
        const availableModes = ['walk', 'bicycle', 'bicycleElectric'] as Mode[];
        const filteredModesPre = helpers.getFilteredModesPre(segmentConfig, availableModes);

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
        const segmentConfig = {
            type: 'segments' as const,
            enabled: true,
            modesIncludeOnly: ['transitBus', 'walk'] as Mode[]
        };
        const availableModes = ['transitBus', 'walk'] as Mode[];
        const filteredModesPre = helpers.getFilteredModesPre(segmentConfig, availableModes);

        // Should include transit because transitBus is available
        expect(filteredModesPre).toContain('transit');
        expect(filteredModesPre).toContain('walk');
        expect(filteredModesPre).not.toContain('carDriver');
        expect(filteredModesPre.length).toEqual(2);
    });

    test('getFilteredModesPre should handle modes that belong to multiple categories', () => {
        const segmentConfig = {
            type: 'segments' as const,
            enabled: true,
            modesIncludeOnly: ['wheelchair', 'mobilityScooter'] as Mode[]
        };
        const availableModes = ['wheelchair', 'mobilityScooter'] as Mode[];
        const filteredModesPre = helpers.getFilteredModesPre(segmentConfig, availableModes);

        // wheelchair and mobilityScooter belong to both 'walk' and 'other'
        expect(filteredModesPre).toContain('walk');
        expect(filteredModesPre).toContain('other');
        expect(filteredModesPre).not.toContain('transit');
        expect(filteredModesPre).not.toContain('carDriver');
        expect(filteredModesPre.length).toEqual(2);
    });

    test('getFilteredModesPre should use the modeCategoryToModeMap when available', () => {
        const segmentConfig = {
            type: 'segments' as const,
            enabled: true,
            modesIncludeOnly: ['wheelchair', 'mobilityScooter'] as Mode[],
            modeCategoryToModeMap: {
                active: {
                    modes: ['walk', 'bicycle'] as Mode[]
                },
                personal: {
                    modes: ['carDriver', 'carPassenger'] as Mode[],
                    label: 'segments:myLabel'
                },
                public: {
                    modes: ['transitRRT', 'transitHSR'] as Mode[],
                    icon: 'transitRRT' as Mode,
                },
                other: {
                    modes: ['plane', 'transitBus'] as Mode[]
                }
            }
        };
        const availableModes = ['walk', 'bicycle', 'transitRRT', 'transitHSR', 'plane', 'carDriver', 'carPassenger'] as Mode[];
        const filteredModesPre = helpers.getFilteredModesPre(segmentConfig, availableModes);

        expect(filteredModesPre).toEqual(['active', 'personal', 'public', 'other']);
    });

    test('getFilteredModesPre should use the modeCategoryToModeMap when available, returning only categories with modes', () => {
        const segmentConfig = {
            type: 'segments' as const,
            enabled: true,
            modesIncludeOnly: ['wheelchair', 'mobilityScooter'] as Mode[],
            modeCategoryToModeMap: {
                active: {
                    modes: ['walk', 'bicycle'] as Mode[]
                },
                personal: {
                    modes: ['carDriver', 'carPassenger'] as Mode[],
                    label: 'segments:myLabel'
                },
                public: {
                    modes: ['transitRRT', 'transitHSR'] as Mode[],
                    icon: 'transitRRT' as Mode,
                },
                other: {
                    modes: ['plane', 'transitBus'] as Mode[]
                }
            }
        };
        // Should include only active and personal
        const availableModes = ['walk', 'bicycle', 'carDriver', 'carPassenger'] as Mode[];
        const filteredModesPre = helpers.getFilteredModesPre(segmentConfig, availableModes);

        expect(filteredModesPre).toEqual(['active', 'personal']);
    });

    test('getFilteredModesPre should throw error when modes are missing from modeCategoryToModeMap', () => {
        const segmentConfig = {
            type: 'segments' as const,
            enabled: true,
            modesIncludeOnly: ['wheelchair', 'mobilityScooter'] as Mode[],
            modeCategoryToModeMap: {
                active: {
                    modes: ['walk', 'bicycle'] as Mode[]
                },
                personal: {
                    modes: ['carDriver', 'carPassenger'] as Mode[],
                    label: 'segments:myLabel'
                },
                public: {
                    modes: ['transitRRT', 'transitHSR'] as Mode[],
                    icon: 'transitRRT' as Mode,
                },
                other: {
                    modes: ['plane', 'transitBus'] as Mode[]
                }
            }
        };
        // 'dontKnow' is in no category
        const availableModes = ['walk', 'bicycle', 'carDriver', 'carPassenger', 'dontKnow'] as Mode[];

        expect(() => helpers.getFilteredModesPre(segmentConfig, availableModes)).toThrow('modeCategoryToModeMap: some modes are not part of any mapping: dontKnow');
    });

    test('getModePreToModeMap should return default if no modeCategoryToModeMap', () => {
        const segmentConfig = {
            type: 'segments' as const,
            enabled: true,
            modesIncludeOnly: ['wheelchair', 'mobilityScooter'] as Mode[],
        };
        expect(helpers.getModePreToModeMap(segmentConfig)).toEqual(defaultModePreToModeMap);
    });

    test('getModePreToModeMap should return mapping from modeCategoryToModeMap', () => {
        const segmentConfig = {
            type: 'segments' as const,
            enabled: true,
            modesIncludeOnly: ['wheelchair', 'mobilityScooter'] as Mode[],
            modeCategoryToModeMap: {
                active: {
                    modes: ['walk', 'bicycle'] as Mode[]
                },
                public: {
                    modes: ['transitRRT', 'transitHSR', 'transitBus'] as Mode[],
                    icon: 'transitRRT' as Mode,
                },
                other: {
                    modes: ['plane', 'transitBus', 'walk'] as Mode[]
                }
            }
        };
        expect(helpers.getModePreToModeMap(segmentConfig)).toEqual({
            active: ['walk', 'bicycle'],
            public: ['transitRRT', 'transitHSR', 'transitBus'],
            other: ['plane', 'transitBus', 'walk']
        });
    })
});

describe('getSegmentPreviousLocation and getSegmentNextLocation', () => {
    // Use tripId2P2 of personId2 by default, which is a trip between two places defined in trip diary
    const originFeature = _cloneDeep(interviewAttributesForTestCases.response.household!.persons!.personId2.journeys!.journeyId2.visitedPlaces!.shoppingPlace1P2.geography);
    const destinationFeature = _cloneDeep(interviewAttributesForTestCases.response.household!.persons!.personId2.journeys!.journeyId2.visitedPlaces!.otherWorkPlace1P2.geography);;
    const stationFeatureCollection = {
        type: 'FeatureCollection',
        features: [{
            type: 'Feature',
            id: 'station1',
            geometry: { type: 'Point', coordinates: [2, 2] },
            properties: {}
        }, {
            type: 'Feature',
            id: 'station2',
            geometry: { type: 'Point', coordinates: [3, 2] },
            properties: {}
        }, {
            type: 'Feature',
            id: 'station3',
            geometry: { type: 'Point', coordinates: [3, 2] },
            properties: {}
        }]
    } as GeoJSON.FeatureCollection<GeoJSON.Point>;

    const fieldsWithGeojsonPoint = [
        { 
            fieldName: 'originStation', 
            type: 'fromCollection'  as const,
            featureCollection: stationFeatureCollection,
        } as const, {
            fieldName: 'junction',
            type: 'point'  as const
        } as const, {
            fieldName: 'destinationStation',
            type: 'fromCollection' as const,
            featureCollection: stationFeatureCollection
        } as const
    ];

    // Build trip segments with a few additional fields that may or may not be used in the fieldWithGeojson
    // originStation is the entry station of a segment
    // destinationStation is the exit station of a segment
    // junction is a point on the map

    // segmentOne has no data
    const segmentOne = {
        _uuid: 'segment1',
        _sequence: 1,
        _isNew: false
    } as any;
    // segmentTwo has entry/exit station
    const segmentTwo = {
        _uuid: 'segment2',
        _sequence: 2,
        _isNew: false,
        originStation: 'station1',
        destinationStation: 'station2'
    } as any;
    // segmentTwo has no data
    const segmentThree = {
        _uuid: 'segment3',
        _sequence: 3,
        _isNew: false,
    } as any;
    const makeTripWithSegments = (interview: UserInterviewAttributes) => {
        // Modify the tripId2P2 from PersonId2 to contain various segments
        const journey = interview.response.household!.persons!.personId2.journeys!.journeyId2;
        const trip = journey.trips!.tripId2P2;
        trip.segments = {
            segment1: _cloneDeep(segmentOne),
            segment2: _cloneDeep(segmentTwo),
            segment3: _cloneDeep(segmentThree)
        }

        return { journey, trip };
    };

    each([
        {
            description: 'first segment',
            expected: originFeature,
            currentSegment: segmentOne
        },
        {
            description: 'last segment',
            expected: originFeature,
            currentSegment: segmentThree
        },
        {
            description: 'home location if origin is home',
            expected: interviewAttributesForTestCases.response.home?.geography,
            currentSegment: segmentOne,
            setup: (interview) => {
                // Use tripId1P2 with home as origin geography and set its segments
                const tripWithHomeAsOrigin = interview.response.household.persons!.personId2.journeys!.journeyId2.trips!.tripId1P2;
                tripWithHomeAsOrigin.segments = {
                    [segmentOne._uuid]: _cloneDeep(segmentOne)
                };
                return { trip: tripWithHomeAsOrigin, journey: interview.response.household.persons!.personId2.journeys!.journeyId2 }
            }
        }
    ]).test('getSegmentPreviousLocation: Uses the trip origin when fieldsWithGeojsonPoint is not configured: $description', ({ currentSegment, expected, setup }) => {
        const interview = _cloneDeep(interviewAttributesForTestCases);
        const { journey, trip } = setup ? setup(interview) : makeTripWithSegments(interview);

        helpers.initializeSegmentSectionHelpers({ type: 'segments', enabled: true });

        const result = helpers.getSegmentPreviousLocation({ segment: currentSegment, trip, journey, interview, person: interview.response.household!.persons!.personId2 })
        expect(result).toEqual(expected);
    });

    each([
        {
            description: 'first segment',
            expected: destinationFeature,
            currentSegment: segmentOne
        },
        {
            description: 'last segment',
            expected: destinationFeature,
            currentSegment: segmentThree
        },
        {
            description: 'home location if origin is home',
            expected: interviewAttributesForTestCases.response.home?.geography,
            currentSegment: segmentOne,
            setup: (interview) => {
                // Use tripId3P2 with home as destination geography and set its segments
                const tripWithHomeAsDestination = interview.response.household.persons!.personId2.journeys!.journeyId2.trips!.tripId3P2;
                tripWithHomeAsDestination.segments = {
                    [segmentOne._uuid]: _cloneDeep(segmentOne)
                };
                return { trip: tripWithHomeAsDestination, journey: interview.response.household.persons!.personId2.journeys!.journeyId2 }
            }
        }
    ]).test('getSegmentNextLocation: Uses the trip destination when fieldsWithGeojsonPoint is not configured: $description', ({ currentSegment, expected, setup }) => {
        const interview = _cloneDeep(interviewAttributesForTestCases);
        const { journey, trip } = setup ? setup(interview) : makeTripWithSegments(interview);
        helpers.initializeSegmentSectionHelpers({ type: 'segments', enabled: true });

        const result = helpers.getSegmentNextLocation({ segment: currentSegment, trip, journey, interview, person: interview.response.household!.persons!.personId2 })
        expect(result).toEqual(expected);
    });

    each([
        {
            description: 'use origin for first segment',
            expected: originFeature,
            currentSegmentUuid: segmentOne._uuid
        },
        {
            description: 'Use previous segment\'s destination station when set',
            expected: stationFeatureCollection.features.find(feature => feature.id === segmentTwo.destinationStation),
            currentSegmentUuid: segmentThree._uuid
        },
        {
            description: 'use location of the previous segment that has one',
            expected: stationFeatureCollection.features.find(feature => feature.id === segmentTwo.destinationStation),
            setup: (interview) => {
                // Put segmentTwo at the first position, so that last 2 segments do not have location data
                const { journey, trip } = makeTripWithSegments(interview);
                trip.segments!.segment2._sequence = 1;
                trip.segments!.segment3._sequence = 2;
                return { journey, trip }
            },
            currentSegmentUuid: segmentThree._uuid
        },
        {
            description: 'return trip origin when previous segments do not have location',
            expected: originFeature,
            currentSegmentUuid: segmentTwo._uuid
        },
        {
            description: 'use point if it exists',
            expected: { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [50, 50] } },
            setup: (interview) => {
                // let segment2 have junction instead of stations
                const { journey, trip } = makeTripWithSegments(interview);
                delete (trip.segments!.segment2 as any).originStation;
                delete (trip.segments!.segment2 as any).destinationStation;
                (trip.segments!.segment2 as any).junction = { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [50, 50] } };
                return { journey, trip };
            },
            currentSegmentUuid: segmentThree._uuid
        },
        {
            description: 'return home location if trip origin',
            expected: interviewAttributesForTestCases.response.home?.geography,
            setup: (interview) => {
                // Use tripId1P2 with home as origin geography and set its segments
                const tripWithHomeAsOrigin = interview.response.household.persons!.personId2.journeys!.journeyId2.trips!.tripId1P2;
                tripWithHomeAsOrigin.segments = {
                    [segmentOne._uuid]: _cloneDeep(segmentOne)
                };
                return { trip: tripWithHomeAsOrigin, journey: interview.response.household.persons!.personId2.journeys!.journeyId2 };
            },
            currentSegmentUuid: segmentOne._uuid
        }
    ]).test('getSegmentPreviousLocation: Find correct origin when fieldsWithGeojsonPoint are configured: $description', ({ currentSegmentUuid, expected, setup }) => {
        // Initialize journey and trips
        const interview = _cloneDeep(interviewAttributesForTestCases);
        const { journey, trip } = setup ? setup(interview) : makeTripWithSegments(interview);
        helpers.initializeSegmentSectionHelpers({ type: 'segments', enabled: true, fieldsWithGeojsonPoint });
        
        // Get the current segment
        const currentSegment = trip.segments[currentSegmentUuid];
        
        // Get segment destination
        const result = helpers.getSegmentPreviousLocation({ segment: currentSegment, trip, journey, interview, person: interview.response.household!.persons!.personId2 })
        expect(result).toEqual(expected);
    });

    each([
        {
            description: 'use destination for last segment',
            expected: destinationFeature,
            currentSegmentUuid: segmentThree._uuid
        },
        {
            description: 'Use next segment\'s origin station when set',
            expected: stationFeatureCollection.features.find(feature => feature.id === segmentTwo.originStation),
            currentSegmentUuid: segmentOne._uuid
        },
        {
            description: 'use location of the next segment that has one',
            expected: stationFeatureCollection.features.find(feature => feature.id === segmentTwo.originStation),
            setup: (interview) => {
                // Put segmentTwo at the last position, so that first 2 segments do not have location data
                const { journey, trip } = makeTripWithSegments(interview);
                trip.segments!.segment2._sequence = 3;
                trip.segments!.segment3._sequence = 2;
                return { journey, trip }
            },
            currentSegmentUuid: segmentOne._uuid
        },
        {
            description: 'return trip destination when next segments do not have location',
            expected: destinationFeature,
            currentSegmentUuid: segmentTwo._uuid
        },
        {
            description: 'use point if it exists',
            expected: { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [50, 50] } },
            setup: (interview) => {
                // let segment2 have junction instead of stations
                const { journey, trip } = makeTripWithSegments(interview);
                delete (trip.segments!.segment2 as any).originStation;
                delete (trip.segments!.segment2 as any).destinationStation;
                (trip.segments!.segment2 as any).junction = { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [50, 50] } };
                return { journey, trip }
            },
            currentSegmentUuid: segmentOne._uuid
        },
        {
            description: 'return home location if next destination',
            expected: interviewAttributesForTestCases.response.home?.geography,
            setup: (interview) => {
                // Use tripId3P2 with home as destination geography and set its segments
                const tripWithHomeAsDestination = interview.response.household.persons!.personId2.journeys!.journeyId2.trips!.tripId3P2;
                tripWithHomeAsDestination.segments = {
                    [segmentOne._uuid]: _cloneDeep(segmentOne)
                };
                return { trip: tripWithHomeAsDestination, journey: interview.response.household.persons!.personId2.journeys!.journeyId2 }
            },
            currentSegmentUuid: segmentOne._uuid
        }
    ]).test('getSegmentNextLocation: Find correct destination when fieldsWithGeojsonPoint are configured: $description', ({ currentSegmentUuid, expected, setup }) => {
        // Initialize journey and trips
        const interview = _cloneDeep(interviewAttributesForTestCases);
        const { journey, trip } = setup ? setup(interview) : makeTripWithSegments(interview);
        helpers.initializeSegmentSectionHelpers({ type: 'segments', enabled: true, fieldsWithGeojsonPoint });
        
        // Get the current segment
        const currentSegment = trip.segments[currentSegmentUuid];
        
        // Get segment destination
        const result = helpers.getSegmentNextLocation({ segment: currentSegment, trip, journey, interview, person: interview.response.household!.persons!.personId2 })
        expect(result).toEqual(expected);
    });

    test('getCurrentSegmentOriginLocation: return null when no fields configured', () => {
        const interview = _cloneDeep(interviewAttributesForTestCases);
        const { trip } = makeTripWithSegments(interview);
        helpers.initializeSegmentSectionHelpers({ type: 'segments', enabled: true });

        const result = helpers.getCurrentSegmentOriginLocation({ segment: trip.segments!.segment2 })
        expect(result).toEqual(null);
    });

    test('getCurrentSegmentDestinationLocation: return null when no fields configured', () => {
        const interview = _cloneDeep(interviewAttributesForTestCases);
        const { trip } = makeTripWithSegments(interview);
        helpers.initializeSegmentSectionHelpers({ type: 'segments', enabled: true });

        const result = helpers.getCurrentSegmentDestinationLocation({ segment: trip.segments!.segment2 })
        expect(result).toEqual(null);
    });

    each([
        {
            description: 'use originStation for current segment origin when available',
            expected: stationFeatureCollection.features.find(feature => feature.id === segmentTwo.originStation),
            currentSegmentUuid: segmentTwo._uuid
        },
        {
            description: 'use the first available field for current segment origin',
            expected: { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [50, 50] } },
            setup: (interview) => {
                const { journey, trip } = makeTripWithSegments(interview);
                delete (trip.segments!.segment2 as any).originStation;
                delete(trip.segments!.segment2 as any).destinationStation;
                (trip.segments!.segment2 as any).junction = { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [50, 50] } };
                return { journey, trip };
            },
            currentSegmentUuid: segmentTwo._uuid
        },
        {
            description: 'return null when current segment has no matching geojson fields and no previous segments',
            expected: null,
            currentSegmentUuid: segmentOne._uuid
        },
        {
            description: 'return null when current segment has no matching geojson fields, even with previous segments',
            expected: null,
            currentSegmentUuid: segmentThree._uuid
        }
    ]).test('getCurrentSegmentOriginLocation: Find correct origin for the current segment when fieldsWithGeojsonPoint are configured: $description', ({ currentSegmentUuid, expected, setup }) => {
        // Initialize journey and trips
        const interview = _cloneDeep(interviewAttributesForTestCases);
        const { journey, trip } = setup ? setup(interview) : makeTripWithSegments(interview);
        helpers.initializeSegmentSectionHelpers({ type: 'segments', enabled: true, fieldsWithGeojsonPoint });

        const currentSegment = trip.segments[currentSegmentUuid];
        const result = helpers.getCurrentSegmentOriginLocation({ segment: currentSegment });

        expect(result).toEqual(expected);
    });

    each([
        {
            description: 'use destinationStation for current segment destination when available',
            expected: stationFeatureCollection.features.find(feature => feature.id === segmentTwo.destinationStation),
            currentSegmentUuid: segmentTwo._uuid
        },
        {
            description: 'use the last available field for current segment destination if destinationStation is missing',
            expected: { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [50, 50] } },
            setup: (interview) => {
                const { journey, trip } = makeTripWithSegments(interview);
                delete (trip.segments!.segment2 as any).destinationStation;
                (trip.segments!.segment2 as any).junction = { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [50, 50] } };
                return { journey, trip };
            },
            currentSegmentUuid: segmentTwo._uuid
        },
        {
            description: 'return null when current segment has no matching geojson fields, even with next segments',
            expected: null,
            currentSegmentUuid: segmentOne._uuid
        },
        {
            description: 'return null when current segment has no matching geojson fields and no next segment',
            expected: null,
            currentSegmentUuid: segmentOne._uuid
        }
    ]).test('getCurrentSegmentDestinationLocation: Find correct destination for the current segment when fieldsWithGeojsonPoint are configured: $description', ({ currentSegmentUuid, expected, setup }) => {
        // Initialize journey and trips
        const interview = _cloneDeep(interviewAttributesForTestCases);
        const { trip } = setup ? setup(interview) : makeTripWithSegments(interview);
        helpers.initializeSegmentSectionHelpers({ type: 'segments', enabled: true, fieldsWithGeojsonPoint });

        const currentSegment = trip.segments[currentSegmentUuid];
        const result = helpers.getCurrentSegmentDestinationLocation({ segment: currentSegment });

        expect(result).toEqual(expected);
    });

});
