/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _cloneDeep from 'lodash/cloneDeep';
import { getPersonsTripsTitleWidgetConfig } from '../widgetPersonTripsTitle';
import { interviewAttributesForTestCases } from '../../../../../tests/surveys';
import * as odHelpers from '../../../../odSurvey/helpers';

jest.mock('../../../../odSurvey/helpers', () => ({
    getActivePerson: jest.fn().mockReturnValue({}),
    getActiveJourney: jest.fn().mockReturnValue({}),
    getCountOrSelfDeclared: jest.fn().mockReturnValue(1)
}));
const mockedGetActivePerson = odHelpers.getActivePerson as jest.MockedFunction<typeof odHelpers.getActivePerson>;
const mockedGetActiveJourney = odHelpers.getActiveJourney as jest.MockedFunction<typeof odHelpers.getActiveJourney>;
const mockedGetCountOrSelfDeclared = odHelpers.getCountOrSelfDeclared as jest.MockedFunction<typeof odHelpers.getCountOrSelfDeclared>;

const mockGetFormattedDate = jest.fn().mockReturnValue('formattedDate');

beforeEach(() => {
    jest.clearAllMocks();
});

describe('getPersonsTripsTitleWidgetConfig', () => {
    it('should return the correct widget config', () => {

        const options = {
            context: jest.fn(),
            getFormattedDate: mockGetFormattedDate
        };

        const widgetConfig = getPersonsTripsTitleWidgetConfig(options);

        expect(widgetConfig).toEqual({
            type: 'text',
            align: 'left',
            text: expect.any(Function)
        });
    });
});

describe('personsTripsTitleWidgetConfig text', () => {

    const options = {
        context: jest.fn().mockImplementation((context: string) => context),
        getFormattedDate: mockGetFormattedDate
    };

    const widgetText = getPersonsTripsTitleWidgetConfig(options).text as any;
    const mockedT = jest.fn().mockReturnValue('translatedString');
   
    test('should call translation with correct parameters if no active person', () => {
        mockedGetActivePerson.mockReturnValueOnce(null);
        mockedGetActiveJourney.mockReturnValueOnce(null);
        expect(widgetText(mockedT, interviewAttributesForTestCases, 'path')).toEqual('translatedString');
        expect(mockedT).toHaveBeenCalledWith(['customSurvey:segments:Description', 'segments:Description'], {
            context: 'undated',
            count: 1,
            nickname: '',
            journeyDates: null
        });
        expect(options.context).toHaveBeenCalledWith('undated');
    });

    test('should call translation with correct parameters if no active journey', () => {
        const nickname = 'Jane'
        mockedGetActivePerson.mockReturnValueOnce({ _uuid: 'person1', _sequence: 1, nickname });
        mockedGetActiveJourney.mockReturnValueOnce(null);
        expect(widgetText(mockedT, interviewAttributesForTestCases, 'path')).toEqual('translatedString');
        expect(mockedT).toHaveBeenCalledWith(['customSurvey:segments:Description', 'segments:Description'], {
            context: 'undated',
            count: 1,
            nickname,
            journeyDates: null
        });
        expect(options.context).toHaveBeenCalledWith('undated');
    });

    test('should call translation with correct parameters if one person household and no journey dates', () => {
        mockedGetActivePerson.mockReturnValueOnce({ _uuid: 'person1', _sequence: 1 });
        mockedGetActiveJourney.mockReturnValueOnce({ _uuid: 'journey1', _sequence: 1 });
        expect(widgetText(mockedT, interviewAttributesForTestCases, 'path')).toEqual('translatedString');
        expect(mockedT).toHaveBeenCalledWith(['customSurvey:segments:Description', 'segments:Description'], {
            context: 'undated',
            count: 1,
            nickname: '',
            journeyDates: null
        });
        expect(options.context).toHaveBeenCalledWith('undated');
    });

    test('should call translation with correct parameters if multiple person household and journey with start date', () => {
        const nickname = 'Jane'
        mockedGetActivePerson.mockReturnValueOnce({ _uuid: 'person1', _sequence: 1, nickname });
        mockedGetActiveJourney.mockReturnValueOnce({ _uuid: 'journey1', _sequence: 1, startDate: '2024-11-18' });
        mockedGetCountOrSelfDeclared.mockReturnValueOnce(2);
        expect(widgetText(mockedT, interviewAttributesForTestCases, 'path')).toEqual('translatedString');
        expect(mockedT).toHaveBeenCalledWith(['customSurvey:segments:Description', 'segments:Description'], {
            context: undefined,
            count: 2,
            nickname,
            journeyDates: 'formattedDate'
        });
        expect(options.context).toHaveBeenCalledWith(undefined);
    });

});
