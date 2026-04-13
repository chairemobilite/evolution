/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _cloneDeep from 'lodash/cloneDeep';

import { getButtonConfirmGotoNextSectionWidgetConfig } from '../buttonConfirmGotoNextSection';
import { interviewAttributesForTestCases, setActiveSurveyObjects, widgetFactoryOptions } from '../../../../../tests/surveys';
import * as utilHelpers from '../../../../../utils/helpers';
import * as odHelpers from '../../../../odSurvey/helpers';

const visitedPlacesSectionConfig = {
    type: 'visitedPlaces' as const,
    enabled: true,
    tripDiaryMinTimeOfDay: 4 * 60 * 60, // 4h in seconds
    tripDiaryMaxTimeOfDay: 28 * 60 * 60 // 28h in seconds (i.e. 4h the next day)
};

beforeEach(() => {
    jest.clearAllMocks();
})

describe('getButtonConfirmGotoNextSectionWidgetConfig', () => {

    test('should return the correct widget config', () => {
        const widgetConfig = getButtonConfirmGotoNextSectionWidgetConfig(visitedPlacesSectionConfig, widgetFactoryOptions);
        expect(widgetConfig).toEqual({
            type: 'button',
            color: 'green',
            label: expect.any(Function),
            hideWhenRefreshing: true,
            path: 'buttonValidateGotoNextSection',
            icon: 'check-circle',
            align: 'center',
            action: widgetFactoryOptions.buttonActions.validateButtonActionWithCompleteSection,
            conditional: expect.any(Function)
        });
    });

});

describe('getButtonConfirmGotoNextSectionWidgetConfig label', () => {
    const widgetConfig = getButtonConfirmGotoNextSectionWidgetConfig(visitedPlacesSectionConfig, widgetFactoryOptions);

    test('should return the right label for title', () => {
        const mockedT = jest.fn();
        const title = widgetConfig.label;
        expect(title).toBeDefined();
        utilHelpers.translateString(title, { t: mockedT } as any, interviewAttributesForTestCases, 'path');
        // FIXME Base button had the old custom survey translation. Change when #1441 is fixed
        expect(mockedT).toHaveBeenCalledWith(['customSurvey:visitedPlaces:saveAndContinue', 'visitedPlaces:saveAndContinue']);
    });

});

describe('ButtonConfirmGotoNextSectionWidget widget conditional', () => {
    const widgetConfig = getButtonConfirmGotoNextSectionWidgetConfig(visitedPlacesSectionConfig, widgetFactoryOptions);
    const conditional = widgetConfig.conditional;
    let interview = _cloneDeep(interviewAttributesForTestCases);

    beforeEach(() => {
        interview = _cloneDeep(interviewAttributesForTestCases);
        // Set the active journey
        setActiveSurveyObjects(interview, { personId: 'personId1', journeyId: 'journeyId1' });
    });

    test.each([{
        title: 'no active journey',
        setup: () => setActiveSurveyObjects(interview, { personId: 'personId1', journeyId: undefined }),
        expected: false
    }, {
        title: 'last visited place has nextPlaceCategory different from stayedThereUntilTheNextDay',
        setup: () => {
            const journey = interview.response.household!.persons!.personId1!.journeys!.journeyId1!;
            const visitedPlacesArray = odHelpers.getVisitedPlacesArray({ journey });
            const lastPlace = visitedPlacesArray[visitedPlacesArray.length - 1];
            lastPlace.nextPlaceCategory = 'wentBackHome';
        },
        expected: false
    }, {
        title: 'last visited place has nextPlaceCategory stayedThereUntilTheNextDay',
        setup: () => {
            const journey = interview.response.household!.persons!.personId1!.journeys!.journeyId1!;
            const visitedPlacesArray = odHelpers.getVisitedPlacesArray({ journey });
            const lastPlace = visitedPlacesArray[visitedPlacesArray.length - 1];
            lastPlace.nextPlaceCategory = 'stayedThereUntilTheNextDay';
        },
        expected: true
    }])('$title', ({ setup, expected }) => {
        setup();

        expect(conditional?.(interview, 'unimportant path')).toEqual(expected);
    });

});