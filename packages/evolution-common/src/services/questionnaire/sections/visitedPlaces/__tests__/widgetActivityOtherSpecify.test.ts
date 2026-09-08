/*
 * Copyright 2026, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _cloneDeep from 'lodash/cloneDeep';
import { QuestionWidgetConfig } from '../../../../questionnaire/types';
import { getActivityOtherSpecifyWidgetConfig } from '../widgetActivityOtherSpecify';
import { interviewAttributesForTestCases, widgetFactoryOptions } from '../../../../../tests/surveys';
import { setResponse, translateString } from '../../../../../utils/helpers';
import * as validations from '../../../../widgets/validations/validations';

const visitedPlacePath = 'household.persons.personId1.journeys.journeyId1.visitedPlaces.workPlace1P1';

describe('getActivityOtherSpecifyWidgetConfig', () => {
    test('should return the expected widget configuration', () => {
        const widgetConfig = getActivityOtherSpecifyWidgetConfig(widgetFactoryOptions);
        expect(widgetConfig).toEqual({
            type: 'question',
            path: 'activityOtherSpecify',
            inputType: 'string',
            datatype: 'string',
            twoColumns: false,
            label: expect.any(Function),
            conditional: expect.any(Function),
            validations: validations.requiredValidation
        });
    });

    test('should translate the label', () => {
        const mockedT = jest.fn();
        const widgetConfig = getActivityOtherSpecifyWidgetConfig(widgetFactoryOptions) as QuestionWidgetConfig;
        translateString(widgetConfig.label, { t: mockedT } as any, interviewAttributesForTestCases, `${visitedPlacePath}.activityOtherSpecify`);
        expect(mockedT).toHaveBeenCalledWith('visitedPlaces:visitedPlaceActivityOtherSpecify');
    });
});

describe('getActivityOtherSpecifyWidgetConfig conditional', () => {
    const widgetConfig = getActivityOtherSpecifyWidgetConfig(widgetFactoryOptions) as QuestionWidgetConfig;

    test.each([
        { activity: 'other', conditional: [true, null] },
        { activity: 'home', conditional: [false, null] },
        { activity: 'shopping', conditional: [false, null] },
        { activity: null, conditional: [false, null] }
    ])('activity $activity should return conditional $conditional', ({ activity, conditional }) => {
        const interview = _cloneDeep(interviewAttributesForTestCases);
        setResponse(interview, `${visitedPlacePath}.activity`, activity);
        expect(widgetConfig.conditional?.(interview, `${visitedPlacePath}.activityOtherSpecify`)).toEqual(conditional);
    });
});
