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

jest.mock('uuid', () => ({
    v4: jest.fn().mockReturnValue('newTripId')
}));
const mockUuidv4 = uuidv4 as jest.MockedFunction<typeof uuidv4>;

beforeEach(() => {
    jest.clearAllMocks();
});

// Mock the selectNextIncompleteTrip function as it is more complicated to mock an incomplete trip
const mockedSelectNextIncompleteTrip = jest.spyOn(odHelpers, 'selectNextIncompleteTrip');
// Set test interview with one test person for all tests. Individual tests may override if needed
const activeJourney = { _uuid: 'testJourney1', _sequence: 1 };
const activePerson = { _uuid: 'testPerson1', _sequence: 1, journeys: { testJourney1: activeJourney } };
const interviewWithTestPerson = _cloneDeep(interviewAttributesForTestCases);
interviewWithTestPerson.response.household!.persons = {
    testPerson1: activePerson
};
// Set active person and journey:
interviewWithTestPerson.response._activePersonId = activePerson._uuid;
interviewWithTestPerson.response._activeJourneyId = activeJourney._uuid;

describe('getSegmentsSectionConfig', () => {

    test('should return the correct widget config when section enabled', () => {
        const widgetConfig = getSegmentsSectionConfig({ segmentConfig: { enabled: true }});
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

    test('should return the correct widget config when section disabled', () => {
        const widgetConfig = getSegmentsSectionConfig({ segmentConfig: { enabled: false }});
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
            widgets: []
        });
    });

});

describe('getSegmentsSectionConfig labels', () => {
    const widgetConfig = getSegmentsSectionConfig({});

    test('should return the right label for title', () => {
        const mockedT = jest.fn();
        const title = widgetConfig.title;
        expect(title).toBeDefined();
        utilHelpers.translateString(title, { t: mockedT } as any, interviewWithTestPerson, 'path');
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
        const result = widgetConfig.isSectionVisible!(interviewWithTestPerson, undefined);
        
        expect(result).toBe(false);
    });

    test('should return false if no active journey', () => {
        const testInterview = _cloneDeep(interviewWithTestPerson);
        testInterview.response._activeJourneyId = undefined;
        
        const result = widgetConfig.isSectionVisible!(testInterview, iterationContext);
        
        expect(result).toBe(false);
    });

    test('should return true if there is an active journey', () => {
        const testInterview = _cloneDeep(interviewWithTestPerson);
        
        const result = widgetConfig.isSectionVisible!(testInterview, iterationContext);
        
        expect(result).toBe(true);
    });
});

describe('getSegmentsSectionConfig isSectionCompleted', () => {
    const widgetConfig = getSegmentsSectionConfig({});
    const iterationContext = ['testPerson1'];
    
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should return false if unexisting person', () => {
        const testInterview = _cloneDeep(interviewWithTestPerson);
        const testIterationContext = ['unexistingPerson'];
        
        const result = widgetConfig.isSectionCompleted!(testInterview, testIterationContext);
        
        expect(result).toBe(false);
    });

    test('should return false if no iteration context', () => {
        const result = widgetConfig.isSectionCompleted!(interviewWithTestPerson, undefined);
        
        expect(result).toBe(false);
    });

    test('should return true if no next incomplete trip', () => {
        mockedSelectNextIncompleteTrip.mockReturnValueOnce(null);
        
        const result = widgetConfig.isSectionCompleted!(interviewWithTestPerson, iterationContext);
        
        expect(result).toBe(true);
        expect(mockedSelectNextIncompleteTrip).toHaveBeenCalledWith({ journey: activeJourney });
    });

    test('should return false if there is a next incomplete trip', () => {
        const incompleteTrip = { _uuid: 'tripId1', _sequence: 1 };
        mockedSelectNextIncompleteTrip.mockReturnValueOnce(incompleteTrip);
        
        const result = widgetConfig.isSectionCompleted!(interviewWithTestPerson, iterationContext);
        
        expect(result).toBe(false);
        expect(mockedSelectNextIncompleteTrip).toHaveBeenCalledWith({ journey: activeJourney });
    });
});

describe('getSegmentsSectionConfig onSectionEntry', () => {
    const widgetConfig = getSegmentsSectionConfig({});
    const iterationContext = ['testPerson1'];

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should return undefined if unexisting person', () => {
        const testIterationContext = ['unexistingPerson'];
        
        const result = widgetConfig.onSectionEntry!(interviewWithTestPerson, testIterationContext);
        
        expect(result).toBeUndefined();
    });

    test('should return undefined if no iteration context', () => {        
        const result = widgetConfig.onSectionEntry!(interviewWithTestPerson, undefined);
        
        expect(result).toBeUndefined();
    });

    test('should add trips when there are no trips', () => {
        const testInterview = _cloneDeep(interviewWithTestPerson);
        // 2 places
        const places = [
            { _uuid: 'testPlace1', _sequence: 1, activity: 'home' },
            { _uuid: 'testPlace2', _sequence: 2, activity: 'workUsual' }
        ];
        testInterview.response.household!.persons!.testPerson1.journeys!.testJourney1.visitedPlaces = {
            [places[0]._uuid]: places[0],
            [places[1]._uuid]: places[1]
        };
        // no trips

        // Should add a new trip
        mockUuidv4.mockReturnValueOnce('tripId1' as any);
        const newTrip = { _uuid: 'tripId1', _sequence: 1, _originVisitedPlaceUuid: 'testPlace1', _destinationVisitedPlaceUuid: 'testPlace2' };
        mockedSelectNextIncompleteTrip.mockReturnValueOnce(null);

        const result = widgetConfig.onSectionEntry!(testInterview, iterationContext);
        
        expect(result).toEqual({
            'response.household.persons.testPerson1.journeys.testJourney1.trips.tripId1': newTrip,
            'validations.household.persons.testPerson1.journeys.testJourney1.trips.tripId1': {},
            'response._activeTripId': 'tripId1'
        });
        expect(mockUuidv4).toHaveBeenCalledTimes(1);
    });

    test('should delete trips when the number of trips is greater than the number of visited places', () => {
        const testInterview = _cloneDeep(interviewWithTestPerson);
        
        // 2 places
        const places = [
            { _uuid: 'testPlace1', _sequence: 1, activity: 'home' },
            { _uuid: 'testPlace2', _sequence: 2, activity: 'workUsual' }
        ];
        testInterview.response.household!.persons!.testPerson1.journeys!.testJourney1.visitedPlaces = {
            [places[0]._uuid]: places[0],
            [places[1]._uuid]: places[1]
        };
        // 3 trips
        const trips = [
            { _uuid: 'tripId1', _sequence: 1, _originVisitedPlaceUuid: 'testPlace1', _destinationVisitedPlaceUuid: 'testPlace2' },
            { _uuid: 'tripId2', _sequence: 2, _originVisitedPlaceUuid: 'testPlace2', _destinationVisitedPlaceUuid: 'testPlace3' },
            { _uuid: 'tripId3', _sequence: 3, _originVisitedPlaceUuid: 'testPlace3', _destinationVisitedPlaceUuid: 'testPlace4' }
        ];
        testInterview.response.household!.persons!.testPerson1.journeys!.testJourney1.trips = {
            [trips[0]._uuid]: trips[0],
            [trips[1]._uuid]: trips[1],
            [trips[2]._uuid]: trips[2]
        };
        // Should remove the last 2 trips
        mockedSelectNextIncompleteTrip.mockReturnValueOnce(null);
        
        const result = widgetConfig.onSectionEntry!(testInterview, iterationContext);
        expect(result).toEqual({
            'response._activeTripId': null,
            [`response.household.persons.${activePerson._uuid}.journeys.${activeJourney._uuid}.trips.tripId2`]: undefined,
            [`response.household.persons.${activePerson._uuid}.journeys.${activeJourney._uuid}.trips.tripId3`]: undefined,
            [`validations.household.persons.${activePerson._uuid}.journeys.${activeJourney._uuid}.trips.tripId2`]: undefined,
            [`validations.household.persons.${activePerson._uuid}.journeys.${activeJourney._uuid}.trips.tripId3`]: undefined
        });
    });

    test('should not set an active trip if incomplete trip is to be deleted', () => {
        const testInterview = _cloneDeep(interviewWithTestPerson);
        // 2 places
        const places = [
            { _uuid: 'testPlace1', _sequence: 1, activity: 'home' },
            { _uuid: 'testPlace2', _sequence: 2, activity: 'workUsual' }
        ];
        testInterview.response.household!.persons!.testPerson1.journeys!.testJourney1.visitedPlaces = {
            [places[0]._uuid]: places[0],
            [places[1]._uuid]: places[1]
        };
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
        const testInterview = _cloneDeep(interviewWithTestPerson);
        // 3 places
        const places = [
            { _uuid: 'testPlace1', _sequence: 1, activity: 'home' },
            { _uuid: 'testPlace2', _sequence: 2, activity: 'workUsual' },
            { _uuid: 'testPlace3', _sequence: 3, activity: 'home' }
        ];
        testInterview.response.household!.persons!.testPerson1.journeys!.testJourney1.visitedPlaces = {
            [places[0]._uuid]: places[0],
            [places[1]._uuid]: places[1],
            [places[2]._uuid]: places[2]
        };
        // 2 trips, with different origins and destination
        const trips = [
            { _uuid: 'tripId1', _sequence: 1, _originVisitedPlaceUuid: 'testPlace1', _destinationVisitedPlaceUuid: 'oldPlace2' },
            { _uuid: 'tripId2', _sequence: 2, _originVisitedPlaceUuid: 'oldPlace2', _destinationVisitedPlaceUuid: 'oldPlace3' }
        ];
        testInterview.response.household!.persons!.testPerson1.journeys!.testJourney1.trips = {
            tripId1: trips[0],
            tripId2: trips[1]
        };

        const result = widgetConfig.onSectionEntry!(testInterview, iterationContext);
        
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
        const places = [
            { _uuid: 'testPlace1', _sequence: 1, activity: 'home' },
            { _uuid: 'testPlace2', _sequence: 2, activity: 'workUsual' },
            { _uuid: 'testPlace3', _sequence: 3, activity: 'home' }
        ];
        testInterview.response.household!.persons!.testPerson1.journeys!.testJourney1.visitedPlaces = {
            [places[0]._uuid]: places[0],
            [places[1]._uuid]: places[1],
            [places[2]._uuid]: places[2]
        };
        // Trip2 is incomplete
        const trips = [
            { _uuid: 'tripId1', _sequence: 1, _originVisitedPlaceUuid: 'testPlace1', _destinationVisitedPlaceUuid: 'testPlace2' },
            { _uuid: 'tripId2', _sequence: 2, _originVisitedPlaceUuid: 'testPlace2', _destinationVisitedPlaceUuid: 'testPlace3' }
        ];
        testInterview.response.household!.persons!.testPerson1.journeys!.testJourney1.trips = {
            tripId1: trips[0],
            tripId2: trips[1]
        };
        // Trip2 is incomplete
        const incompleteTrip = trips[1];
        mockedSelectNextIncompleteTrip.mockReturnValueOnce(incompleteTrip);
        const expectedJourney = _cloneDeep(testInterview.response.household!.persons!.testPerson1.journeys!.testJourney1);

        const result = widgetConfig.onSectionEntry!(testInterview, iterationContext);
        
        expect(result).toEqual({
            'response._activeTripId': incompleteTrip._uuid
        });
        expect(mockedSelectNextIncompleteTrip).toHaveBeenCalledWith({ journey: expectedJourney });
    });

    test('should set the active trip ID to null if no incomplete trip', () => {
        const testInterview = _cloneDeep(interviewWithTestPerson);
        // 3 places
        const places = [
            { _uuid: 'testPlace1', _sequence: 1, activity: 'home' },
            { _uuid: 'testPlace2', _sequence: 2, activity: 'workUsual' },
            { _uuid: 'testPlace3', _sequence: 3, activity: 'home' }
        ];
        testInterview.response.household!.persons!.testPerson1.journeys!.testJourney1.visitedPlaces = {
            [places[0]._uuid]: places[0],
            [places[1]._uuid]: places[1],
            [places[2]._uuid]: places[2]
        };
        // 2 complete trips
        const trips = [
            { _uuid: 'tripId1', _sequence: 1, _originVisitedPlaceUuid: 'testPlace1', _destinationVisitedPlaceUuid: 'testPlace2' },
            { _uuid: 'tripId2', _sequence: 2, _originVisitedPlaceUuid: 'testPlace2', _destinationVisitedPlaceUuid: 'testPlace3' }
        ];
        testInterview.response.household!.persons!.testPerson1.journeys!.testJourney1.trips = {
            tripId1: trips[0],
            tripId2: trips[1]
        };
        mockedSelectNextIncompleteTrip.mockReturnValueOnce(null);
        const expectedJourney = _cloneDeep(testInterview.response.household!.persons!.testPerson1.journeys!.testJourney1);

        const result = widgetConfig.onSectionEntry!(testInterview, iterationContext);
        
        expect(result).toEqual({
            'response._activeTripId': null
        });
        expect(mockedSelectNextIncompleteTrip).toHaveBeenCalledWith({ journey: expectedJourney });
    });

    test('should add a new trip and select it if new trips have been added since last complete trip', () => {
        
        // 4 places
        const places = [
            { _uuid: 'testPlace1', _sequence: 1, activity: 'home' },
            { _uuid: 'testPlace2', _sequence: 2, activity: 'workUsual' },
            { _uuid: 'testPlace3', _sequence: 3, activity: 'shopping' },
            { _uuid: 'testPlace4', _sequence: 4, activity: 'home' }
        ];
        // Prepare interview
        const testInterview = _cloneDeep(interviewWithTestPerson);
        testInterview.response.household!.persons!.testPerson1.journeys!.testJourney1.visitedPlaces = {
            [places[0]._uuid]: places[0],
            [places[1]._uuid]: places[1],
            [places[2]._uuid]: places[2],
            [places[3]._uuid]: places[3]
        };
        
        // only 1 trip, with different origins and destination, the second trip is missing
        const trips = [
            { _uuid: 'tripId1', _sequence: 1, _originVisitedPlaceUuid: 'testPlace1', _destinationVisitedPlaceUuid: 'testPlace2' }
        ];
        testInterview.response.household!.persons!.testPerson1.journeys!.testJourney1.trips = {
            tripId1: trips[0]
        };
        mockedSelectNextIncompleteTrip.mockReturnValueOnce(null);
        const expectedJourney = _cloneDeep(testInterview.response.household!.persons!.testPerson1.journeys!.testJourney1);

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
        expect(mockedSelectNextIncompleteTrip).toHaveBeenCalledWith({ journey: expectedJourney });
        expect(mockUuidv4).toHaveBeenCalledTimes(2);
    });
});
