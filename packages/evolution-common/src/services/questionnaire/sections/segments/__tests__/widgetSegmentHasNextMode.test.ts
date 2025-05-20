/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _cloneDeep from 'lodash/cloneDeep';
import { InputRadioType, QuestionWidgetConfig } from '../../../../questionnaire/types';
import { getSegmentHasNextModeWidgetConfig } from '../widgetSegmentHasNextMode';
import { interviewAttributesForTestCases } from '../../../../../tests/surveys';
import { getResponse, setResponse, translateString } from '../../../../../utils/helpers';
import * as surveyHelper from '../../../../odSurvey/helpers';
import { shouldShowSameAsReverseTripQuestion, getPreviousTripSingleSegment } from '../helpers';

jest.mock('../helpers', () => ({
    shouldShowSameAsReverseTripQuestion: jest.fn().mockReturnValue(false),
    getPreviousTripSingleSegment: jest.fn()
}));
const mockedShouldShowSameAsReverseTripQuestion = shouldShowSameAsReverseTripQuestion as jest.MockedFunction<typeof shouldShowSameAsReverseTripQuestion>;
const mockedGetPreviousTripSingleSegment = getPreviousTripSingleSegment as jest.MockedFunction<typeof getPreviousTripSingleSegment>;

describe('getSegmentHasNextModeWidgetConfig', () => {
    it('should return the correct widget config', () => {

        const options = {
            context: jest.fn()
        };

        const widgetConfig = getSegmentHasNextModeWidgetConfig(options);

        expect(widgetConfig).toEqual({
            type: 'question',
            path: 'hasNextMode',
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

describe('segmentHasNextMode validations', () => {
    // Prepare test data with active person/journey/trip
    const interview = _cloneDeep(interviewAttributesForTestCases);

    const widgetConfig = getSegmentHasNextModeWidgetConfig({}) as QuestionWidgetConfig & InputRadioType;
    const validations = widgetConfig.validations;

    test('should return no error if value is not empty', () => {
        expect(validations!(true, null, interview, 'household.persons.personId2.journeys.journeyId2.trips.tripId1P2.segments.segmentId1P2T1.hasNextMode'))
            .toEqual([{ validation: false, errorMessage: expect.anything() }]);
    });

    test('should return an error if value is empty', () => {
        expect(validations!(null, null, interview, 'household.persons.personId2.journeys.journeyId2.trips.tripId1P2.segments.segmentId1P2T1.hasNextMode'))
            .toEqual([{ validation: true, errorMessage: expect.anything() }]);
    });

    test('should return the right error message', () => {
        const validation = validations!('carDriver', null, interview, 'household.persons.personId2.journeys.journeyId2.trips.tripId1P2.segments.segmentId1P2T1.hasNextMode');
        const mockedT = jest.fn();
        translateString(validation[0].errorMessage, { t: mockedT } as any, interview, 'path');
        expect(mockedT).toHaveBeenCalledWith(['customSurvey:ResponseIsRequired', 'survey:ResponseIsRequired']);
    });

});

describe('segmentHasNextMode conditional', () => {
    const widgetConfig = getSegmentHasNextModeWidgetConfig({}) as QuestionWidgetConfig & InputRadioType;
    const conditional = widgetConfig.conditional;

    // Prepare test data with active person/journey/trip
    const testInterview = _cloneDeep(interviewAttributesForTestCases);
    testInterview.response._activePersonId = 'personId2';
    testInterview.response._activeJourneyId = 'journeyId2';
    testInterview.response._activeTripId = 'tripId1P2';

    const segmentPath = 'household.persons.personId2.journeys.journeyId2.trips.tripId1P2.segments.segmentId1P2T1';
    const currentSegment = getResponse(interviewAttributesForTestCases, segmentPath);

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should be displayed if the same mode as reverse trip question is shown, but answered to `false`', () => {
        mockedShouldShowSameAsReverseTripQuestion.mockReturnValueOnce(true);

        // Prepare interview data, with no active object, but setting the same mode as reverse
        const interview = _cloneDeep(testInterview);
        setResponse(interview, `${segmentPath}.sameModeAsReverseTrip`, false);

        // Test conditional
        const result = conditional!(interview, `${segmentPath}.hasNextMode`);
        expect(result).toEqual([true, null]);
        expect(mockedShouldShowSameAsReverseTripQuestion).toHaveBeenCalledWith({ interview, segment: getResponse(interview, segmentPath) });
        expect(mockedGetPreviousTripSingleSegment).not.toHaveBeenCalled();
    });

    test('should not be displayed and should be initialized if the same mode as reverse trip question is shown and answered to `true`', () => {
        mockedShouldShowSameAsReverseTripQuestion.mockReturnValueOnce(true);
        mockedGetPreviousTripSingleSegment.mockReturnValueOnce({ _sequence: 1, _isNew: false, _uuid: 'prevSegment1', mode: 'walk', modePre: 'walk' });

        // Prepare interview data, with no active object, but setting the same mode as reverse
        const interview = _cloneDeep(testInterview);
        setResponse(interview, `${segmentPath}.sameModeAsReverseTrip`, true);

        // Test conditional
        const result = conditional!(interview, `${segmentPath}.hasNextMode`);
        expect(result).toEqual([false, false]);
        expect(mockedShouldShowSameAsReverseTripQuestion).toHaveBeenCalledWith({ interview, segment: getResponse(interview, segmentPath) });
        expect(mockedGetPreviousTripSingleSegment).toHaveBeenCalledWith({ interview, person: getResponse(interview, 'household.persons.personId2') });
    });

    test('should not be displayed, but un-initialized, if the same mode as reverse trip question is presented and unanswered', () => {
        mockedShouldShowSameAsReverseTripQuestion.mockReturnValueOnce(true);

        // Prepare interview data, with no active object, but setting the same mode as reverse
        const interview = _cloneDeep(testInterview);
        setResponse(interview, `${segmentPath}.sameModeAsReverseTrip`, null);

        // Test conditional
        const result = conditional!(interview, `${segmentPath}.hasNextMode`);
        expect(result).toEqual([false, null]);
        expect(mockedShouldShowSameAsReverseTripQuestion).toHaveBeenCalledWith({ interview, segment: getResponse(interview, segmentPath) });
        expect(mockedGetPreviousTripSingleSegment).not.toHaveBeenCalled();
    });

    test('should be displayed if last segment of many', () => {
        // Prepare interview data and use trip 2 or person 2, who has 2 segments
        const interview = _cloneDeep(interviewAttributesForTestCases);
        interview.response._activePersonId = 'personId2';
        interview.response._activeJourneyId = 'journeyId2';
        interview.response._activeTripId = 'tripId2P2';

        // Test conditional, using the last segment
        const result = conditional!(interview, 'household.persons.personId2.journeys.journeyId2.trips.tripId2P2.segments.segmentId2P2T2.hasNextMode');
        expect(result).toEqual([true, null]);
    });

    test('should not be displayed if not last segment of many and should return true', () => {
        // Prepare interview data and use trip 2 or person 2, who has 2 segments
        const interview = _cloneDeep(interviewAttributesForTestCases);
        interview.response._activePersonId = 'personId2';
        interview.response._activeJourneyId = 'journeyId2';
        interview.response._activeTripId = 'tripId2P2';

        // Test conditional, using the first segment
        const result = conditional!(interview, 'household.persons.personId2.journeys.journeyId2.trips.tripId2P2.segments.segmentId1P2T2.hasNextMode');
        expect(result).toEqual([false, true]);
    });
});

describe('segmentHasNextMode label', () => {
    // Mock a few functions
    jest.spyOn(surveyHelper, 'getVisitedPlaceName').mockReturnValue('placeName');
    jest.spyOn(surveyHelper, 'getCountOrSelfDeclared').mockReturnValue(1);
    const mockedGetPlaceName = surveyHelper.getVisitedPlaceName as jest.MockedFunction<typeof surveyHelper.getVisitedPlaceName>;
    const mockedGetCountOrSelfDeclared = surveyHelper.getCountOrSelfDeclared as jest.MockedFunction<typeof surveyHelper.getCountOrSelfDeclared>;
    const translatedStringResponse = 'translatedString';
    const mockedT = jest.fn().mockReturnValue(translatedStringResponse);
    const mockedGetContext = jest.fn();

    // Prepare common data
    const widgetConfig = getSegmentHasNextModeWidgetConfig({ context: mockedGetContext }) as QuestionWidgetConfig & InputRadioType;
    const label = widgetConfig.label;
    const p2t2segmentsPath = 'household.persons.personId2.journeys.journeyId2.trips.tripId2P2.segments';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should return the right label for normal activities', () => {
        // Prepare mocked data
        const destinationName = 'destinationName';
        const context = 'currentContext';
        mockedGetPlaceName.mockReturnValueOnce(destinationName);
        mockedGetContext.mockReturnValue(context);

        // Prepare interview
        const interview = _cloneDeep(interviewAttributesForTestCases);
        interview.response._activePersonId = 'personId2';
        interview.response._activeJourneyId = 'journeyId2';
        interview.response._activeTripId = 'tripId2P2';

        // Test label function
        translateString(label, { t: mockedT } as any, interview, `${p2t2segmentsPath}.segmentId1P2T2.hasNextMode`);
        expect(mockedT).toHaveBeenCalledWith(['customSurvey:thisTrip', 'survey:thisTrip'], { context: 'other' });
        expect(mockedT).toHaveBeenCalledWith(['customSurvey:segments:SegmentHasNextMode', 'segments:SegmentHasNextMode'], {
            context,
            nickname: 'p2',
            thisTrip: translatedStringResponse,
            destinationName,
            count: 1
        });
        expect(mockedT).toHaveBeenCalledTimes(2);
        expect(mockedGetPlaceName).toHaveBeenCalledWith({ t: mockedT, visitedPlace: interview.response.household!.persons!.personId2!.journeys!.journeyId2!.visitedPlaces!.otherWorkPlace1P2, interview });
        expect(mockedGetCountOrSelfDeclared).toHaveBeenCalledWith({ interview, person: interview.response.household!.persons!.personId2 });
    });

    test('should return label with generic place names, when origin/destination do not exist', () => {
        // Prepare mocked data
        const context = 'currentContext';
        const count = 3;
        mockedGetContext.mockReturnValue(context);
        mockedGetCountOrSelfDeclared.mockReturnValueOnce(count);

        // Prepare interview
        const interview = _cloneDeep(interviewAttributesForTestCases);
        interview.response._activePersonId = 'personId2';
        interview.response._activeJourneyId = 'journeyId2';
        interview.response._activeTripId = 'tripId2P2';
        // Change trip for one with undefined origin/destination
        interview.response.household!.persons!.personId2!.journeys!.journeyId2!.trips!.tripId2P2 = {
            _uuid: 'tripId2P2',
            _sequence: 2,
            _originVisitedPlaceUuid: 'unexistingOrigin',
            _destinationVisitedPlaceUuid: 'unexistingDestination',
            segments: {
                segmentId1P2T2: {
                    _uuid: 'segmentId1P2T2',
                    _isNew: false,
                    _sequence: 1,
                    modePre: 'walk'
                }
            }
        };

        // Test label function
        translateString(label, { t: mockedT } as any, interview, `${p2t2segmentsPath}.segmentId1P2T2.hasNextMode`);
        expect(mockedT).toHaveBeenCalledWith(['customSurvey:thisTrip', 'survey:thisTrip'], { context: '' });
        expect(mockedT).toHaveBeenCalledWith(['customSurvey:segments:SegmentHasNextMode', 'segments:SegmentHasNextMode'], {
            context,
            nickname: 'p2',
            thisTrip: translatedStringResponse,
            destinationName: 'translatedString',
            count
        });
        expect(mockedGetPlaceName).not.toHaveBeenCalled();
    });

    test('should return the right label for loop activities', () => {
        // Prepare mocked data
        const context = 'currentContext';
        const count = 3;
        mockedGetContext.mockReturnValue(context);
        mockedGetCountOrSelfDeclared.mockReturnValueOnce(count);

        // Prepare interview
        const interview = _cloneDeep(interviewAttributesForTestCases);
        interview.response._activePersonId = 'personId2';
        interview.response._activeJourneyId = 'journeyId2';
        interview.response._activeTripId = 'tripId2P2';
        // Change the activity of the destination to a loop activity
        interview.response.household!.persons!.personId2!.journeys!.journeyId2!.visitedPlaces!.otherWorkPlace1P2!.activity = 'leisureStroll';

        // Test label function
        translateString(label, { t: mockedT } as any, interview, `${p2t2segmentsPath}.segmentId1P2T2.hasNextMode`);
        expect(mockedT).toHaveBeenCalledWith(['customSurvey:thisTrip', 'survey:thisTrip'], { context: 'leisureStroll' });
        expect(mockedT).toHaveBeenCalledWith(['customSurvey:segments:SegmentHasNextModeLoop', 'segments:SegmentHasNextModeLoop'], {
            context,
            nickname: 'p2',
            thisTrip: translatedStringResponse,
            count
        });
        expect(mockedGetPlaceName).not.toHaveBeenCalled();
    });

    test('undefined context function', () => {
        // New widget config without context function
        const testWidgetConfig = getSegmentHasNextModeWidgetConfig({ }) as QuestionWidgetConfig & InputRadioType;
        const label = testWidgetConfig.label;

        // Prepare mocked data
        const destinationName = 'destinationName';
        mockedGetPlaceName.mockReturnValueOnce(destinationName);

        // Prepare interview
        const interview = _cloneDeep(interviewAttributesForTestCases);
        interview.response._activePersonId = 'personId2';
        interview.response._activeJourneyId = 'journeyId2';
        interview.response._activeTripId = 'tripId2P2';

        // Test label function
        translateString(label, { t: mockedT } as any, interview, `${p2t2segmentsPath}.segmentId1P2T2.hasNextMode`);
        expect(mockedT).toHaveBeenCalledWith(['customSurvey:thisTrip', 'survey:thisTrip'], { context: 'other' });
        expect(mockedT).toHaveBeenCalledWith(['customSurvey:segments:SegmentHasNextMode', 'segments:SegmentHasNextMode'], {
            context: undefined,
            nickname: 'p2',
            thisTrip: translatedStringResponse,
            destinationName,
            count: 1
        });
    });
});
