/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _cloneDeep from 'lodash/cloneDeep';
import { QuestionWidgetConfig } from '../../../../questionnaire/types';
import { getModeOtherSpecifyWidgetConfig } from '../widgetSegmentModeOtherSpecify';
import { interviewAttributesForTestCases, widgetFactoryOptions } from '../../../../../tests/surveys';
import { setResponse, translateString } from '../../../../../utils/helpers';
import * as validations from '../../../../widgets/validations/validations';

const segmentPath = 'household.persons.personId2.journeys.journeyId2.trips.tripId1P2.segments.segmentId1P2T1';

describe('getModeOtherSpecifyWidgetConfig', () => {
    test('should return the expected widget configuration', () => {
        const widgetConfig = getModeOtherSpecifyWidgetConfig(widgetFactoryOptions);
        expect(widgetConfig).toEqual({
            type: 'question',
            path: 'modeOtherSpecify',
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
        const widgetConfig = getModeOtherSpecifyWidgetConfig(widgetFactoryOptions) as QuestionWidgetConfig;
        translateString(widgetConfig.label, { t: mockedT } as any, interviewAttributesForTestCases, `${segmentPath}.modeOtherSpecify`);
        expect(mockedT).toHaveBeenCalledWith('segments:segmentModeOtherSpecify');
    });
});

describe('getModeOtherSpecifyWidgetConfig conditional', () => {
    const widgetConfig = getModeOtherSpecifyWidgetConfig(widgetFactoryOptions) as QuestionWidgetConfig;

    test.each([
        ['other', [true, null]],
        ['walk', [false, null]],
        ['plane', [false, null]],
        [null, [false, null]]
    ])('mode %s should return %j', (mode, expected) => {
        const interview = _cloneDeep(interviewAttributesForTestCases);
        setResponse(interview, `${segmentPath}.mode`, mode);
        expect(widgetConfig.conditional?.(interview, `${segmentPath}.modeOtherSpecify`)).toEqual(expected);
    });
});
