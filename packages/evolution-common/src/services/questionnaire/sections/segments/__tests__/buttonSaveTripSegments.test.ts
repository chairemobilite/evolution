/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _cloneDeep from 'lodash/cloneDeep';

import { getButtonSaveTripSegmentsConfig } from '../buttonSaveTripSegments';
import { interviewAttributesForTestCases, setActiveSurveyObjects, widgetFactoryOptions } from '../../../../../tests/surveys';
import * as utilHelpers from '../../../../../utils/helpers';
import * as odHelpers from '../../../../odSurvey/helpers';

jest.mock('../../../../odSurvey/helpers', () => {
    // Require the original module to not be mocked...
    // FIXME Refactor to use the actual functions instead of mocking them
    const originalModule = jest.requireActual('../../../../odSurvey/helpers');
    return {
        ...originalModule,
        getCountOrSelfDeclared: jest.fn().mockReturnValue(1),
        getVisitedPlacesArray: jest.fn().mockReturnValue([]),
        getVisitedPlaceGeography: jest.fn().mockReturnValue(null),
        selectNextIncompleteTrip: jest.fn()
    };
});
const mockedSelectNextIncompleteTrip = odHelpers.selectNextIncompleteTrip as jest.MockedFunction<typeof odHelpers.selectNextIncompleteTrip>;

beforeEach(() => {
    jest.clearAllMocks();
});

describe('getButtonSaveTripSegmentsConfig', () => {

    test('should return the correct widget config', () => {
        const widgetConfig = getButtonSaveTripSegmentsConfig(widgetFactoryOptions);
        expect(widgetConfig).toEqual({
            type: 'button',
            color: 'green',
            label: expect.any(Function),
            hideWhenRefreshing: true,
            path: 'buttonSaveTrip',
            icon: 'check-circle',
            align: 'center',
            action: widgetFactoryOptions.buttonActions.validateButtonAction,
            saveCallback: expect.any(Function),
            conditional: expect.any(Function)
        });
    });

});

describe('getButtonSaveTripSegmentsConfig labels', () => {
    const widgetConfig = getButtonSaveTripSegmentsConfig(widgetFactoryOptions);

    test('should return the right label for title', () => {
        const mockedT = jest.fn();
        const title = widgetConfig.label;
        expect(title).toBeDefined();
        utilHelpers.translateString(title, { t: mockedT } as any, interviewAttributesForTestCases, 'path');
        expect(mockedT).toHaveBeenCalledWith(['customSurvey:segments:SaveTripLabel', 'segments:SaveTripLabel']);
    });

});

describe('getButtonSaveTripSegmentsConfig conditional', () => {
    const widgetConfig = getButtonSaveTripSegmentsConfig(widgetFactoryOptions);

    const getResponseSpy = jest.spyOn(utilHelpers, 'getResponse').mockReturnValue({});
    const mockedGetResponse = utilHelpers.getResponse as jest.MockedFunction<typeof utilHelpers.getResponse>;

    afterAll(() => {
        getResponseSpy.mockRestore();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should return `false` if no segments', () => {
        mockedGetResponse.mockReturnValue({});
        const conditional = widgetConfig.conditional;
        expect(conditional).toBeDefined();
        expect((conditional as any)(interviewAttributesForTestCases, 'path')).toEqual([false, undefined]);
        expect(mockedGetResponse).toHaveBeenCalledWith(interviewAttributesForTestCases, 'path', {}, '../segments');
    });

    test('shoud return `false` if the last segment has next mode', () => {
        mockedGetResponse.mockReturnValue({ segment1: { _uuid: 'segment1', _sequence: 1, hasNextMode: true }, segment2: { _uuid: 'segment2', _sequence: 2, hasNextMode: true } });
        const conditional = widgetConfig.conditional;
        expect(conditional).toBeDefined();
        expect((conditional as any)(interviewAttributesForTestCases, 'path')).toEqual([false, undefined]);
        expect(mockedGetResponse).toHaveBeenCalledWith(interviewAttributesForTestCases, 'path', {}, '../segments');
    });

    test('shoud return `false` if the last segment has next mode is not set', () => {
        mockedGetResponse.mockReturnValue({ segment1: { _uuid: 'segment1', _sequence: 1 } });
        const conditional = widgetConfig.conditional;
        expect(conditional).toBeDefined();
        expect((conditional as any)(interviewAttributesForTestCases, 'path')).toEqual([false, undefined]);
        expect(mockedGetResponse).toHaveBeenCalledWith(interviewAttributesForTestCases, 'path', {}, '../segments');
    });

    test('shoud return `true` if the last segment does not have nex mode', () => {
        mockedGetResponse.mockReturnValue({ segment1: { _uuid: 'segment1', _sequence: 1, hasNextMode: false } });
        const conditional = widgetConfig.conditional;
        expect(conditional).toBeDefined();
        expect((conditional as any)(interviewAttributesForTestCases, 'path')).toEqual([true, undefined]);
        expect(mockedGetResponse).toHaveBeenCalledWith(interviewAttributesForTestCases, 'path', {}, '../segments');
    });

});

describe('getButtonSaveTripSegmentsConfig button action', () => {
    const widgetConfig = getButtonSaveTripSegmentsConfig(widgetFactoryOptions);

    test('test button action', () => {
        expect(widgetFactoryOptions.buttonActions.validateButtonAction).not.toHaveBeenCalled();
        const action = widgetConfig.action;
        action({ startUpdateInterview: jest.fn(), startAddGroupedObjects: jest.fn(), startRemoveGroupedObjects: jest.fn(), startNavigate: jest.fn() }, interviewAttributesForTestCases, 'path', 'segments', {});
        expect(widgetFactoryOptions.buttonActions.validateButtonAction).toHaveBeenCalled();
    });
});

describe('getButtonSaveTripSegmentsConfig save callback', () => {
    const widgetConfig = getButtonSaveTripSegmentsConfig(widgetFactoryOptions);

    // Person2 trip2 has 2 segments
    const buttonPathPrefix = 'household.persons.personId2.journeys.journeyId2.trips.tripId2P2';
    const buttonPath = `${buttonPathPrefix}.buttonSaveTrip`;
    const saveCallback = widgetConfig.saveCallback;
    const updateCallbacks =
        { startUpdateInterview: jest.fn(), startAddGroupedObjects: jest.fn(), startRemoveGroupedObjects: jest.fn(), startNavigate: jest.fn() };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should set all _isNew to `false` and select next incomplete trip', () => {
        // Set active trip ID for next incomplete trip selection
        const testInterview = _cloneDeep(interviewAttributesForTestCases);
        setActiveSurveyObjects(testInterview, {
            personId: 'personId2',
            journeyId: 'journeyId2',
            activeTripId: 'tripId2P2'
        });
        // Mock function response for incomplete trip
        const incompleteTrip = { _uuid: 'trip1', _sequence: 1 };
        mockedSelectNextIncompleteTrip.mockReturnValueOnce(incompleteTrip);

        // Call the save callback
        saveCallback!(updateCallbacks, testInterview, buttonPath);

        // Test function calls
        expect(mockedSelectNextIncompleteTrip).toHaveBeenCalledWith({ journey: testInterview.response.household!.persons!.personId2!.journeys!.journeyId2 });
        expect(updateCallbacks.startUpdateInterview).toHaveBeenCalledWith({
            sectionShortname: 'segments',
            valuesByPath: {
                'response.household.persons.personId2.journeys.journeyId2.trips.tripId2P2.segments.segmentId1P2T2._isNew': false,
                'response.household.persons.personId2.journeys.journeyId2.trips.tripId2P2.segments.segmentId2P2T2._isNew': false,
                'response._activeTripId': 'trip1'
            }
        });
    });

    test('should set all _isNew to `false` and select no trip if no active journey', () => {
        // Set active trip ID for next incomplete trip selection
        const testInterview = _cloneDeep(interviewAttributesForTestCases);
        setActiveSurveyObjects(testInterview, {
            personId: undefined,
            journeyId: undefined,
            activeTripId: undefined
        });
        
        // Call the save callback
        saveCallback!(updateCallbacks, testInterview, buttonPath);

        // Test function calls
        expect(mockedSelectNextIncompleteTrip).not.toHaveBeenCalled();
        expect(updateCallbacks.startUpdateInterview).toHaveBeenCalledWith({
            sectionShortname: 'segments',
            valuesByPath: {
                'response.household.persons.personId2.journeys.journeyId2.trips.tripId2P2.segments.segmentId1P2T2._isNew': false,
                'response.household.persons.personId2.journeys.journeyId2.trips.tripId2P2.segments.segmentId2P2T2._isNew': false,
                'response._activeTripId': null
            }
        });
    });

    test('should set all _isNew to `false` and select no trip if no incomplete trip', () => {
        // Set active trip ID for next incomplete trip selection
        const testInterview = _cloneDeep(interviewAttributesForTestCases);
        setActiveSurveyObjects(testInterview, {
            personId: 'personId2',
            journeyId: 'journeyId2',
            activeTripId: 'tripId2P2'
        });
        // Mock function response for incomplete trip
        mockedSelectNextIncompleteTrip.mockReturnValueOnce(null);

        // Call the save callback
        saveCallback!(updateCallbacks, testInterview, buttonPath);

        // Test function calls
        expect(mockedSelectNextIncompleteTrip).toHaveBeenCalledWith({ journey: testInterview.response.household!.persons!.personId2!.journeys!.journeyId2 });
        expect(updateCallbacks.startUpdateInterview).toHaveBeenCalledWith({
            sectionShortname: 'segments',
            valuesByPath: {
                'response.household.persons.personId2.journeys.journeyId2.trips.tripId2P2.segments.segmentId1P2T2._isNew': false,
                'response.household.persons.personId2.journeys.journeyId2.trips.tripId2P2.segments.segmentId2P2T2._isNew': false,
                'response._activeTripId': null
            }
        });
    });

    test('should just set next incomplete trip if no segments', () => {
        // Use a path to a trip with no segments
        const testButtonPathPrefix = 'household.persons.personId1.journeys.journeyId1.trips.tripId1P1';
        const testButtonPath = `${testButtonPathPrefix}.buttonSaveTrip`;
        // Set active trip ID for next incomplete trip selection
        const testInterview = _cloneDeep(interviewAttributesForTestCases);
        setActiveSurveyObjects(testInterview, {
            personId: 'personId1',
            journeyId: 'journeyId1',
            activeTripId: 'tripId1P1'
        });
        // Mock function response: 2 segments, active journey and incomplete trip
        const incompleteTrip = { _uuid: 'trip1', _sequence: 1 };
        mockedSelectNextIncompleteTrip.mockReturnValueOnce(incompleteTrip);

        // Call the save callback
        saveCallback!(updateCallbacks, testInterview, testButtonPath);

        // Test function calls
        expect(mockedSelectNextIncompleteTrip).toHaveBeenCalledWith({ journey: testInterview.response.household!.persons!.personId1!.journeys!.journeyId1 });
        expect(updateCallbacks.startUpdateInterview).toHaveBeenCalledWith({
            sectionShortname: 'segments',
            valuesByPath: { 'response._activeTripId': 'trip1' }
        });
    });

});
