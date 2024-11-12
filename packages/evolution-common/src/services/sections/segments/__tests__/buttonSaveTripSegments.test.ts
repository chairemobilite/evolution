/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _cloneDeep from 'lodash/cloneDeep';

import { getButtonSaveTripSegmentsConfig } from '../buttonSaveTripSegments';
import { interviewAttributesForTestCases } from '../../../../tests/surveys';
import * as utilHelpers from '../../../../utils/helpers';
import * as odHelpers from '../../../odSurvey/helpers';

jest.mock('../../../odSurvey/helpers', () => ({
    getPerson: jest.fn().mockReturnValue({}),
    getActiveJourney: jest.fn().mockReturnValue({}),
    selectNextIncompleteTrip: jest.fn().mockReturnValue(null)
}));
const mockedGetPerson = odHelpers.getPerson as jest.MockedFunction<typeof odHelpers.getPerson>;
const mockedGetActiveJourney = odHelpers.getActiveJourney as jest.MockedFunction<typeof odHelpers.getActiveJourney>;
const mockedSelectNextIncompleteTrip = odHelpers.selectNextIncompleteTrip as jest.MockedFunction<typeof odHelpers.selectNextIncompleteTrip>;

// Prepare configuration options
const mockButtonValidate = jest.fn();
const options = {
    buttonActions: { validateButtonAction: mockButtonValidate },
    iconMapper: { 'check-circle': 'check-circle' as any }
}

beforeEach(() => {
    jest.clearAllMocks();
})

describe('getButtonSaveTripSegmentsConfig', () => {

    test('should return the correct widget config', () => {
        const widgetConfig = getButtonSaveTripSegmentsConfig(options);
        expect(widgetConfig).toEqual({
            type: 'button',
            color: 'green',
            label: expect.any(Function),
            hideWhenRefreshing: true,
            path: 'buttonSaveTrip',
            icon: 'check-circle',
            align: 'center',
            action: mockButtonValidate,
            saveCallback: expect.any(Function),
            conditional: expect.any(Function)
        });
    });

});

describe('getButtonSaveTripSegmentsConfig labels', () => {
    const widgetConfig = getButtonSaveTripSegmentsConfig(options);

    test('should return the right label for title', () => {
        const mockedT = jest.fn();
        const title = widgetConfig.label;
        expect(title).toBeDefined();
        utilHelpers.translateString(title, { t: mockedT } as any, interviewAttributesForTestCases, 'path');
        expect(mockedT).toHaveBeenCalledWith(['customSurvey:segments:SaveTripLabel', 'segments:SaveTripLabel']);
    });

});

describe('getButtonSaveTripSegmentsConfig conditional', () => {
    const widgetConfig = getButtonSaveTripSegmentsConfig(options);

    jest.spyOn(utilHelpers, 'getResponse').mockReturnValue({});
    const mockedGetResponse = utilHelpers.getResponse as jest.MockedFunction<typeof utilHelpers.getResponse>;

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
        mockedGetResponse.mockReturnValue({ segment1: { _uuid: 'segment1', _sequence: 1, hasNextMode: true }, segment2: { _uuid: 'segment2', _sequence: 2, hasNextMode: true }});
        const conditional = widgetConfig.conditional;
        expect(conditional).toBeDefined();
        expect((conditional as any)(interviewAttributesForTestCases, 'path')).toEqual([false, undefined]);
        expect(mockedGetResponse).toHaveBeenCalledWith(interviewAttributesForTestCases, 'path', {}, '../segments');
    });

    test('shoud return `false` if the last segment has next mode is not set', () => {
        mockedGetResponse.mockReturnValue({ segment1: { _uuid: 'segment1', _sequence: 1 }});
        const conditional = widgetConfig.conditional;
        expect(conditional).toBeDefined();
        expect((conditional as any)(interviewAttributesForTestCases, 'path')).toEqual([false, undefined]);
        expect(mockedGetResponse).toHaveBeenCalledWith(interviewAttributesForTestCases, 'path', {}, '../segments');
    });

    test('shoud return `true` if the last segment does not have nex mode', () => {
        mockedGetResponse.mockReturnValue({ segment1: { _uuid: 'segment1', _sequence: 1, hasNextMode: false }});
        const conditional = widgetConfig.conditional;
        expect(conditional).toBeDefined();
        expect((conditional as any)(interviewAttributesForTestCases, 'path')).toEqual([true, undefined]);
        expect(mockedGetResponse).toHaveBeenCalledWith(interviewAttributesForTestCases, 'path', {}, '../segments');
    });

});

describe('getButtonSaveTripSegmentsConfig button action', () => {
    const widgetConfig = getButtonSaveTripSegmentsConfig(options);

    test('test button action', () => {
        expect(mockButtonValidate).not.toHaveBeenCalled();
        const action = widgetConfig.action;
        action({ startUpdateInterview: jest.fn(), startAddGroupedObjects: jest.fn(), startRemoveGroupedObjects: jest.fn() }, interviewAttributesForTestCases, 'path', 'segments', {});
        expect(mockButtonValidate).toHaveBeenCalled();
    })
});

describe('getButtonSaveTripSegmentsConfig save callback', () => {
    const widgetConfig = getButtonSaveTripSegmentsConfig(options);

    jest.spyOn(utilHelpers, 'getResponse').mockReturnValue({});
    const mockedGetResponse = utilHelpers.getResponse as jest.MockedFunction<typeof utilHelpers.getResponse>;

    const buttonPath = 'path.to.trip.buttonAction';
    const saveCallback = widgetConfig.saveCallback;
    const updateCallbacks =
        { startUpdateInterview: jest.fn(), startAddGroupedObjects: jest.fn(), startRemoveGroupedObjects: jest.fn() }

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should set all _isNew to `false` and select next incomplete trip', () => {
        // Mock function responses: 2 segments, active journey and incomplete trip
        const journey = { _uuid: 'journey', _sequence: 1 };
        const incompleteTrip = { _uuid: 'trip1', _sequence: 1 };
        mockedGetResponse.mockReturnValueOnce({ segment1: { _uuid: 'segment1', _sequence: 1 }, segment2: { _uuid: 'segment2', _sequence: 2 } });
        mockedGetActiveJourney.mockReturnValueOnce(journey);
        mockedSelectNextIncompleteTrip.mockReturnValueOnce(incompleteTrip);

        // Call the save callback
        saveCallback!(updateCallbacks, interviewAttributesForTestCases, buttonPath);

        // Test function calls
        expect(mockedGetResponse).toHaveBeenCalledWith(interviewAttributesForTestCases, 'path.to.trip.segments', {});
        expect(mockedGetActiveJourney).toHaveBeenCalledWith({ interview: interviewAttributesForTestCases });
        expect(mockedSelectNextIncompleteTrip).toHaveBeenCalledWith({ journey });
        expect(updateCallbacks.startUpdateInterview).toHaveBeenCalledWith('segments', {
            'responses.path.to.trip.segments.segment1._isNew': false,
            'responses.path.to.trip.segments.segment2._isNew': false,
            'responses._activeTripId': 'trip1'
        });
    });

    test('should set all _isNew to `false` and select no trip if no active journey', () => {
        // Mock function responses: 2 segments no active journey
        mockedGetResponse.mockReturnValueOnce({ segment1: { _uuid: 'segment1', _sequence: 1 }, segment2: { _uuid: 'segment2', _sequence: 2 } });
        mockedGetActiveJourney.mockReturnValueOnce(null);

        // Call the save callback
        saveCallback!(updateCallbacks, interviewAttributesForTestCases, buttonPath);

        // Test function calls
        expect(mockedGetResponse).toHaveBeenCalledWith(interviewAttributesForTestCases, 'path.to.trip.segments', {});
        expect(mockedGetActiveJourney).toHaveBeenCalledWith({ interview: interviewAttributesForTestCases });
        expect(mockedSelectNextIncompleteTrip).not.toHaveBeenCalled();
        expect(updateCallbacks.startUpdateInterview).toHaveBeenCalledWith('segments', {
            'responses.path.to.trip.segments.segment1._isNew': false,
            'responses.path.to.trip.segments.segment2._isNew': false,
            'responses._activeTripId': null
        });
    });

    test('should set all _isNew to `false` and select no trip if no incomplete trip', () => {
        // Mock function responses: 2 segments, active journey and incomplete trip
        const journey = { _uuid: 'journey', _sequence: 1 };
        mockedGetResponse.mockReturnValueOnce({ segment1: { _uuid: 'segment1', _sequence: 1 }, segment2: { _uuid: 'segment2', _sequence: 2 } });
        mockedGetActiveJourney.mockReturnValueOnce(journey);
        mockedSelectNextIncompleteTrip.mockReturnValueOnce(null);

        // Call the save callback
        saveCallback!(updateCallbacks, interviewAttributesForTestCases, buttonPath);

        // Test function calls
        expect(mockedGetResponse).toHaveBeenCalledWith(interviewAttributesForTestCases, 'path.to.trip.segments', {});
        expect(mockedGetActiveJourney).toHaveBeenCalledWith({ interview: interviewAttributesForTestCases });
        expect(mockedSelectNextIncompleteTrip).toHaveBeenCalledWith({ journey });
        expect(updateCallbacks.startUpdateInterview).toHaveBeenCalledWith('segments', {
            'responses.path.to.trip.segments.segment1._isNew': false,
            'responses.path.to.trip.segments.segment2._isNew': false,
            'responses._activeTripId': null
        });
    });

    test('should just set next incomplete trip is no segments', () => {
        // Mock function responses: 2 segments, active journey and incomplete trip
        const journey = { _uuid: 'journey', _sequence: 1 };
        const incompleteTrip = { _uuid: 'trip1', _sequence: 1 };
        mockedGetResponse.mockReturnValueOnce({ });
        mockedGetActiveJourney.mockReturnValueOnce(journey);
        mockedSelectNextIncompleteTrip.mockReturnValueOnce(incompleteTrip);

        // Call the save callback
        saveCallback!(updateCallbacks, interviewAttributesForTestCases, buttonPath);

        // Test function calls
        expect(mockedGetResponse).toHaveBeenCalledWith(interviewAttributesForTestCases, 'path.to.trip.segments', {});
        expect(mockedGetActiveJourney).toHaveBeenCalledWith({ interview: interviewAttributesForTestCases });
        expect(mockedSelectNextIncompleteTrip).toHaveBeenCalledWith({ journey });
        expect(updateCallbacks.startUpdateInterview).toHaveBeenCalledWith('segments', {
            'responses._activeTripId': 'trip1'
        });
    });

});
