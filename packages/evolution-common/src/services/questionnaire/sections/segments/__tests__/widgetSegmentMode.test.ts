/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _upperFirst from 'lodash/upperFirst';
import _cloneDeep from 'lodash/cloneDeep';
import each from 'jest-each';
import { InputRadioType, QuestionWidgetConfig, RadioChoiceType } from '../../../../questionnaire/types';
import { getModeWidgetConfig } from '../widgetSegmentMode';
import { interviewAttributesForTestCases, widgetFactoryOptions } from '../../../../../tests/surveys';
import { getResponse, setResponse, translateString } from '../../../../../utils/helpers';
import * as surveyHelper from '../../../../odSurvey/helpers';
import { Mode, ModePre, modePreToModeMap, modeToModePreMap, modeValues } from '../../../../odSurvey/types';
import { shouldShowSameAsReverseTripQuestion, getPreviousTripSingleSegment } from '../helpers';
import { modeToIconMapping } from '../modeIconMapping';

const segmentSectionConfig = {
    type: 'segments' as const,
    enabled: true
};

jest.mock('../helpers', () => ({
    ...jest.requireActual('../helpers'),
    shouldShowSameAsReverseTripQuestion: jest.fn().mockReturnValue(false),
    getPreviousTripSingleSegment: jest.fn()
}));
const mockedShouldShowSameAsReverseTripQuestion = shouldShowSameAsReverseTripQuestion as jest.MockedFunction<typeof shouldShowSameAsReverseTripQuestion>;
const mockedGetPreviousTripSingleSegment = getPreviousTripSingleSegment as jest.MockedFunction<typeof getPreviousTripSingleSegment>;

describe('getModeWidgetConfig', () => {
    it('should return the correct widget config', () => {

        const options = {
            ...widgetFactoryOptions,
            context: jest.fn()
        };

        const widgetConfig = getModeWidgetConfig(segmentSectionConfig, options);

        expect(widgetConfig).toEqual({
            type: 'question',
            path: 'mode',
            inputType: 'radio',
            twoColumns: false,
            datatype: 'string',
            iconSize: '2.25em',
            columns: 2,
            label: expect.any(Function),
            choices: modeValues.map((mode) => expect.objectContaining({
                value: mode,
                label: expect.any(Function),
                conditional: expect.any(Function),
                iconPath: modeToIconMapping[mode]
            })),
            validations: expect.any(Function),
            conditional: expect.any(Function)
        });
    });
});

describe('Mode choices conditionals', () => {
    const widgetConfig = getModeWidgetConfig(segmentSectionConfig, widgetFactoryOptions) as QuestionWidgetConfig & InputRadioType;
    const choices = widgetConfig.choices as RadioChoiceType[];

    // Prepare test data with active person/journey/trip and a segment
    const interview = _cloneDeep(interviewAttributesForTestCases);
    interview.response._activePersonId = 'personId1';
    interview.response._activeJourneyId = 'journeyId1';
    interview.response._activeTripId = 'tripId1P1';
    setResponse(interview, 'household.persons.personId1.journeys.journeyId1.trips.tripId1P1.segments', { segmentId1P1T1: { _uuid: 'segmentId1P1T1', _sequence: 1 } });

    // Spy on a few functions to return disability conditions
    jest.spyOn(surveyHelper, 'personMayHaveDisability');
    jest.spyOn(surveyHelper, 'householdMayHaveDisability');
    const mockedPersonMayHaveDisability = surveyHelper.personMayHaveDisability as jest.MockedFunction<typeof surveyHelper.personMayHaveDisability>;
    const mockedHhMayHaveDisability = surveyHelper.householdMayHaveDisability as jest.MockedFunction<typeof surveyHelper.householdMayHaveDisability>;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // Test that modes appear when the right modePre is selected, use the
    // modePreToModeMap to get the values, but filter out the modes that have
    // specific conditionals and that will be tested separately
    each(
        modeValues.filter((mode) => !['wheelchair', 'mobilityScooter', 'paratransit'].includes(mode)).flatMap((mode) => Object.keys(modePreToModeMap).map((modePre) => [mode, modePre, modeToModePreMap[mode].includes(modePre as any)]))
    ).test('Test modePre conditional for mode %s with modePre %s: %s', (choiceValue, modePreValue, expected) => {
        // Find the right choice choice
        const modeChoice = choices.find((choice) => choice.value === choiceValue);
        expect(modeChoice).toBeDefined();
        setResponse(interview, 'household.persons.personId1.journeys.journeyId1.trips.tripId1P1.segments.segmentId1P1T1.modePre', modePreValue);
        const modeResult = modeChoice?.conditional?.(interview, 'household.persons.personId1.journeys.journeyId1.trips.tripId1P1.segments.segmentId1P1T1.mode');
        expect(modeResult).toEqual(expected);
    });

    // Test specific conditional for modes, where person may have disability
    each(
        ['wheelchair' as Mode, 'mobilityScooter' as Mode].flatMap((mode: Mode) => Object.keys(modePreToModeMap).flatMap((modePre) => [[true, mode, modePre, modeToModePreMap[mode].includes(modePre as ModePre)], [false, mode, modePre, modeToModePreMap[mode].includes(modePre as ModePre)]]))
    ).test('Test modePre with person may have disability (%s) conditional for mode %s with modePre %s: %s', (personMayHaveDisability, choiceValue, modePreValue, expectedIfTrue) => {
        // Spy on the personMayHaveDisability function
        if (expectedIfTrue) {
            mockedPersonMayHaveDisability.mockReturnValueOnce(personMayHaveDisability);
        }

        // Find the right choice choice
        const modeChoice = choices.find((choice) => choice.value === choiceValue);
        expect(modeChoice).toBeDefined();
        // Set the mode pre value
        setResponse(interview, 'household.persons.personId1.journeys.journeyId1.trips.tripId1P1.segments.segmentId1P1T1.modePre', modePreValue);
        const modeResult = modeChoice?.conditional?.(interview, 'household.persons.personId1.journeys.journeyId1.trips.tripId1P1.segments.segmentId1P1T1.mode');
        expect(modeResult).toEqual(personMayHaveDisability ? expectedIfTrue : false);
        if (expectedIfTrue) {
            expect(mockedPersonMayHaveDisability).toHaveBeenCalledWith({ person: interview.response.household!.persons!.personId1 });
        } else {
            expect(mockedPersonMayHaveDisability).not.toHaveBeenCalled();
        }
    });

    // Test specific conditional for modes, where they may be disabilities in the household
    each(
        ['paratransit' as Mode].flatMap((mode: Mode) => Object.keys(modePreToModeMap).flatMap((modePre) => [[true, mode, modePre, modeToModePreMap[mode].includes(modePre as ModePre)], [false, mode, modePre, modeToModePreMap[mode].includes(modePre as ModePre)]]))
    ).test('Test modePre with hh may have disability (%s) conditional for mode %s with modePre %s: %s', (hhMayHaveDisability, choiceValue, modePreValue, expectedIfTrue) => {
        // Spy on the householdMayHaveDisability function
        if (expectedIfTrue) {
            mockedHhMayHaveDisability.mockReturnValueOnce(hhMayHaveDisability);
        }

        // Find the right choice choice
        const modeChoice = choices.find((choice) => choice.value === choiceValue);
        expect(modeChoice).toBeDefined();
        // Set the mode pre value
        setResponse(interview, 'household.persons.personId1.journeys.journeyId1.trips.tripId1P1.segments.segmentId1P1T1.modePre', modePreValue);
        const modeResult = modeChoice?.conditional?.(interview, 'household.persons.personId1.journeys.journeyId1.trips.tripId1P1.segments.segmentId1P1T1.mode');
        expect(modeResult).toEqual(hhMayHaveDisability ? expectedIfTrue : false);
        if (expectedIfTrue) {
            expect(mockedHhMayHaveDisability).toHaveBeenCalledWith({ interview });
        } else {
            expect(mockedHhMayHaveDisability).not.toHaveBeenCalled();
        }
    });

});

describe('Mode choices labels', () => {
    // Prepare test data with active person/journey/trip
    const interview = _cloneDeep(interviewAttributesForTestCases);
    const widgetConfig = getModeWidgetConfig(segmentSectionConfig, widgetFactoryOptions) as QuestionWidgetConfig & InputRadioType;
    const choices = widgetConfig.choices as RadioChoiceType[];

    each(
        modeValues.map((mode) => [mode, [`customSurvey:segments:mode:${_upperFirst(mode)}`, `segments:mode:${_upperFirst(mode)}`]])
    ).test('should return the right label for %s choice', (choiceValue, expectedLabel) => {
        const mockedT = jest.fn();
        const choice = choices.find((choice) => choice.value === choiceValue);
        expect(choice).toBeDefined();
        translateString(choice?.label, { t: mockedT } as any, interview, 'path');
        expect(mockedT).toHaveBeenCalledWith(expectedLabel);
    });

});

describe('Mode validations', () => {
    // Prepare test data with active person/journey/trip
    const interview = _cloneDeep(interviewAttributesForTestCases);

    const widgetConfig = getModeWidgetConfig(segmentSectionConfig, widgetFactoryOptions) as QuestionWidgetConfig & InputRadioType;
    const validations = widgetConfig.validations;

    test('should return no error if value is not empty', () => {
        expect(validations!(null, null, interview, 'household.persons.personId2.journeys.journeyId2.trips.tripId1P2.segments.segmentId1P2T1.mode'))
            .toEqual([{ validation: true, errorMessage: expect.anything() }]);
    });

    test('should return an error if value is empty', () => {
        expect(validations!('carDriver', null, interview, 'household.persons.personId2.journeys.journeyId2.trips.tripId1P2.segments.segmentId1P2T1.mode'))
            .toEqual([{ validation: false, errorMessage: expect.anything() }]);
    });

    test('should return the right error message', () => {
        const validation = validations!('carDriver', null, interview, 'household.persons.personId2.journeys.journeyId2.trips.tripId1P2.segments.segmentId1P2T1.mode');
        const mockedT = jest.fn();
        translateString(validation[0].errorMessage, { t: mockedT } as any, interview, 'path');
        expect(mockedT).toHaveBeenCalledWith(['customSurvey:segments:ModeIsRequired', 'segments:ModeIsRequired']);
    });

});

describe('Mode conditional', () => {
    const widgetConfig = getModeWidgetConfig(segmentSectionConfig, widgetFactoryOptions) as QuestionWidgetConfig & InputRadioType;
    const conditional = widgetConfig.conditional;

    // Set modePre choices that should have single or multiple choices for mode
    const modePreWithSingleChoice = 'walk';
    const modePreWithMultipleChoices = 'bicycle';

    // Prepare base interview data for the test, with active person P2 and trip 1
    const testInterview = _cloneDeep(interviewAttributesForTestCases);
    testInterview.response._activePersonId = 'personId2';
    testInterview.response._activeJourneyId = 'journeyId2';
    testInterview.response._activeTripId = 'tripId1P2';
    // Set the segment's modePre to a mode that should resolve to multiple choices
    const segmentPath = 'household.persons.personId2.journeys.journeyId2.trips.tripId1P2.segments.segmentId1P2T1';
    setResponse(testInterview, `${segmentPath}.modePre`, modePreWithMultipleChoices);

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should not be displayed if modePre not set', () => {
        const interview = _cloneDeep(testInterview);
        // By default, set the modePre to undefined so each test will define it as required
        setResponse(interview, `${segmentPath}.modePre`, undefined);

        // Test conditional
        const result = conditional!(interview, `${segmentPath}.mode`);
        expect(result).toEqual([false, null]);
    });

    test('should be displayed, if modePre is set and there is more than one choice', () => {
        const interview = _cloneDeep(testInterview);
        // Set the segment's modePre to a mode that should resolve to multiple choices
        setResponse(interview, `${segmentPath}.modePre`, modePreWithMultipleChoices);

        // Test conditional
        const result = conditional!(testInterview, `${segmentPath}.mode`);
        expect(result).toEqual([true, null]);
    });

    test('should not be displayed, but initialized, if modePre is set and there is only one choice', () => {
        const interview = _cloneDeep(testInterview);
        // Set the segment's modePre to a mode that should resolve to multiple choices
        setResponse(interview, `${segmentPath}.modePre`, modePreWithSingleChoice);

        // Test conditional
        const result = conditional!(interview, `${segmentPath}.mode`);
        expect(result).toEqual([false, modePreWithSingleChoice]);
    });

    test('should not be displayed, but initialized, if modePre is set and there are no choices', () => {
        // PreferNotToAnswer has no choices
        const modeWithoutChoice = 'preferNotToAnswer';
        const interview = _cloneDeep(testInterview);
        // Set the segment's modePre to a mode that should resolve to multiple choices
        setResponse(interview, `${segmentPath}.modePre`, modeWithoutChoice);

        // Test conditional
        const result = conditional!(interview, `${segmentPath}.mode`);
        expect(result).toEqual([false, modeWithoutChoice]);
    });

    test('should be displayed if the same mode as reverse trip question is shown, but answered to `false`', () => {
        mockedShouldShowSameAsReverseTripQuestion.mockReturnValueOnce(true);

        // Prepare interview data, with no active object, but setting the same mode as reverse
        const interview = _cloneDeep(testInterview);
        setResponse(interview, `${segmentPath}.sameModeAsReverseTrip`, false);

        // Test conditional
        const result = conditional!(interview, `${segmentPath}.mode`);
        expect(result).toEqual([true, null]);
        expect(mockedShouldShowSameAsReverseTripQuestion).toHaveBeenCalledWith({ interview, segment: getResponse(interview, segmentPath) });
        expect(mockedGetPreviousTripSingleSegment).not.toHaveBeenCalled();
    });

    test('should not be displayed and should be initialized if the same mode as reverse trip question is shown and answered to `true`', () => {
        mockedShouldShowSameAsReverseTripQuestion.mockReturnValueOnce(true);
        const mode = 'walk';
        mockedGetPreviousTripSingleSegment.mockReturnValueOnce({ _sequence: 1, _isNew: false, _uuid: 'prevSegment1', mode });

        // Prepare interview data, with no active object, but setting the same mode as reverse
        const interview = _cloneDeep(testInterview);
        setResponse(interview, `${segmentPath}.sameModeAsReverseTrip`, true);

        // Test conditional
        const result = conditional!(interview, `${segmentPath}.mode`);
        expect(result).toEqual([false, mode]);
        expect(mockedShouldShowSameAsReverseTripQuestion).toHaveBeenCalledWith({ interview, segment: getResponse(interview, segmentPath) });
        expect(mockedGetPreviousTripSingleSegment).toHaveBeenCalledWith({ interview, person: getResponse(interview, 'household.persons.personId2') });
    });

    test('should not be displayed, but un-initialized, if the same mode as reverse trip question is presented and unanswered', () => {
        mockedShouldShowSameAsReverseTripQuestion.mockReturnValueOnce(true);

        // Prepare interview data, with no active object, but setting the same mode as reverse
        const interview = _cloneDeep(testInterview);
        setResponse(interview, `${segmentPath}.sameModeAsReverseTrip`, null);

        // Test conditional
        const result = conditional!(interview, `${segmentPath}.mode`);
        expect(result).toEqual([false, null]);
        expect(mockedShouldShowSameAsReverseTripQuestion).toHaveBeenCalledWith({ interview, segment: getResponse(interview, segmentPath) });
        expect(mockedGetPreviousTripSingleSegment).not.toHaveBeenCalled();
    });
});

describe('Widget label', () => {
    // Mock a few functions
    const mockedT = jest.fn().mockReturnValue('translatedString');
    const mockedGetContext = jest.fn();

    // Prepare common data
    const widgetConfig = getModeWidgetConfig(segmentSectionConfig, { ...widgetFactoryOptions, context: mockedGetContext }) as QuestionWidgetConfig & InputRadioType;
    const label = widgetConfig.label;
    const p2t2segmentsPath = 'household.persons.personId2.journeys.journeyId2.trips.tripId2P2.segments';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should return the right label with context', () => {
        // Add context data
        const context = 'currentContext';
        mockedGetContext.mockReturnValueOnce(context);

        // Prepare interview
        const interview = _cloneDeep(interviewAttributesForTestCases);
        interview.response._activePersonId = 'personId2';
        interview.response._activeJourneyId = 'journeyId2';
        interview.response._activeTripId = 'tripId2P2';

        // Test label function
        translateString(label, { t: mockedT } as any, interview, `${p2t2segmentsPath}.segmentId1P2T2.mode`);
        expect(mockedT).toHaveBeenCalledWith(['customSurvey:segments:ModeSpecify', 'segments:ModeSpecify'], {
            context
        });
        expect(mockedT).toHaveBeenCalledTimes(1);
    });

    test('should return the right label without context', () => {
        // Prepare interview
        const interview = _cloneDeep(interviewAttributesForTestCases);
        interview.response._activePersonId = 'personId2';
        interview.response._activeJourneyId = 'journeyId2';
        interview.response._activeTripId = 'tripId2P2';

        // Test label function
        translateString(label, { t: mockedT } as any, interview, `${p2t2segmentsPath}.segmentId1P2T2.mode`);
        expect(mockedT).toHaveBeenCalledWith(['customSurvey:segments:ModeSpecify', 'segments:ModeSpecify'], {
            context: undefined
        });
        expect(mockedT).toHaveBeenCalledTimes(1);
    });
});

describe('Mode filtering based on configuration', () => {
    test('should only include the filtered modes when modesIncludeOnly is set', () => {
        const segmentConfig = {
            type: 'segments' as const,
            enabled: true,
            modesIncludeOnly: ['walk', 'bicycle', 'transitBus', 'carDriver'] as Mode[]
        };
        const widgetConfig = getModeWidgetConfig(segmentConfig, widgetFactoryOptions) as QuestionWidgetConfig & InputRadioType;
        const choices = widgetConfig.choices as RadioChoiceType[];

        // Check that only the filtered modes are included
        expect(choices.length).toBe(4);
        expect(choices.map((c) => c.value)).toEqual(['walk', 'bicycle', 'transitBus', 'carDriver']);
        expect(choices.map((c) => c.value)).not.toContain('carPassenger');
        expect(choices.map((c) => c.value)).not.toContain('transitRRT');
    });

    test('should exclude configured modes when modesExclude is set', () => {
        const excludedModes = ['plane', 'ferryWithCar', 'snowmobile'] as Mode[];
        const segmentConfig = {
            type: 'segments' as const,
            enabled: true,
            modesExclude: excludedModes
        };
        const widgetConfig = getModeWidgetConfig(segmentConfig, widgetFactoryOptions) as QuestionWidgetConfig & InputRadioType;
        const choices = widgetConfig.choices as RadioChoiceType[];

        // Check that excluded modes are not included
        expect(choices.map((c) => c.value)).not.toContain('plane');
        expect(choices.map((c) => c.value)).not.toContain('ferryWithCar');
        expect(choices.map((c) => c.value)).not.toContain('snowmobile');
        // Check that other modes are still included
        expect(choices.map((c) => c.value)).toContain('walk');
        expect(choices.map((c) => c.value)).toContain('bicycle');
        expect(choices.map((c) => c.value)).toContain('transitBus');
    });

    test('should include all modes when section is enabled but no filtering config', () => {
        const widgetConfig = getModeWidgetConfig(segmentSectionConfig, widgetFactoryOptions) as QuestionWidgetConfig & InputRadioType;
        const choices = widgetConfig.choices as RadioChoiceType[];

        // Check that all modes are included
        expect(choices.length).toBe(modeValues.length);
        expect(choices.map((c) => c.value)).toEqual(expect.arrayContaining(modeValues));
    });

    test('should preserve mode conditionals with filtered modes', () => {
        const segmentConfig = {
            type: 'segments' as const,
            enabled: true,
            modesIncludeOnly: ['walk', 'wheelchair', 'bicycle', 'transitBus'] as Mode[]
        };
        const widgetConfig = getModeWidgetConfig(segmentConfig, widgetFactoryOptions) as QuestionWidgetConfig & InputRadioType;
        const choices = widgetConfig.choices as RadioChoiceType[];

        // Find the wheelchair choice
        const wheelchairChoice = choices.find((c) => c.value === 'wheelchair');
        expect(wheelchairChoice).toBeDefined();
        expect(wheelchairChoice?.conditional).toBeDefined();
        expect(typeof wheelchairChoice?.conditional).toBe('function');
    });

    test('should preserve order from modesIncludeOnly', () => {
        const segmentConfig = {
            type: 'segments' as const,
            enabled: true,
            modesIncludeOnly: ['transitBus', 'carDriver', 'walk', 'bicycle'] as Mode[]
        };
        const widgetConfig = getModeWidgetConfig(segmentConfig, widgetFactoryOptions) as QuestionWidgetConfig & InputRadioType;
        const choices = widgetConfig.choices as RadioChoiceType[];

        // Check that the order is preserved
        expect(choices.map((c) => c.value)).toEqual(['transitBus', 'carDriver', 'walk', 'bicycle']);
    });

    test('should throw an error when there is no mode', () => {
        const segmentConfig = {
            type: 'segments' as const,
            enabled: true,
            modesIncludeOnly: [] as Mode[]
        };
        expect(() => {
            getModeWidgetConfig(segmentConfig, widgetFactoryOptions);
        }).toThrow('No available modes to create mode widget configuration');
    });
});
