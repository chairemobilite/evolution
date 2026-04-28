/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _cloneDeep from 'lodash/cloneDeep';
import { getPersonsTripsTitleWidgetConfig } from '../widgetPersonTripsTitle';
import { interviewAttributesForTestCases, setActiveSurveyObjects, widgetFactoryOptions } from '../../../../../tests/surveys';

const mockGetFormattedDate = widgetFactoryOptions.getFormattedDate as jest.MockedFunction<typeof widgetFactoryOptions.getFormattedDate>;
mockGetFormattedDate.mockReturnValue('formattedDate');

beforeEach(() => {
    jest.clearAllMocks();
});

describe('getPersonsTripsTitleWidgetConfig', () => {
    it('should return the correct widget config', () => {

        const widgetConfig = getPersonsTripsTitleWidgetConfig(widgetFactoryOptions);

        expect(widgetConfig).toEqual({
            type: 'text',
            align: 'left',
            text: expect.any(Function)
        });
    });
});

describe('personsTripsTitleWidgetConfig text', () => {

    const options = {
        ...widgetFactoryOptions,
        context: jest.fn().mockImplementation((context: string) => context)
    };

    const widgetText = getPersonsTripsTitleWidgetConfig(options).text as any;
    const mockedT = jest.fn().mockReturnValue('translatedString');
   
    test('should call translation with correct parameters if no person/journey context', () => {
        const testInterview = _cloneDeep(interviewAttributesForTestCases);
        setActiveSurveyObjects(testInterview, { personId: undefined, journeyId: undefined });
        // Path that does not correspond to any journey context
        expect(() => widgetText(mockedT, testInterview)).toThrow('personTripsTitle: Person or Journey not found');
        expect(mockedT).not.toHaveBeenCalled();
    });

    test('should call translation with correct parameters if one person household and no journey dates', () => {
        const testInterview = _cloneDeep(interviewAttributesForTestCases);
        setActiveSurveyObjects(testInterview, { personId: 'personId1', journeyId: 'journeyId1' });
        // Correct path and delete other persons and date
        const personIds = Object.keys(testInterview.response.household!.persons!);
        for (const personId of personIds) {
            if (personId !== 'personId1') {
                delete testInterview.response.household!.persons![personId];
            }
        }
        delete testInterview.response.household!.persons!.personId1.journeys!.journeyId1.startDate;
        expect(widgetText(mockedT, testInterview)).toEqual('translatedString');
        expect(mockedT).toHaveBeenCalledWith(['customSurvey:segments:Description', 'segments:Description'], {
            context: 'undated',
            count: 1,
            nickname: '',
            journeyDates: null
        });
        expect(options.context).toHaveBeenCalledWith('undated');
    });

    test('should call translation with correct parameters if multiple person household and journey with start date', () => {
        const testInterview = _cloneDeep(interviewAttributesForTestCases);
        setActiveSurveyObjects(testInterview, { personId: 'personId1', journeyId: 'journeyId1' });
        // Add a nickname to person and start date to the journey
        const nickname = 'Jane';
        testInterview.response.household!.persons!.personId1.nickname = nickname;
        testInterview.response.household!.persons!.personId1.journeys!.journeyId1.startDate = '2024-01-01';

        expect(widgetText(mockedT, testInterview)).toEqual('translatedString');
        expect(mockedT).toHaveBeenCalledWith(['customSurvey:segments:Description', 'segments:Description'], {
            context: undefined,
            count: 3,
            nickname,
            journeyDates: 'formattedDate'
        });
        expect(options.context).toHaveBeenCalledWith(undefined);
    });

});
