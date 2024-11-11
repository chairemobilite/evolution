/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _cloneDeep from 'lodash/cloneDeep';
import { getTripSegmentsIntro } from '../widgetTripSegmentsIntro';
import { interviewAttributesForTestCases } from '../../../../tests/surveys';
import * as odHelpers from '../../../odSurvey/helpers';

jest.mock('../../../odSurvey/helpers', () => ({
    getPerson: jest.fn().mockReturnValue({}),
    getActiveJourney: jest.fn().mockReturnValue({}),
    getActiveTrip: jest.fn().mockReturnValue({}),
    getVisitedPlaces: jest.fn().mockReturnValue({}),
    getOrigin: jest.fn().mockReturnValue({ activity: 'home', _uuid: 'originuuid', _sequence: 1 }),
    getDestination: jest.fn().mockReturnValue({ activity: 'work', _uuid: 'originuuid', _sequence: 2 }),
    getVisitedPlaceName: jest.fn().mockReturnValue('visitedPlaceName'),
    getCountOrSelfDeclared: jest.fn().mockReturnValue(1)
}));
const mockedGetPerson = odHelpers.getPerson as jest.MockedFunction<typeof odHelpers.getPerson>;
const mockedGetActiveJourney = odHelpers.getActiveJourney as jest.MockedFunction<typeof odHelpers.getActiveJourney>;
const mockedGetActiveTrip = odHelpers.getActiveTrip as jest.MockedFunction<typeof odHelpers.getActiveTrip>;
const mockedGetVisitedPlaces = odHelpers.getVisitedPlaces as jest.MockedFunction<typeof odHelpers.getVisitedPlaces>;
const mockedGetOrigin = odHelpers.getOrigin as jest.MockedFunction<typeof odHelpers.getOrigin>;
const mockedGetDestination = odHelpers.getDestination as jest.MockedFunction<typeof odHelpers.getDestination>;
const mockedGetVisitedPlaceName = odHelpers.getVisitedPlaceName as jest.MockedFunction<typeof odHelpers.getVisitedPlaceName>;
const mockedGetCountOrSelfDeclared = odHelpers.getCountOrSelfDeclared as jest.MockedFunction<typeof odHelpers.getCountOrSelfDeclared>;

beforeEach(() => {
    jest.clearAllMocks();
})

describe('getTripSegmentsIntro', () => {
    it('should return the correct widget config', () => {

        const options = {
            context: jest.fn()
        };

        const widgetConfig = getTripSegmentsIntro(options);

        expect(widgetConfig).toEqual({
            type: 'text',
            text: expect.any(Function)
        });
    });
});

describe('tripSegmentsIntro text', () => {

    const options = {
        context: jest.fn()
    };

    const widgetText = getTripSegmentsIntro(options).text as any;
    const mockedT = jest.fn().mockReturnValue('translatedString');
   
    test('should return empty if no person', () => {
        mockedGetPerson.mockReturnValueOnce(null);
        expect(widgetText(mockedT, interviewAttributesForTestCases, 'path')).toEqual('');
        expect(mockedGetVisitedPlaceName).not.toHaveBeenCalled();
        expect(mockedGetVisitedPlaces).not.toHaveBeenCalled();
        expect(mockedT).not.toHaveBeenCalled();
    });

    test('should return empty if no active journey', () => {
        mockedGetActiveJourney.mockReturnValueOnce(null);
        expect(widgetText(mockedT, interviewAttributesForTestCases, 'path')).toEqual('');
        expect(mockedGetVisitedPlaceName).not.toHaveBeenCalled();
        expect(mockedGetVisitedPlaces).not.toHaveBeenCalled();
        expect(mockedT).not.toHaveBeenCalled();
    });

    test('should return empty if no active trip', () => {
        mockedGetActiveTrip.mockReturnValueOnce(null);
        expect(widgetText(mockedT, interviewAttributesForTestCases, 'path')).toEqual('');
        expect(mockedGetVisitedPlaceName).not.toHaveBeenCalled();
        expect(mockedGetVisitedPlaces).not.toHaveBeenCalled();
        expect(mockedT).not.toHaveBeenCalled();
    });

    test('should return empty if no origin', () => {
        mockedGetOrigin.mockReturnValueOnce(null);
        expect(widgetText(mockedT, interviewAttributesForTestCases, 'path')).toEqual('');
        expect(mockedGetVisitedPlaceName).not.toHaveBeenCalled();
        expect(mockedGetVisitedPlaces).toHaveBeenCalled();
        expect(mockedT).not.toHaveBeenCalled();
    });

    test('should return empty if no destination', () => {
        mockedGetDestination.mockReturnValueOnce(null);
        expect(widgetText(mockedT, interviewAttributesForTestCases, 'path')).toEqual('');
        expect(mockedGetVisitedPlaceName).not.toHaveBeenCalled();
        expect(mockedGetVisitedPlaces).toHaveBeenCalled();
        expect(mockedT).not.toHaveBeenCalled();
    });

    test('should return correct string with normal activities', () => {
        mockedGetVisitedPlaceName.mockReturnValueOnce('originName').mockReturnValueOnce('destinationName');
        expect(widgetText(mockedT, interviewAttributesForTestCases, 'path')).toEqual('translatedString');
        expect(mockedGetVisitedPlaceName).toHaveBeenCalledTimes(2);
        expect(mockedGetVisitedPlaces).toHaveBeenCalled();
        expect(mockedT).toHaveBeenCalledWith(['customSurvey:segments:CurrentTripSegmentsIntro', 'segments:CurrentTripSegmentsIntro'], {
            context: 'work',
            count: 1,
            originName: 'originName',
            destinationName: 'destinationName'
        });
        expect(options.context).toHaveBeenCalledWith('work');
    });

    test('should return correct string with loop activity at origin', () => {
        mockedGetOrigin.mockReturnValueOnce({ activity: 'leisureStroll', _uuid: 'originuuid', _sequence: 1 });
        mockedGetVisitedPlaceName.mockReturnValueOnce('originName').mockReturnValueOnce('destinationName');
        expect(widgetText(mockedT, interviewAttributesForTestCases, 'path')).toEqual('translatedString');
        expect(mockedGetVisitedPlaceName).toHaveBeenCalledTimes(2);
        expect(mockedGetVisitedPlaces).toHaveBeenCalled();
        expect(mockedT).toHaveBeenCalledWith(['customSurvey:segments:CurrentTripSegmentsIntro', 'segments:CurrentTripSegmentsIntro'], {
            context: 'leisureStroll',
            count: 1,
            originName: 'originName',
            destinationName: 'destinationName'
        });
        expect(options.context).toHaveBeenCalledWith('leisureStroll');
    });

    test('should return correct string with normal activities and no context function', () => {
        const widgetText = getTripSegmentsIntro().text as any;
        mockedGetOrigin.mockReturnValueOnce({ activity: 'leisureStroll', _uuid: 'originuuid', _sequence: 1 });
        mockedGetVisitedPlaceName.mockReturnValueOnce('originName').mockReturnValueOnce('destinationName');
        expect(widgetText(mockedT, interviewAttributesForTestCases, 'path')).toEqual('translatedString');
        expect(mockedGetVisitedPlaceName).toHaveBeenCalledTimes(2);
        expect(mockedGetVisitedPlaces).toHaveBeenCalled();
        expect(mockedT).toHaveBeenCalledWith(['customSurvey:segments:CurrentTripSegmentsIntro', 'segments:CurrentTripSegmentsIntro'], {
            context: 'leisureStroll',
            count: 1,
            originName: 'originName',
            destinationName: 'destinationName'
        });
    });

    test('should return correct string with normal activities, context and person count', () => {
        const context = 'context';
        const count = 3;
        options.context.mockReturnValueOnce('context');
        mockedGetCountOrSelfDeclared.mockReturnValueOnce(count);

        mockedGetVisitedPlaceName.mockReturnValueOnce('originName').mockReturnValueOnce('destinationName');
        expect(widgetText(mockedT, interviewAttributesForTestCases, 'path')).toEqual('translatedString');
        expect(mockedGetVisitedPlaceName).toHaveBeenCalledTimes(2);
        expect(mockedGetVisitedPlaces).toHaveBeenCalled();
        expect(mockedT).toHaveBeenCalledWith(['customSurvey:segments:CurrentTripSegmentsIntro', 'segments:CurrentTripSegmentsIntro'], {
            context,
            count,
            originName: 'originName',
            destinationName: 'destinationName'
        });
        expect(options.context).toHaveBeenCalledWith('work');
    });

});
