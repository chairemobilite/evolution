/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _cloneDeep from 'lodash/cloneDeep';
import { v4 as uuidv4 } from 'uuid';

import { getSegmentsSectionConfig } from '../sectionSegments';
import { interviewAttributesForTestCases } from '../../../../../tests/surveys';
import * as utilHelpers from '../../../../../utils/helpers';
import * as odHelpers from '../../../../odSurvey/helpers';

// Mock od helpers
jest.mock('../../../../odSurvey/helpers', () => ({
    getPerson: jest.fn().mockReturnValue({}),
    getActiveJourney: jest.fn().mockReturnValue({}),
    selectNextIncompleteTrip: jest.fn().mockReturnValue(null),
    getVisitedPlacesArray: jest.fn().mockReturnValue([]),
    getTripsArray: jest.fn().mockReturnValue([]),
}));
const mockedGetPerson = odHelpers.getPerson as jest.MockedFunction<typeof odHelpers.getPerson>;
const mockedGetActiveJourney = odHelpers.getActiveJourney as jest.MockedFunction<typeof odHelpers.getActiveJourney>;
const mockedSelectNextIncompleteTrip = odHelpers.selectNextIncompleteTrip as jest.MockedFunction<typeof odHelpers.selectNextIncompleteTrip>;
const mockedGetTripsArray = odHelpers.getTripsArray as jest.MockedFunction<typeof odHelpers.getTripsArray>;
const mockedGetVisitedPlacesArray = odHelpers.getVisitedPlacesArray as jest.MockedFunction<typeof odHelpers.getVisitedPlacesArray>;

jest.mock('uuid', () => ({
    v4: jest.fn().mockReturnValue('newTripId')
}));
const mockUuidv4 = uuidv4 as jest.MockedFunction<typeof uuidv4>;

beforeEach(() => {
    jest.clearAllMocks();
});

describe('getSegmentsSectionConfig', () => {

    test('should return the correct widget config', () => {
        const widgetConfig = getSegmentsSectionConfig({});
        expect(widgetConfig).toEqual({
            previousSection: 'visitedPlaces',
            nextSection: 'travelBehavior',
            isSectionVisible: expect.any(Function),
            isSectionCompleted: expect.any(Function),
            onSectionEntry: expect.any(Function),
            template: 'tripsAndSegmentsWithMap',
            title: expect.any(Function),
            customStyle: {
                maxWidth: '120rem'
            },
            widgets: [
                'activePersonTitle',
                'buttonSwitchPerson',
                'personTripsTitle',
                'personTrips',
                'personVisitedPlacesMap',
                'buttonConfirmNextSection'
            ]
        });
    });

});

describe('getSegmentsSectionConfig labels', () => {
    const widgetConfig = getSegmentsSectionConfig({});

    test('should return the right label for title', () => {
        const mockedT = jest.fn();
        const title = widgetConfig.title;
        expect(title).toBeDefined();
        utilHelpers.translateString(title, { t: mockedT } as any, interviewAttributesForTestCases, 'path');
        expect(mockedT).toHaveBeenCalledWith(['customSurvey:segments:SegmentsTitle', 'segments:SegmentsTitle']);
    });

});

describe('getSegmentsSectionConfig isSectionVisible', () => {
    const widgetConfig = getSegmentsSectionConfig({});
    const iterationContext = ['testPerson1'];
    
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should return false if no iteration context', () => {
        const result = widgetConfig.isSectionVisible!(interviewAttributesForTestCases, undefined);
        
        expect(result).toBe(false);
        expect(mockedGetPerson).not.toHaveBeenCalled();
    });

    test('should return false if no active journey', () => {
        const testPerson = { _uuid: 'testPerson1', _sequence: 1 };
        mockedGetPerson.mockReturnValue(testPerson);
        mockedGetActiveJourney.mockReturnValue(null);
        
        const result = widgetConfig.isSectionVisible!(interviewAttributesForTestCases, iterationContext);
        
        expect(result).toBe(false);
        expect(mockedGetPerson).toHaveBeenCalledWith({ interview: interviewAttributesForTestCases, personId: testPerson._uuid });
        expect(mockedGetActiveJourney).toHaveBeenCalledWith({ interview: interviewAttributesForTestCases, person:testPerson });
    });

    test('should return true if there is an active journey', () => {
        const activePerson = { _uuid: 'testPerson1', _sequence: 1 };
        const activeJourney = { _uuid: 'journeyId1', _sequence: 1 };
        mockedGetPerson.mockReturnValue(activePerson);
        mockedGetActiveJourney.mockReturnValue(activeJourney);
        
        const result = widgetConfig.isSectionVisible!(interviewAttributesForTestCases, iterationContext);
        
        expect(result).toBe(true);
        expect(mockedGetPerson).toHaveBeenCalledWith({ interview: interviewAttributesForTestCases, personId: 'testPerson1' });
        expect(mockedGetActiveJourney).toHaveBeenCalledWith({ interview: interviewAttributesForTestCases, person: activePerson });
    });
});

describe('getSegmentsSectionConfig isSectionCompleted', () => {
    const widgetConfig = getSegmentsSectionConfig({});
    const iterationContext = ['testPerson1'];
    
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should return false if no active person', () => {
        mockedGetPerson.mockReturnValue(null);
        
        const result = widgetConfig.isSectionCompleted!(interviewAttributesForTestCases, iterationContext);
        
        expect(result).toBe(false);
        expect(mockedGetPerson).toHaveBeenCalledWith({ interview: interviewAttributesForTestCases, personId: 'testPerson1' });
    });

    test('should return false if no iteration context', () => {
        const result = widgetConfig.isSectionCompleted!(interviewAttributesForTestCases, undefined);
        
        expect(result).toBe(false);
        expect(mockedGetPerson).not.toHaveBeenCalled();
    });

    test('should return true if no next incomplete trip', () => {
        const activePerson = { _uuid: 'testPerson1', _sequence: 1 };
        const activeJourney = { _uuid: 'journeyId1', _sequence: 1 };
        mockedGetPerson.mockReturnValue(activePerson);
        mockedGetActiveJourney.mockReturnValue(activeJourney);
        mockedSelectNextIncompleteTrip.mockReturnValueOnce(null);
        
        const result = widgetConfig.isSectionCompleted!(interviewAttributesForTestCases, iterationContext);
        
        expect(result).toBe(true);
        expect(mockedGetPerson).toHaveBeenCalledWith({ interview: interviewAttributesForTestCases, personId: 'testPerson1' });
        expect(mockedGetActiveJourney).toHaveBeenCalledWith({ interview: interviewAttributesForTestCases, person: activePerson });
        expect(mockedSelectNextIncompleteTrip).toHaveBeenCalledWith({ journey: activeJourney });
    });

    test('should return false if there is a next incomplete trip', () => {
        const activePerson = { _uuid: 'testPerson1', _sequence: 1 };
        const activeJourney = { _uuid: 'journeyId1', _sequence: 1 };
        const incompleteTrip = { _uuid: 'tripId1', _sequence: 1 };
        mockedGetPerson.mockReturnValue(activePerson);
        mockedGetActiveJourney.mockReturnValue(activeJourney);
        mockedSelectNextIncompleteTrip.mockReturnValueOnce(incompleteTrip);
        
        const result = widgetConfig.isSectionCompleted!(interviewAttributesForTestCases, iterationContext);
        
        expect(result).toBe(false);
        expect(mockedGetPerson).toHaveBeenCalledWith({ interview: interviewAttributesForTestCases, personId: 'testPerson1' });
        expect(mockedGetActiveJourney).toHaveBeenCalledWith({ interview: interviewAttributesForTestCases, person: activePerson });
        expect(mockedSelectNextIncompleteTrip).toHaveBeenCalledWith({ journey: activeJourney });
    });
});

describe('getSegmentsSectionConfig onSectionEntry', () => {
    const widgetConfig = getSegmentsSectionConfig({});
    const iterationContext = ['testPerson1'];
    
    // Mock journey and person for all tests. Individual tests may override if needed
    const activeJourney = { _uuid: 'testJourney1', _sequence: 1 };
    const activePerson = { _uuid: 'testPerson1', _sequence: 1 };

    const interviewWithTestPerson = _cloneDeep(interviewAttributesForTestCases);
    interviewWithTestPerson.response.household!.persons = {
        testPerson1: {
            _uuid: 'testPerson1',
            _sequence: 1,
            journeys: {
                testJourney1: activeJourney
            }
        }
    }

    beforeEach(() => {
        jest.clearAllMocks();
        mockedGetPerson.mockReturnValue(activePerson);
        mockedGetActiveJourney.mockReturnValue(activeJourney);
    });

    test('should return undefined if no active person', () => {
        mockedGetPerson.mockReturnValue(null);
        
        const result = widgetConfig.onSectionEntry!(interviewWithTestPerson, iterationContext);
        
        expect(result).toBeUndefined();
        expect(mockedGetPerson).toHaveBeenCalledWith({ interview: interviewWithTestPerson, personId: 'testPerson1' });
    });

    test('should return undefined if no iteration context', () => {        
        const result = widgetConfig.onSectionEntry!(interviewWithTestPerson, undefined);
        
        expect(result).toBeUndefined();
        expect(mockedGetPerson).not.toHaveBeenCalled();
    });

    test('should add trips when there are no trips', () => {
        // 2 places
        const places = [
            { _uuid: 'testPlace1', _sequence: 1, activity: 'home' },
            { _uuid: 'testPlace2', _sequence: 2, activity: 'workUsual' }
        ];
        mockedGetVisitedPlacesArray.mockReturnValue(places);
        // no trips
        mockedGetTripsArray.mockReturnValue([]);
        // Should add a new trip
        mockUuidv4.mockReturnValueOnce('tripId1' as any);
        const newTrip = { _uuid: 'tripId1', _sequence: 1, _originVisitedPlaceUuid: 'testPlace1', _destinationVisitedPlaceUuid: 'testPlace2' };
        mockedSelectNextIncompleteTrip.mockReturnValueOnce(null);

        const result = widgetConfig.onSectionEntry!(interviewWithTestPerson, iterationContext);
        
        expect(result).toEqual({
            'response.household.persons.testPerson1.journeys.testJourney1.trips.tripId1': newTrip,
            'validations.household.persons.testPerson1.journeys.testJourney1.trips.tripId1': {},
            'response._activeTripId': 'tripId1'
        });
    });

    test('should delete trips when the number of trips is greater than the number of visited places', () => {
        const testInterview = _cloneDeep(interviewWithTestPerson);
        
        // 2 places
        mockedGetVisitedPlacesArray.mockReturnValue([
            { _uuid: 'testPlace1', _sequence: 1, activity: 'home' },
            { _uuid: 'testPlace2', _sequence: 2, activity: 'workUsual' }
        ]);
        // 3 trips
        const trips = [
            { _uuid: 'tripId1', _sequence: 1, _originVisitedPlaceUuid: 'testPlace1', _destinationVisitedPlaceUuid: 'testPlace2' },
            { _uuid: 'tripId2', _sequence: 2, _originVisitedPlaceUuid: 'testPlace2', _destinationVisitedPlaceUuid: 'testPlace3' },
            { _uuid: 'tripId3', _sequence: 3, _originVisitedPlaceUuid: 'testPlace3', _destinationVisitedPlaceUuid: 'testPlace4' }
        ];
        testInterview.response.household!.persons!.testPerson1.journeys!.testJourney1.trips = {
            tripId1: trips[0],
            tripId2: trips[1],
            tripId3: trips[2]
        };
        mockedGetTripsArray.mockReturnValue(trips);
        // Should remove the last 2 trips
        
        const result = widgetConfig.onSectionEntry!(testInterview, iterationContext);
        expect(result).toEqual({
            'response._activeTripId': null,
            [`response.household.persons.${activePerson._uuid}.journeys.${activeJourney._uuid}.trips.tripId2`]: undefined,
            [`response.household.persons.${activePerson._uuid}.journeys.${activeJourney._uuid}.trips.tripId3`]: undefined,
            [`validations.household.persons.${activePerson._uuid}.journeys.${activeJourney._uuid}.trips.tripId2`]: undefined,
            [`validations.household.persons.${activePerson._uuid}.journeys.${activeJourney._uuid}.trips.tripId3`]: undefined,

        });
    });

    test('should not set an active trip if incomplete trip is to be deleted', () => {
        const testInterview = _cloneDeep(interviewWithTestPerson);
        // 2 places
        mockedGetVisitedPlacesArray.mockReturnValue([
            { _uuid: 'testPlace1', _sequence: 1, activity: 'home' },
            { _uuid: 'testPlace2', _sequence: 2, activity: 'workUsual' }
        ]);
        // 3 trips
        const trips = [
            { _uuid: 'tripId1', _sequence: 1, _originVisitedPlaceUuid: 'testPlace1', _destinationVisitedPlaceUuid: 'testPlace2' },
            { _uuid: 'tripId2', _sequence: 2, _originVisitedPlaceUuid: 'testPlace2', _destinationVisitedPlaceUuid: 'testPlace3' },
            { _uuid: 'tripId3', _sequence: 3, _originVisitedPlaceUuid: 'testPlace3', _destinationVisitedPlaceUuid: 'testPlace4' }
        ]
        testInterview.response.household!.persons!.testPerson1.journeys!.testJourney1.trips = {
            tripId1: trips[0],
            tripId2: trips[1],
            tripId3: trips[2]
        };
        mockedGetTripsArray.mockReturnValue(trips);
        // Should remove the last 2 trips
        mockedSelectNextIncompleteTrip.mockReturnValueOnce(trips[2]);

        const result = widgetConfig.onSectionEntry!(testInterview, iterationContext);
        
        expect(result).toEqual({
            'response._activeTripId': null,
            [`response.household.persons.${activePerson._uuid}.journeys.${activeJourney._uuid}.trips.tripId2`]: undefined,
            [`response.household.persons.${activePerson._uuid}.journeys.${activeJourney._uuid}.trips.tripId3`]: undefined,
            [`validations.household.persons.${activePerson._uuid}.journeys.${activeJourney._uuid}.trips.tripId2`]: undefined,
            [`validations.household.persons.${activePerson._uuid}.journeys.${activeJourney._uuid}.trips.tripId3`]: undefined,

        });
    });

    test('should update trips and initialize segments when origins and destinations have changed', () => {
        // 3 places
        const places = [
            { _uuid: 'testPlace1', _sequence: 1, activity: 'home' },
            { _uuid: 'testPlace2', _sequence: 2, activity: 'workUsual' },
            { _uuid: 'testPlace3', _sequence: 3, activity: 'home' }
        ];
        mockedGetVisitedPlacesArray.mockReturnValue(places);
        // 2 trips, with different origins and destination
        mockedGetTripsArray.mockReturnValue([
            { _uuid: 'tripId1', _sequence: 1, _originVisitedPlaceUuid: 'testPlace1', _destinationVisitedPlaceUuid: 'oldPlace2' },
            { _uuid: 'tripId2', _sequence: 2, _originVisitedPlaceUuid: 'oldPlace2', _destinationVisitedPlaceUuid: 'oldPlace3' }
        ]);

        const result = widgetConfig.onSectionEntry!(interviewWithTestPerson, iterationContext);
        
        expect(result).toEqual({
            'response.household.persons.testPerson1.journeys.testJourney1.trips.tripId1._originVisitedPlaceUuid': places[0]._uuid,
            'response.household.persons.testPerson1.journeys.testJourney1.trips.tripId1._destinationVisitedPlaceUuid': places[1]._uuid,
            'response.household.persons.testPerson1.journeys.testJourney1.trips.tripId1.segments': undefined,
            'response.household.persons.testPerson1.journeys.testJourney1.trips.tripId2._originVisitedPlaceUuid': places[1]._uuid,
            'response.household.persons.testPerson1.journeys.testJourney1.trips.tripId2._destinationVisitedPlaceUuid': places[2]._uuid,
            'response.household.persons.testPerson1.journeys.testJourney1.trips.tripId2.segments': undefined,
            'response._activeTripId': 'tripId1'
        });
    });

    test('should set the active trip ID to the next incomplete trip', () => {
        const testInterview = _cloneDeep(interviewWithTestPerson);
        // 3 places
        mockedGetVisitedPlacesArray.mockReturnValue([
            { _uuid: 'testPlace1', _sequence: 1, activity: 'home' },
            { _uuid: 'testPlace2', _sequence: 2, activity: 'workUsual' },
            { _uuid: 'testPlace3', _sequence: 3, activity: 'home' }
        ]);
        // 2 trips with different origin/destination
        const trips = [
            { _uuid: 'tripId1', _sequence: 1, _originVisitedPlaceUuid: 'testPlace1', _destinationVisitedPlaceUuid: 'testPlace2' },
            { _uuid: 'tripId2', _sequence: 2, _originVisitedPlaceUuid: 'testPlace2', _destinationVisitedPlaceUuid: 'testPlace3' }
        ];
        mockedGetTripsArray.mockReturnValue(trips);
        testInterview.response.household!.persons!.testPerson1.journeys!.testJourney1.trips = {
            tripId1: trips[0],
            tripId2: trips[1]
        };
        // Trip2 is incomplete
        const incompleteTrip = trips[1];
        mockedSelectNextIncompleteTrip.mockReturnValueOnce(incompleteTrip);

        const result = widgetConfig.onSectionEntry!(testInterview, iterationContext);
        
        expect(result).toEqual({
            'response._activeTripId': incompleteTrip._uuid
        });
        expect(mockedSelectNextIncompleteTrip).toHaveBeenCalledWith({ journey: activeJourney });
    });

    test('should set the active trip ID to null if no incomplete trip', () => {
        // 3 places
        mockedGetVisitedPlacesArray.mockReturnValue([
            { _uuid: 'testPlace1', _sequence: 1, activity: 'home' },
            { _uuid: 'testPlace2', _sequence: 2, activity: 'workUsual' },
            { _uuid: 'testPlace3', _sequence: 3, activity: 'home' }
        ]);
        // 2 trips with different origin/destination
        const trips = [
            { _uuid: 'tripId1', _sequence: 1, _originVisitedPlaceUuid: 'testPlace1', _destinationVisitedPlaceUuid: 'testPlace2' },
            { _uuid: 'tripId2', _sequence: 2, _originVisitedPlaceUuid: 'testPlace2', _destinationVisitedPlaceUuid: 'testPlace3' }
        ];
        mockedGetTripsArray.mockReturnValue(trips);
        mockedSelectNextIncompleteTrip.mockReturnValueOnce(null);

        const result = widgetConfig.onSectionEntry!(interviewWithTestPerson, iterationContext);
        
        expect(result).toEqual({
            'response._activeTripId': null
        });
        expect(mockedSelectNextIncompleteTrip).toHaveBeenCalledWith({ journey: activeJourney });
    });

    test('should add a new trip and select it if new trips have been added since last complete trip', () => {
        
        // 3 places
        const places = [
            { _uuid: 'testPlace1', _sequence: 1, activity: 'home' },
            { _uuid: 'testPlace2', _sequence: 2, activity: 'workUsual' },
            { _uuid: 'testPlace3', _sequence: 3, activity: 'shopping' },
            { _uuid: 'testPlace4', _sequence: 4, activity: 'home' }
        ];
        // Prepare interview
        const testInterview = _cloneDeep(interviewWithTestPerson);
        
        mockedGetVisitedPlacesArray.mockReturnValue(places);
        // only 1 trip, with different origins and destination, the second trip is missing
        const trips = [
            { _uuid: 'tripId1', _sequence: 1, _originVisitedPlaceUuid: 'testPlace1', _destinationVisitedPlaceUuid: 'testPlace2' }
        ];
        testInterview.response.household!.persons!.testPerson1.journeys!.testJourney1.trips = {
            tripId1: trips[0]
        };
        mockedGetTripsArray.mockReturnValue(trips);
        mockedSelectNextIncompleteTrip.mockReturnValueOnce(null);

        // Should add a new trip
        mockUuidv4.mockReturnValueOnce('tripId2' as any);
        mockUuidv4.mockReturnValueOnce('tripId3' as any);
        const newTrip2 = { _uuid: 'tripId2', _sequence: 2, _originVisitedPlaceUuid: places[1]._uuid, _destinationVisitedPlaceUuid: places[2]._uuid };
        const newTrip3 = { _uuid: 'tripId3', _sequence: 3, _originVisitedPlaceUuid: places[2]._uuid, _destinationVisitedPlaceUuid: places[3]._uuid };

        const result = widgetConfig.onSectionEntry!(testInterview, iterationContext);
        
        expect(result).toEqual({
            'response.household.persons.testPerson1.journeys.testJourney1.trips.tripId2': newTrip2,
            'validations.household.persons.testPerson1.journeys.testJourney1.trips.tripId2': {},
            'response.household.persons.testPerson1.journeys.testJourney1.trips.tripId3': newTrip3,
            'validations.household.persons.testPerson1.journeys.testJourney1.trips.tripId3': {},
            'response._activeTripId': 'tripId2'
        });
        expect(mockedSelectNextIncompleteTrip).toHaveBeenCalledWith({ journey: activeJourney });
    });
});
