/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _cloneDeep from 'lodash/cloneDeep';
import each from 'jest-each';

import { getSameAsReverseTripWidgetConfig } from '../widgetSameAsReverseTrip';
import { interviewAttributesForTestCases } from 'evolution-common/lib/tests/surveys';
import { InputRadioType, QuestionWidgetConfig, RadioChoiceType } from 'evolution-common/lib/services/widgets';
import { setResponse, translateString } from 'evolution-common/lib/utils/helpers';
import * as surveyHelper from 'evolution-common/lib/services/odSurvey/helpers';

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

    // Prepare test data with default active person/journey/trip, tripId2P1 is return trip of a simple chain
    const baseTestInterview = _cloneDeep(interviewAttributesForTestCases);
    baseTestInterview.responses._activePersonId = 'personId1';
    baseTestInterview.responses._activeJourneyId = 'journeyId1';
    baseTestInterview.responses._activeTripId = 'tripId2P1';
    // Add a segment for tripId1P1, with simple mode
    baseTestInterview.responses.household!.persons!.personId1.journeys!.journeyId1.trips!.tripId1P1.segments = {
        segmentId1P1T1: { _isNew: false, modePre: 'walk', mode: 'walk', _uuid: 'segmentId1P1T1', _sequence: 1 }
    };

    // Add a segment for tripId2P1, tests will initialize it
    baseTestInterview.responses.household!.persons!.personId1.journeys!.journeyId1.trips!.tripId2P1.segments = {
        segmentId1P1T2: { _uuid: 'segmentId1P1T2', _sequence: 1, _isNew: true }
    };

    const widgetConfig = getSameAsReverseTripWidgetConfig({}) as QuestionWidgetConfig & InputRadioType;
    const conditional = widgetConfig.conditional;

    test('Segment is not new, but simple chain', () => {
        // Prepare interview data, setting segment as not new
        const interview = _cloneDeep(baseTestInterview);
        setResponse(interview, 'household.persons.personId1.journeys.journeyId1.trips.tripId2P1.segments.segmentId1P1T2._isNew', false);

        // Test conditional
        const result = conditional!(interview, 'household.persons.personId1.journeys.journeyId1.trips.tripId2P1.segments.segmentId1P1T2.sameModeAsReverseTrip');
        expect(result).toEqual([false, null]);
    });

    test('Segment is new, trip is null, previousTrip is null', () => {
        // Prepare interview data, setting segment as new
        const interview = _cloneDeep(baseTestInterview);
        // Unset active trip
        delete interview.responses._activeTripId;

        // Test conditional
        const result = conditional!(interview, 'household.persons.personId1.journeys.journeyId1.trips.tripId2P1.segments.segmentId1P1T2.sameModeAsReverseTrip');
        expect(result).toEqual([false, null]);
    });


    test('Segment is new, trip not null, previousTrip is null', () => {
        // Prepare interview data, use the segment from the first trip of P1
        const interview = _cloneDeep(baseTestInterview);
        // Unset active trip
        interview.responses._activeTripId = 'tripId1P1';
        setResponse(interview, 'household.persons.personId1.journeys.journeyId1.trips.tripId1P1.segments.segmentId1P1T1._isNew', true);

        // Test conditional
        const result = conditional!(interview, 'household.persons.personId1.journeys.journeyId1.trips.tripId1P1.segments.segmentId1P1T1.sameModeAsReverseTrip');
        expect(result).toEqual([false, null]);
    });

    test('Segment is new, with previous trip, not simple chain', () => {
        // Prepare interview data, take tripId2P2, it is not a simple chain
        const interview = _cloneDeep(baseTestInterview);
        interview.responses._activePersonId = 'personId2';
        interview.responses._activeJourneyId = 'journeyId2';
        interview.responses._activeTripId = 'tripId2P2';
        setResponse(interview, 'household.persons.personId2.journeys.journeyId2.trips.tripId2P2.segments.segmentId1P2T2._isNew', true);

        // Test conditional
        const result = conditional!(interview, 'household.persons.personId2.journeys.journeyId2.trips.tripId2P2.segments.segmentId1P2T2.sameModeAsReverseTrip');
        expect(result).toEqual([false, null]);
    });

    test('Segment is new, simple chain', () => {
        // Prepare interview data, setting segment as new
        const interview = _cloneDeep(baseTestInterview);
        setResponse(interview, 'household.persons.personId1.journeys.journeyId1.trips.tripId2P1.segments.segmentId1P1T2._isNew', true);

        // Test conditional
        const result = conditional!(interview, 'household.persons.personId1.journeys.journeyId1.trips.tripId2P1.segments.segmentId1P1T2.sameModeAsReverseTrip');
        expect(result).toEqual([true, null]);
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

        // Add a segment for tripId1P1, with simple mode
        baseTestInterview.responses.household!.persons!.personId1.journeys!.journeyId1.trips!.tripId1P1.segments = {
            segmentId1P1T1: { _isNew: false, modePre: 'walk', mode: 'walk', _uuid: 'segmentId1P1T1', _sequence: 1 }
        };

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

        // The previous trip does not have any segment and we don't need to add one, the label should handle it.
        
        translateString(label, { t: mockedT } as any, baseTestInterview, 'path');
        expect(mockedT).toHaveBeenCalledTimes(1);
        expect(mockedT).toHaveBeenCalledWith(['customSurvey:segments:SegmentSameModeReturn', 'segments:SegmentSameModeReturn'], {
            context: undefined,
            previousMode: '',
            count: 1
        });
    });
});