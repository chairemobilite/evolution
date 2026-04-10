/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _cloneDeep from 'lodash/cloneDeep';
import { getPersonVisitedPlacesTitleWidgetConfig } from '../widgetPersonVisitedPlacesTitle';
import { interviewAttributesForTestCases, widgetFactoryOptions } from '../../../../../tests/surveys';

const mockGetFormattedDate = widgetFactoryOptions.getFormattedDate as jest.MockedFunction<typeof widgetFactoryOptions.getFormattedDate>;

const visitedPlacesSectionConfig = {
    type: 'visitedPlaces' as const,
    enabled: true,
    tripDiaryMinTimeOfDay: 4 * 60 * 60, // 4h in seconds
    tripDiaryMaxTimeOfDay: 28 * 60 * 60 // 28h in seconds (i.e. 4h the next day)
};

const setActiveJourney = (
    interview: typeof interviewAttributesForTestCases,
    personId: string | undefined,
    journeyId: string | undefined
) => {
    interview.response._activePersonId = personId;
    interview.response._activeJourneyId = journeyId;
};

beforeEach(() => {
    jest.clearAllMocks();
});

describe('getPersonVisitedPlacesTitleWidgetConfig', () => {
    it('should return the correct widget config', () => {

        const widgetConfig = getPersonVisitedPlacesTitleWidgetConfig(visitedPlacesSectionConfig, widgetFactoryOptions);

        expect(widgetConfig).toEqual({
            type: 'text',
            align: 'left',
            containsHtml: true,
            text: expect.any(Function)
        });
    });
});

describe('personsTripsTitleWidgetConfig text', () => {

    const widgetText = getPersonVisitedPlacesTitleWidgetConfig(visitedPlacesSectionConfig, widgetFactoryOptions).text as any;
    // Mock the translation function to just return the key for easier testing of parameters
    const mockedT = jest.fn().mockImplementation((str: any) => str);
    // Extract the journey date for use in expected parameters in tests
    const journeyDate = interviewAttributesForTestCases.response.household!.persons!.personId1.journeys!.journeyId1.startDate;
   
    test('should call translation with correct parameters if no active journey', () => {
        const testInterview = _cloneDeep(interviewAttributesForTestCases);
        setActiveJourney(testInterview, 'personId1', undefined);
        expect(() => widgetText(mockedT, testInterview, 'path')).toThrow('Active person or journey not found in interview response');
        expect(mockedT).not.toHaveBeenCalled();
        expect(widgetFactoryOptions.getFormattedDate).not.toHaveBeenCalled();
    });

    test('should call translation with correct parameters if one person household and no journey dates', () => {
        const testInterview = _cloneDeep(interviewAttributesForTestCases);
        setActiveJourney(testInterview, 'personId1', 'journeyId1');
        // Delete other persons
        delete testInterview.response.household!.persons!.personId2;
        delete testInterview.response.household!.persons!.personId3;
        expect(widgetText(mockedT, testInterview, 'path')).toEqual('visitedPlaces:personVisitedPlacesTitle');
        expect(mockedT).toHaveBeenCalledWith('visitedPlaces:personVisitedPlacesTitle', {
            context: undefined,
            count: 1,
            nickname: 'survey:personWithSequenceAndAge', // Default nickname for person without one
            journeyDate
        });
        expect(widgetFactoryOptions.getFormattedDate).toHaveBeenCalledWith(
            journeyDate,
            { withDayOfWeek: true, withRelative: true }
        );
    });

    test('should call translation with correct parameters if multiple person household and journey with start date', () => {
        const testInterview = _cloneDeep(interviewAttributesForTestCases);
        setActiveJourney(testInterview, 'personId1', 'journeyId1');
        // Set a nickname for the person
        testInterview.response.household!.persons!.personId1.nickname = 'Jane';

        expect(widgetText(mockedT, testInterview, 'path')).toEqual('visitedPlaces:personVisitedPlacesTitle');
        expect(mockedT).toHaveBeenCalledWith('visitedPlaces:personVisitedPlacesTitle', {
            context: undefined,
            count: 3,
            nickname: 'Jane',
            journeyDate
        });
        expect(widgetFactoryOptions.getFormattedDate).toHaveBeenCalledWith(
            journeyDate,
            { withDayOfWeek: true, withRelative: true }
        );
    });
});
