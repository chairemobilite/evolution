/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _cloneDeep from 'lodash/cloneDeep';
import each from 'jest-each';

import { getSameAsReverseTripWidgetConfig } from '../widgetSameAsReverseTrip';
import { interviewAttributesForTestCases } from '../../../../tests/surveys';
import { InputRadioType, QuestionWidgetConfig, RadioChoiceType } from '../../../widgets';
import { translateString } from '../../../../utils/helpers';
import * as surveyHelper from '../../../odSurvey/helpers';

import { shouldShowSameAsReverseTripQuestion, getPreviousTripSingleSegment } from '../helpers';

jest.mock('../helpers', () => ({
    shouldShowSameAsReverseTripQuestion: jest.fn(),
    getPreviousTripSingleSegment: jest.fn()
}));
const mockedShouldShowSameAsReverseTripQuestion = shouldShowSameAsReverseTripQuestion as jest.MockedFunction<typeof shouldShowSameAsReverseTripQuestion>;
const mockedGetPreviousTripSingleSegment = getPreviousTripSingleSegment as jest.MockedFunction<typeof getPreviousTripSingleSegment>;

describe('getSameAsReverseTripWidgetConfig', () => {

    test('should return the correct widget config', () => {
        const widgetConfig = getSameAsReverseTripWidgetConfig();
        expect(widgetConfig).toEqual({
            type: 'question',
            path: 'sameModeAsReverseTrip',
            inputType: 'radio',
            twoColumns: false,
            datatype: 'boolean',
            label: expect.any(Function),
            choices: [
                expect.objectContaining({
                    value: true,
                    label: expect.any(Function)
                }),
                expect.objectContaining({
                    value: false,
                    label: expect.any(Function),
                }),
            ],
            validations: expect.any(Function),
            conditional: expect.any(Function)
        });
    });

});

describe('sameAsReverseTripWidget choice labels', () => {
    // Prepare test data with active person/journey/trip
    const widgetConfig = getSameAsReverseTripWidgetConfig({}) as QuestionWidgetConfig & InputRadioType;
    const choices = widgetConfig.choices as RadioChoiceType[];

    each([
        [true, 'survey:Yes'],
        [false, 'survey:No']
    ]).test('should return the right label for %s choice', (choiceValue, expectedLabel) => {
        const mockedT = jest.fn();
        const choice = choices.find((choice) => choice.value === choiceValue);
        expect(choice).toBeDefined();
        translateString(choice?.label, { t: mockedT } as any, interviewAttributesForTestCases, 'path');
        expect(mockedT).toHaveBeenCalledWith(expectedLabel);
    });
});

describe('sameAsReverseTripWidget conditional', () => {

    const widgetConfig = getSameAsReverseTripWidgetConfig({}) as QuestionWidgetConfig & InputRadioType;
    const conditional = widgetConfig.conditional;
    const segmentPath = 'household.persons.personId2.journeys.journeyId2.trips.tripId1P2.segments.segmentId1P2T1';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should be displayed if shouldShowSameAsReverseTripQuestion returns true', () => {
        mockedShouldShowSameAsReverseTripQuestion.mockReturnValueOnce(true);

        // Test conditional
        const result = conditional!(interviewAttributesForTestCases, `${segmentPath}.sameModeAsReverseTrip`);
        expect(result).toEqual([true, null]);
    });

    test('should not be displayed if shouldShowSameAsReverseTripQuestion returns false', () => {
        mockedShouldShowSameAsReverseTripQuestion.mockReturnValueOnce(false);

        // Test conditional
        const result = conditional!(interviewAttributesForTestCases, `${segmentPath}.sameModeAsReverseTrip`);
        expect(result).toEqual([false, null]);
    });
});

describe('sameAsReverseTripWidget validations', () => {

    // Prepare test data with active person/journey/trip
    const interview = _cloneDeep(interviewAttributesForTestCases);

    const widgetConfig = getSameAsReverseTripWidgetConfig({}) as QuestionWidgetConfig & InputRadioType;
    const validations = widgetConfig.validations;

    test('Valid response', () => {
        expect(validations!(true, null, interview, 'household.persons.personId2.journeys.journeyId2.trips.tripId1P2.segments.segmentId1P2T1.sameModeAsReverseTrip'))
            .toEqual([{ validation: false, errorMessage: expect.anything() }]);
        expect(validations!(false, null, interview, 'household.persons.personId2.journeys.journeyId2.trips.tripId1P2.segments.segmentId1P2T1.sameModeAsReverseTrip'))
            .toEqual([{ validation: false, errorMessage: expect.anything() }]);
    });

    test('empty response', () => {
        expect(validations!(null, null, interview, 'household.persons.personId2.journeys.journeyId2.trips.tripId1P2.segments.segmentId1P2T1.sameModeAsReverseTrip'))
            .toEqual([{ validation: true, errorMessage: expect.anything() }]);
    });

    test('should return the right error message', () => {
        const validation = validations!(null, null, interview, 'household.persons.personId2.journeys.journeyId2.trips.tripId1P2.segments.segmentId1P2T1.sameModeAsReverseTrip');
        const mockedT = jest.fn();
        translateString(validation[0].errorMessage, { t: mockedT } as any, interview, 'path');
        expect(mockedT).toHaveBeenCalledWith(['customSurvey:ResponseIsRequired', 'survey:ResponseIsRequired']);
    });


});

describe('sameAsReverseTripWidget label', () => {
    // Mock a few functions
    jest.spyOn(surveyHelper, 'getCountOrSelfDeclared').mockReturnValue(1);
    const mockedT = jest.fn().mockReturnValue('translatedString');
    const mockedGetContext = jest.fn();

    const widgetConfig = getSameAsReverseTripWidgetConfig({ context: mockedGetContext }) as QuestionWidgetConfig & InputRadioType;
    const label = widgetConfig.label;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('With return home, context and previous segment', () => {
        // tripId2P1 is return trip home
        const baseTestInterview = _cloneDeep(interviewAttributesForTestCases);
        baseTestInterview.responses._activePersonId = 'personId1';
        baseTestInterview.responses._activeJourneyId = 'journeyId1';
        baseTestInterview.responses._activeTripId = 'tripId2P1';

        // Return the previous segment
        mockedGetPreviousTripSingleSegment.mockReturnValueOnce({ _isNew: false, modePre: 'walk', mode: 'walk', _uuid: 'segmentId1P1T1', _sequence: 1 });

        // Add a context
        const context = 'currentContext';
        mockedGetContext.mockReturnValueOnce(context);

        translateString(label, { t: mockedT } as any, baseTestInterview, 'path');
        expect(mockedT).toHaveBeenCalledTimes(2);
        expect(mockedT).toHaveBeenCalledWith(['customSurvey:segments:SegmentSameModeReturnHome', 'segments:SegmentSameModeReturnHome'], {
            context,
            previousMode: 'translatedString',
            count: 1
        });
        expect(mockedT).toHaveBeenCalledWith(['customSurvey:segments:mode:short:walk', 'segments:mode:short:walk']);
    });

    test('With return to other place, no context and missing previous segment', () => {
        // tripId3P1 would be a return to another place (it's not really a simple loop, but the label does not validate it, the conditional should have done it)
        const baseTestInterview = _cloneDeep(interviewAttributesForTestCases);
        baseTestInterview.responses._activePersonId = 'personId1';
        baseTestInterview.responses._activeJourneyId = 'journeyId1';
        baseTestInterview.responses._activeTripId = 'tripId3P1';

        // No previous segment
        mockedGetPreviousTripSingleSegment.mockReturnValueOnce(undefined);

        translateString(label, { t: mockedT } as any, baseTestInterview, 'path');
        expect(mockedT).toHaveBeenCalledTimes(1);
        expect(mockedT).toHaveBeenCalledWith(['customSurvey:segments:SegmentSameModeReturn', 'segments:SegmentSameModeReturn'], {
            context: undefined,
            previousMode: '',
            count: 1
        });
    });
});