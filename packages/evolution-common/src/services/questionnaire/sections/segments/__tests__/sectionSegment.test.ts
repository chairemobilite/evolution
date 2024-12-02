/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _cloneDeep from 'lodash/cloneDeep';

import { getSegmentsSectionConfig } from '../sectionSegments';
import { interviewAttributesForTestCases } from '../../../../../tests/surveys';
import * as utilHelpers from '../../../../../utils/helpers';
import * as odHelpers from '../../../../odSurvey/helpers';
import { removeGroupedObjects, addGroupedObjects } from '../../../../../utils/helpers';

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

// Mock util helpers
jest.mock('../../../../../utils/helpers', () => ({
    ...jest.requireActual('../../../../../utils/helpers'),
    removeGroupedObjects: jest.fn(),
    addGroupedObjects: jest.fn()
}));
const mockedAddGroupedObjects = addGroupedObjects as jest.MockedFunction<typeof addGroupedObjects>;
const mockedRemoveGroupedObjects = removeGroupedObjects as jest.MockedFunction<typeof removeGroupedObjects>;

beforeEach(() => {
    jest.clearAllMocks();
})

describe('getSegmentsSectionConfig', () => {

    test('should return the correct widget config', () => {
        const widgetConfig = getSegmentsSectionConfig({});
        expect(widgetConfig).toEqual({
            previousSection: 'visitedPlaces',
            nextSection: 'travelBehavior',
            parentSection: 'tripsIntro',
            preload: expect.any(Function),
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
            ],
            completionConditional: expect.any(Function)
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

describe('getSegmentsSectionConfig completion conditional', () => {
    const widgetConfig = getSegmentsSectionConfig({});

    const activeJourney = interviewAttributesForTestCases.responses.household!.persons!.personId1.journeys!.journeyId1;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should return `true` if no active journey', () => {
        mockedGetActiveJourney.mockReturnValue(null);
        const conditional = widgetConfig.completionConditional;
        expect(conditional).toBeDefined();
        expect((conditional as any)(interviewAttributesForTestCases, 'path')).toEqual(true);
        expect(mockedGetActiveJourney).toHaveBeenCalledWith({ interview: interviewAttributesForTestCases });
        expect(mockedSelectNextIncompleteTrip).not.toHaveBeenCalled();
    });

    test('shoud return `true` if active journey, but no incomplete trip', () => {
        mockedGetActiveJourney.mockReturnValue(activeJourney);
        mockedSelectNextIncompleteTrip.mockReturnValueOnce(null);
        const conditional = widgetConfig.completionConditional;
        expect(conditional).toBeDefined();
        expect((conditional as any)(interviewAttributesForTestCases, 'path')).toEqual(true);
        expect(mockedGetActiveJourney).toHaveBeenCalledWith({ interview: interviewAttributesForTestCases });
        expect(mockedSelectNextIncompleteTrip).toHaveBeenCalledWith({ journey: activeJourney });
    });

    test('shoud return `false` if active journey, with incomplete trip', () => {
        mockedGetActiveJourney.mockReturnValue(activeJourney);
        mockedSelectNextIncompleteTrip.mockReturnValueOnce(activeJourney.trips!.tripId1P1);
        const conditional = widgetConfig.completionConditional;
        expect(conditional).toBeDefined();
        expect((conditional as any)(interviewAttributesForTestCases, 'path')).toEqual(false);
        expect(mockedGetActiveJourney).toHaveBeenCalledWith({ interview: interviewAttributesForTestCases });
        expect(mockedSelectNextIncompleteTrip).toHaveBeenCalledWith({ journey: activeJourney });
    });

});

describe('getSegmentsSectionConfig preload function', () => {
    const widgetConfig = getSegmentsSectionConfig({});

    const mockCallback = jest.fn();
    const mockStartUpdateInterview = jest.fn().mockImplementation((section, values, unsetPaths, interview, callback) => {
        callback(interview);
    });

    // Mock journey and person for all tests. Individual tests may override if needed
    const activeJourney = { _uuid: 'testJourney1', _sequence: 1 };
    const activePerson = { _uuid: 'testPerson1', _sequence: 1 };
    
    beforeEach(() => {
        jest.clearAllMocks();
        mockedGetPerson.mockReturnValue(activePerson);
        mockedGetActiveJourney.mockReturnValue(activeJourney);
    });

    test('should add trips when there are no trips', () => {
        // 2 places
        mockedGetVisitedPlacesArray.mockReturnValue([
            { _uuid: 'testPlace1', _sequence: 1, activity: 'home' },
            { _uuid: 'testPlace2', _sequence: 2, activity: 'workUsual' }
        ]);
        // no trips
        mockedGetTripsArray.mockReturnValue([]);
        // Should add a new trip
        const newTrip = { _uuid: 'tripId1', _sequence: 1, _originVisitedPlaceUuid: 'testPlace1', _destinationVisitedPlaceUuid: 'testPlace2' };
        mockedAddGroupedObjects.mockReturnValue({ 'responses.household.persons.testPerson1.journeys.testJourney1.trips.tripId1': newTrip });

        // Call the preload function
        widgetConfig.preload!(interviewAttributesForTestCases, { startUpdateInterview: mockStartUpdateInterview, startAddGroupedObjects: jest.fn(), startRemoveGroupedObjects: jest.fn(), callback: mockCallback } as any);

        expect(mockedAddGroupedObjects).toHaveBeenCalledWith(interviewAttributesForTestCases, 1, 1, 'household.persons.testPerson1.journeys.testJourney1.trips', [{ _originVisitedPlaceUuid: 'testPlace1', _destinationVisitedPlaceUuid: 'testPlace2' }]);
        expect(mockedRemoveGroupedObjects).not.toHaveBeenCalled();
        expect(mockStartUpdateInterview).toHaveBeenCalledTimes(2);
        expect(mockStartUpdateInterview).toHaveBeenNthCalledWith(1, 'segments', {
            'responses.household.persons.testPerson1.journeys.testJourney1.trips.tripId1': newTrip
        }, [], undefined, expect.any(Function));
        expect(mockStartUpdateInterview).toHaveBeenNthCalledWith(2, 'segments', {
            'responses._activeTripId': null
        }, undefined, undefined, mockCallback);
        expect(mockedSelectNextIncompleteTrip).toHaveBeenCalledWith({ journey: activeJourney });
    });

    test('should delete trips when the number of trips is greater than the number of visited places', () => {
        // 2 places
        mockedGetVisitedPlacesArray.mockReturnValue([
            { _uuid: 'testPlace1', _sequence: 1, activity: 'home' },
            { _uuid: 'testPlace2', _sequence: 2, activity: 'workUsual' }
        ]);
        // 3 trips
        mockedGetTripsArray.mockReturnValue([
            { _uuid: 'tripId1', _sequence: 1, _originVisitedPlaceUuid: 'testPlace1', _destinationVisitedPlaceUuid: 'testPlace2' },
            { _uuid: 'tripId2', _sequence: 2, _originVisitedPlaceUuid: 'testPlace2', _destinationVisitedPlaceUuid: 'testPlace3' },
            { _uuid: 'tripId3', _sequence: 3, _originVisitedPlaceUuid: 'testPlace3', _destinationVisitedPlaceUuid: 'testPlace4' }
        ]);
        // Should remove the last 2 trips
        mockedRemoveGroupedObjects.mockImplementation((_interview, paths) => [{}, (typeof paths === 'string' ? [paths] : paths).flatMap(path => [ `response.${path}`, `validations.${path}` ]) ]);

        // Call the preload function
        widgetConfig.preload!(interviewAttributesForTestCases, { startUpdateInterview: mockStartUpdateInterview, startAddGroupedObjects: jest.fn(), startRemoveGroupedObjects: jest.fn(), callback: mockCallback } as any);

        const pathsToDelete = [
            `household.persons.${activePerson._uuid}.journeys.${activeJourney._uuid}.trips.tripId2`,
            `household.persons.${activePerson._uuid}.journeys.${activeJourney._uuid}.trips.tripId3`
        ];
        expect(mockedRemoveGroupedObjects).toHaveBeenCalledWith(interviewAttributesForTestCases, pathsToDelete);
        expect(mockedAddGroupedObjects).not.toHaveBeenCalled();
        expect(mockStartUpdateInterview).toHaveBeenCalledTimes(2);
        expect(mockStartUpdateInterview).toHaveBeenNthCalledWith(1, 'segments', {}, pathsToDelete.flatMap(path => [ `response.${path}`, `validations.${path}` ]), undefined, expect.any(Function));
        expect(mockStartUpdateInterview).toHaveBeenNthCalledWith(2, 'segments', {
            'responses._activeTripId': null
        }, undefined, undefined, mockCallback);
        expect(mockedSelectNextIncompleteTrip).toHaveBeenCalledWith({ journey: activeJourney });
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
            { _uuid: 'tripId1', _sequence: 1, _originVisitedPlaceUuid: 'oldPlace1', _destinationVisitedPlaceUuid: 'oldPlace2' },
            { _uuid: 'tripId2', _sequence: 2, _originVisitedPlaceUuid: 'oldPlace2', _destinationVisitedPlaceUuid: 'oldPlace3' }
        ]);
        
        // Call the preload function
        widgetConfig.preload!(interviewAttributesForTestCases, { startUpdateInterview: mockStartUpdateInterview, startAddGroupedObjects: jest.fn(), startRemoveGroupedObjects: jest.fn(), callback: mockCallback } as any);

        expect(mockedRemoveGroupedObjects).not.toHaveBeenCalled();
        expect(mockedAddGroupedObjects).not.toHaveBeenCalled();
        expect(mockStartUpdateInterview).toHaveBeenCalledTimes(2);
        expect(mockStartUpdateInterview).toHaveBeenNthCalledWith(1, 'segments', {
            'responses.household.persons.testPerson1.journeys.testJourney1.trips.tripId1._originVisitedPlaceUuid': places[0]._uuid,
            'responses.household.persons.testPerson1.journeys.testJourney1.trips.tripId1._destinationVisitedPlaceUuid': places[1]._uuid,
            'responses.household.persons.testPerson1.journeys.testJourney1.trips.tripId1.segments': undefined,
            'responses.household.persons.testPerson1.journeys.testJourney1.trips.tripId2._originVisitedPlaceUuid': places[1]._uuid,
            'responses.household.persons.testPerson1.journeys.testJourney1.trips.tripId2._destinationVisitedPlaceUuid': places[2]._uuid,
            'responses.household.persons.testPerson1.journeys.testJourney1.trips.tripId2.segments': undefined,
        }, [], undefined, expect.any(Function));
        expect(mockStartUpdateInterview).toHaveBeenNthCalledWith(2, 'segments', {
            'responses._activeTripId': null
        }, undefined, undefined, mockCallback);
        expect(mockedSelectNextIncompleteTrip).toHaveBeenCalledWith({ journey: activeJourney });
    });

    test('should select next incomplete trip and no change', () => {
        // 3 places
        mockedGetVisitedPlacesArray.mockReturnValue([
            { _uuid: 'testPlace1', _sequence: 1, activity: 'home' },
            { _uuid: 'testPlace2', _sequence: 2, activity: 'workUsual' },
            { _uuid: 'testPlace3', _sequence: 3, activity: 'home' }
        ]);
        // 2 trips, with different origins and destination
        const trips = [
            { _uuid: 'tripId1', _sequence: 1, _originVisitedPlaceUuid: 'testPlace1', _destinationVisitedPlaceUuid: 'testPlace2' },
            { _uuid: 'tripId2', _sequence: 2, _originVisitedPlaceUuid: 'testPlace2', _destinationVisitedPlaceUuid: 'testPlace3' }
        ];
        mockedGetTripsArray.mockReturnValue(trips);
        // Trip2 is incomplete
        mockedSelectNextIncompleteTrip.mockReturnValueOnce(trips[1]);
        
        // Call the preload function
        widgetConfig.preload!(interviewAttributesForTestCases, { startUpdateInterview: mockStartUpdateInterview, startAddGroupedObjects: jest.fn(), startRemoveGroupedObjects: jest.fn(), callback: mockCallback } as any);

        expect(mockedRemoveGroupedObjects).not.toHaveBeenCalled();
        expect(mockedAddGroupedObjects).not.toHaveBeenCalled();
        expect(mockStartUpdateInterview).toHaveBeenCalledTimes(1);
        expect(mockStartUpdateInterview).toHaveBeenCalledWith('segments', {
            'responses._activeTripId': trips[1]._uuid
        }, undefined, undefined, mockCallback);
    });

    test('should go to next section if no active person', () => {
        mockedGetPerson.mockReturnValueOnce(null);

        // Call the preload function
        widgetConfig.preload!(interviewAttributesForTestCases, { startUpdateInterview: mockStartUpdateInterview, startAddGroupedObjects: jest.fn(), startRemoveGroupedObjects: jest.fn(), callback: mockCallback } as any);

        expect(mockStartUpdateInterview).toHaveBeenCalledTimes(1);
        expect(mockStartUpdateInterview).toHaveBeenCalledWith('tripsIntro', { 'responses._activeSection': 'tripsIntro' }, undefined, undefined, mockCallback);
    });

    test('should go to next section if no active journey', () => {
        mockedGetActiveJourney.mockReturnValue(null);

        // Call the preload function
        widgetConfig.preload!(interviewAttributesForTestCases, { startUpdateInterview: mockStartUpdateInterview, startAddGroupedObjects: jest.fn(), startRemoveGroupedObjects: jest.fn(), callback: mockCallback } as any);

        expect(mockStartUpdateInterview).toHaveBeenCalledTimes(1);
        expect(mockStartUpdateInterview).toHaveBeenCalledWith('tripsIntro', { 'responses._activeSection': 'tripsIntro' }, undefined, undefined, mockCallback);
    });

});
