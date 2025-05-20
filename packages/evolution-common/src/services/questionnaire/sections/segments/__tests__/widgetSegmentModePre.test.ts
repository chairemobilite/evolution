/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _cloneDeep from 'lodash/cloneDeep';
import each from 'jest-each';
import { InputRadioType, QuestionWidgetConfig, RadioChoiceType } from '../../../../questionnaire/types';
import { getModePreWidgetConfig } from '../widgetSegmentModePre';
import { interviewAttributesForTestCases } from '../../../../../tests/surveys';
import { getResponse, setResponse, translateString } from '../../../../../utils/helpers';
import * as surveyHelper from '../../../../odSurvey/helpers';
import { shouldShowSameAsReverseTripQuestion, getPreviousTripSingleSegment } from '../helpers';

jest.mock('../helpers', () => ({
    shouldShowSameAsReverseTripQuestion: jest.fn(),
    getPreviousTripSingleSegment: jest.fn()
}));
const mockedShouldShowSameAsReverseTripQuestion = shouldShowSameAsReverseTripQuestion as jest.MockedFunction<typeof shouldShowSameAsReverseTripQuestion>;
const mockedGetPreviousTripSingleSegment = getPreviousTripSingleSegment as jest.MockedFunction<typeof getPreviousTripSingleSegment>;

describe('getModePreWidgetConfig', () => {
    it('should return the correct widget config', () => {

        const options = {
            context: jest.fn()
        };

        const widgetConfig = getModePreWidgetConfig(options);

        expect(widgetConfig).toEqual({
            type: 'question',
            path: 'modePre',
            inputType: 'radio',
            twoColumns: false,
            datatype: 'string',
            iconSize: '1.5em',
            columns: 2,
            label: expect.any(Function),
            choices: expect.arrayContaining([
                expect.objectContaining({
                    value: 'carDriver',
                    label: expect.any(Function),
                    conditional: expect.any(Function),
                    iconPath: '/dist/images/modes_icons/carDriver.png'
                }),
                expect.objectContaining({
                    value: 'carPassenger',
                    label: expect.any(Function),
                    iconPath: '/dist/images/modes_icons/carPassenger.png'
                }),
                expect.objectContaining({
                    value: 'walk',
                    label: expect.any(Function),
                    iconPath: '/dist/images/modes_icons/walk.png'
                }),
                expect.objectContaining({
                    value: 'bicycle',
                    label: expect.any(Function),
                    iconPath: '/dist/images/modes_icons/bicycle.png'
                }),
                expect.objectContaining({
                    value: 'transit',
                    label: expect.any(Function),
                    iconPath: '/dist/images/modes_icons/bus.png'
                }),
                expect.objectContaining({
                    value: 'taxi',
                    label: expect.any(Function),
                    iconPath: '/dist/images/modes_icons/taxi.png'
                }),
                expect.objectContaining({
                    value: 'other',
                    label: expect.any(Function),
                    iconPath: '/dist/images/modes_icons/other.png'
                }),
                expect.objectContaining({
                    value: 'dontKnow',
                    label: expect.any(Function),
                    iconPath: '/dist/images/modes_icons/dontKnow.png'
                })
            ]),
            validations: expect.any(Function),
            conditional: expect.any(Function)
        });
    });
});

describe('Mode choices conditionals', () => {
    const widgetConfig = getModePreWidgetConfig({}) as QuestionWidgetConfig & InputRadioType;
    const choices = widgetConfig.choices as RadioChoiceType[];

    test('carDriver conditional should return true if person has driving license', () => {
        // Prepare test data with active person/journey/trip
        const interview = _cloneDeep(interviewAttributesForTestCases);
        interview.response._activePersonId = 'personId1';
        interview.response._activeJourneyId = 'journeyId1';
        interview.response._activeTripId = 'tripId1P1';

        // Find the carDriver choice
        const carDriverChoice = choices.find((choice) => choice.value === 'carDriver');
        expect(carDriverChoice).toBeDefined();
        const carDriverResult = carDriverChoice?.conditional?.(interview, 'household.persons.personId1.journeys.journeyId1.trips.tripId1P1.segments.segmentId1P1T1.modePre');
        expect(carDriverResult).toEqual(true);
    });

    test('carDriver conditional should return false if person does not have driving license', () => {
        // Prepare test data with active person/journey/trip
        const interview = _cloneDeep(interviewAttributesForTestCases);
        interview.response._activePersonId = 'personId2';
        interview.response._activeJourneyId = 'journeyId2';
        interview.response._activeTripId = 'tripId1P2';

        // Find the carDriver choice
        const carDriverChoice = choices.find((choice) => choice.value === 'carDriver');
        expect(carDriverChoice).toBeDefined();
        const carDriverResult = carDriverChoice?.conditional?.(interview, 'household.persons.personId2.journeys.journeyId2.trips.tripId1P2.segments.segmentId1P2T1.modePre');
        expect(carDriverResult).toEqual(false);
    });

    test('carDriver conditional should return true if no driving license information is available', () => {
        // Prepare test data with active person/journey/trip
        const interview = _cloneDeep(interviewAttributesForTestCases);
        interview.response._activePersonId = 'personId3';
        interview.response._activeJourneyId = 'journeyId3';
        interview.response._activeTripId = 'tripId1P3';

        // Find the carDriver choice
        const carDriverChoice = choices.find((choice) => choice.value === 'carDriver');
        expect(carDriverChoice).toBeDefined();
        const carDriverResult = carDriverChoice?.conditional?.(interview, 'household.persons.personId3.journeys.journeyId3.trips.tripId1P2.segments.segmentId1P3T1.modePre');
        expect(carDriverResult).toEqual(true);
    });

    test('carDriver conditional should return false if no driving license information is available, but person is too young', () => {
        // Prepare test data with active person/journey/trip
        const interview = _cloneDeep(interviewAttributesForTestCases);
        interview.response._activePersonId = 'personId3';
        interview.response._activeJourneyId = 'journeyId3';
        interview.response._activeTripId = 'tripId1P3';
        interview.response.household!.persons!.personId3!.age = 15;

        // Find the carDriver choice
        const carDriverChoice = choices.find((choice) => choice.value === 'carDriver');
        expect(carDriverChoice).toBeDefined();
        const carDriverResult = carDriverChoice?.conditional?.(interview, 'household.persons.personId3.journeys.journeyId3.trips.tripId1P2.segments.segmentId1P3T1.modePre');
        expect(carDriverResult).toEqual(false);
    });

    test('carDriver conditional should return result for first person if no active person', () => {
        // Prepare test data with no active person/journey/trip
        const interview = _cloneDeep(interviewAttributesForTestCases);

        // Find the carDriver choice
        const carDriverChoice = choices.find((choice) => choice.value === 'carDriver');
        expect(carDriverChoice).toBeDefined();
        const carDriverResult = carDriverChoice?.conditional?.(interview, 'household.persons.personId2.journeys.journeyId2.trips.tripId1P2.segments.segmentId1P2T1.modePre');
        expect(carDriverResult).toEqual(true);
    });

});

describe('Mode choices labels', () => {
    // Prepare test data with active person/journey/trip
    const interview = _cloneDeep(interviewAttributesForTestCases);
    const widgetConfig = getModePreWidgetConfig({}) as QuestionWidgetConfig & InputRadioType;
    const choices = widgetConfig.choices as RadioChoiceType[];

    each([
        ['carDriver', ['customSurvey:segments:modePre:CarDriver', 'segments:modePre:CarDriver']],
        ['carPassenger', ['customSurvey:segments:modePre:CarPassenger', 'segments:modePre:CarPassenger']],
        ['taxi', ['customSurvey:segments:modePre:Taxi', 'segments:modePre:Taxi']],
        ['bicycle', ['customSurvey:segments:modePre:Bicycle', 'segments:modePre:Bicycle']],
        ['transit', ['customSurvey:segments:modePre:Transit', 'segments:modePre:Transit']],
        ['walk', ['customSurvey:segments:modePre:Walk', 'segments:modePre:Walk']],
        ['other', ['customSurvey:segments:modePre:Other', 'segments:modePre:Other']],
        ['dontKnow', ['customSurvey:segments:modePre:DontKnow', 'segments:modePre:DontKnow']],
        ['preferNotToAnswer', ['customSurvey:segments:modePre:PreferNotToAnswer', 'segments:modePre:PreferNotToAnswer']]
    ]).test('should return the right label for %s choice', (choiceValue, expectedLabel) => {
        const mockedT = jest.fn();
        const choice = choices.find((choice) => choice.value === choiceValue);
        expect(choice).toBeDefined();
        translateString(choice?.label, { t: mockedT } as any, interview, 'path');
        expect(mockedT).toHaveBeenCalledWith(expectedLabel);
    });

    test('should return the right label for walk choice with person with disability', () => {
        // Set the hasDisability property to 'yes' to the active person
        const interview = _cloneDeep(interviewAttributesForTestCases);
        interview.response._activePersonId = 'personId2';
        const person = surveyHelper.getPerson({ interview });
        person!.hasDisability = 'yes';
        const mockedT = jest.fn();
        const choice = choices.find((choice) => choice.value === 'walk');
        translateString(choice?.label, { t: mockedT } as any, interview, 'path');
        expect(mockedT).toHaveBeenCalledWith(['customSurvey:segments:modePre:WalkOrMobilityHelp', 'segments:modePre:WalkOrMobilityHelp']);
    });

});

describe('Mode validations', () => {
    // Prepare test data with active person/journey/trip
    const interview = _cloneDeep(interviewAttributesForTestCases);

    const widgetConfig = getModePreWidgetConfig({}) as QuestionWidgetConfig & InputRadioType;
    const validations = widgetConfig.validations;

    test('should return an error if value is empty', () => {
        expect(validations!(null, null, interview, 'household.persons.personId2.journeys.journeyId2.trips.tripId1P2.segments.segmentId1P2T1.modePre'))
            .toEqual([{ validation: true, errorMessage: expect.anything() }]);
    });

    test('should return no error if value is not empty', () => {
        expect(validations!('carDriver', null, interview, 'household.persons.personId2.journeys.journeyId2.trips.tripId1P2.segments.segmentId1P2T1.modePre'))
            .toEqual([{ validation: false, errorMessage: expect.anything() }]);
    });

    test('should return the right error message', () => {
        const validation = validations!('carDriver', null, interview, 'household.persons.personId2.journeys.journeyId2.trips.tripId1P2.segments.segmentId1P2T1.modePre');
        const mockedT = jest.fn();
        translateString(validation[0].errorMessage, { t: mockedT } as any, interview, 'path');
        expect(mockedT).toHaveBeenCalledWith(['survey:segments:ModeIsRequired', 'segments:ModeIsRequired']);
    });

});

describe('ModePre conditional', () => {
    const widgetConfig = getModePreWidgetConfig({}) as QuestionWidgetConfig & InputRadioType;
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

    test('should be displayed if the same mode as reverse trip question is not shown', () => {
        mockedShouldShowSameAsReverseTripQuestion.mockReturnValueOnce(false);

        // Test conditional
        const result = conditional!(testInterview, `${segmentPath}.modePre`);
        expect(result).toEqual([true, null]);
        expect(mockedShouldShowSameAsReverseTripQuestion).toHaveBeenCalledWith({ interview: testInterview, segment: currentSegment });
        expect(mockedGetPreviousTripSingleSegment).not.toHaveBeenCalled();
    });

    test('should be displayed if the same mode as reverse trip question is shown, but answered to `false`', () => {
        mockedShouldShowSameAsReverseTripQuestion.mockReturnValueOnce(true);

        // Prepare interview data, with no active object, but setting the same mode as reverse
        const interview = _cloneDeep(testInterview);
        setResponse(interview, `${segmentPath}.sameModeAsReverseTrip`, false);

        // Test conditional
        const result = conditional!(interview, `${segmentPath}.modePre`);
        expect(result).toEqual([true, null]);
        expect(mockedShouldShowSameAsReverseTripQuestion).toHaveBeenCalledWith({ interview, segment: getResponse(interview, segmentPath) });
        expect(mockedGetPreviousTripSingleSegment).not.toHaveBeenCalled();
    });

    test('should not be displayed and should be initialized if the same mode as reverse trip question is shown and answered to `true`', () => {
        mockedShouldShowSameAsReverseTripQuestion.mockReturnValueOnce(true);
        const previousModePre = 'walk';
        mockedGetPreviousTripSingleSegment.mockReturnValueOnce({ _sequence: 1, _isNew: false, _uuid: 'prevSegment1', modePre: previousModePre });

        // Prepare interview data, with no active object, but setting the same mode as reverse
        const interview = _cloneDeep(testInterview);
        setResponse(interview, `${segmentPath}.sameModeAsReverseTrip`, true);

        // Test conditional
        const result = conditional!(interview, `${segmentPath}.modePre`);
        expect(result).toEqual([false, previousModePre]);
        expect(mockedShouldShowSameAsReverseTripQuestion).toHaveBeenCalledWith({ interview, segment: getResponse(interview, segmentPath) });
        expect(mockedGetPreviousTripSingleSegment).toHaveBeenCalledWith({ interview, person: getResponse(interview, 'household.persons.personId2') });
    });

    test('should not be displayed, but un-initialized, if the same mode as reverse trip question is presented and unanswered', () => {
        mockedShouldShowSameAsReverseTripQuestion.mockReturnValueOnce(true);

        // Prepare interview data, with no active object, but setting the same mode as reverse
        const interview = _cloneDeep(testInterview);
        setResponse(interview, `${segmentPath}.sameModeAsReverseTrip`, null);

        // Test conditional
        const result = conditional!(interview, `${segmentPath}.modePre`);
        expect(result).toEqual([false, null]);
        expect(mockedShouldShowSameAsReverseTripQuestion).toHaveBeenCalledWith({ interview, segment: getResponse(interview, segmentPath) });
        expect(mockedGetPreviousTripSingleSegment).not.toHaveBeenCalled();
    });
});

describe('ModePre label', () => {
    // Mock a few functions
    jest.spyOn(surveyHelper, 'getVisitedPlaceName').mockReturnValue('placeName');
    jest.spyOn(surveyHelper, 'getCountOrSelfDeclared').mockReturnValue(1);
    const mockedGetPlaceName = surveyHelper.getVisitedPlaceName as jest.MockedFunction<typeof surveyHelper.getVisitedPlaceName>;
    const mockedGetCountOrSelfDeclared = surveyHelper.getCountOrSelfDeclared as jest.MockedFunction<typeof surveyHelper.getCountOrSelfDeclared>;
    const mockedT = jest.fn().mockReturnValue('translatedString');
    const mockedGetContext = jest.fn();

    // Prepare common data
    const widgetConfig = getModePreWidgetConfig({ context: mockedGetContext }) as QuestionWidgetConfig & InputRadioType;
    const label = widgetConfig.label;
    const p2t2segmentsPath = 'household.persons.personId2.journeys.journeyId2.trips.tripId2P2.segments';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should return the right label for first segment', () => {
        // Prepare mocked data
        const originName = 'originName';
        const destinationName = 'destinationName';
        const context = 'currentContext';
        mockedGetPlaceName.mockReturnValueOnce(originName).mockReturnValueOnce(destinationName);
        mockedGetContext.mockReturnValue(context);

        // Prepare interview
        const interview = _cloneDeep(interviewAttributesForTestCases);
        interview.response._activePersonId = 'personId2';
        interview.response._activeJourneyId = 'journeyId2';
        interview.response._activeTripId = 'tripId2P2';

        // Test label function
        translateString(label, { t: mockedT } as any, interview, `${p2t2segmentsPath}.segmentId1P2T2.modePre`);
        expect(mockedT).toHaveBeenCalledWith(['customSurvey:segments:ModeFirst', 'segments:ModeFirst'], {
            context,
            originName,
            destinationName,
            count: 1
        });
        expect(mockedT).toHaveBeenCalledTimes(1);
        expect(mockedGetPlaceName).toHaveBeenCalledWith({ t: mockedT, visitedPlace: interview.response.household!.persons!.personId2!.journeys!.journeyId2!.visitedPlaces!.shoppingPlace1P2, interview });
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
        translateString(label, { t: mockedT } as any, interview, `${p2t2segmentsPath}.segmentId1P2T2.modePre`);
        expect(mockedT).toHaveBeenCalledWith(['customSurvey:survey:origin', 'survey:origin']);
        expect(mockedT).toHaveBeenCalledWith(['customSurvey:survey:destination', 'survey:destination']);
        expect(mockedT).toHaveBeenCalledWith(['customSurvey:segments:ModeFirst', 'segments:ModeFirst'], {
            context,
            originName: expect.anything(),
            destinationName: expect.anything(),
            count
        });
        expect(mockedGetPlaceName).not.toHaveBeenCalled();
    });

    test('should return empty label if no active trip', () => {
        // Prepare interview
        const interview = _cloneDeep(interviewAttributesForTestCases);

        // Test label function
        const modeLabel = translateString(label, { t: mockedT } as any, interview, `${p2t2segmentsPath}.segmentId1P2T2.modePre`);
        expect(mockedT).not.toHaveBeenCalled();
        expect(modeLabel).toEqual('');
    });

    test('should return another label if segment is not the first', () => {
        // Prepare mocked data
        const originName = 'originName';
        const destinationName = 'destinationName';
        const context = 'currentContext';
        mockedGetPlaceName.mockReturnValueOnce(originName).mockReturnValueOnce(destinationName);
        mockedGetContext.mockReturnValue(context);

        // Prepare interview
        const interview = _cloneDeep(interviewAttributesForTestCases);
        interview.response._activePersonId = 'personId2';
        interview.response._activeJourneyId = 'journeyId2';
        interview.response._activeTripId = 'tripId2P2';

        // Test label function
        translateString(label, { t: mockedT } as any, interview, `${p2t2segmentsPath}.segmentId2P2T2.modePre`);
        expect(mockedT).toHaveBeenCalledWith(['customSurvey:segments:ModeThen', 'segments:ModeThen'], {
            context,
            originName,
            destinationName,
            count: 1
        });
        expect(mockedT).toHaveBeenCalledTimes(1);
    });

    test('undefined context function', () => {
        // New widget config without context function
        const testWidgetConfig = getModePreWidgetConfig({ }) as QuestionWidgetConfig & InputRadioType;
        const label = testWidgetConfig.label;

        // Prepare mocked data
        const originName = 'originName';
        const destinationName = 'destinationName';
        mockedGetPlaceName.mockReturnValueOnce(originName).mockReturnValueOnce(destinationName);

        // Prepare interview
        const interview = _cloneDeep(interviewAttributesForTestCases);
        interview.response._activePersonId = 'personId2';
        interview.response._activeJourneyId = 'journeyId2';
        interview.response._activeTripId = 'tripId2P2';

        // Test label function
        translateString(label, { t: mockedT } as any, interview, `${p2t2segmentsPath}.segmentId1P2T2.modePre`);
        expect(mockedT).toHaveBeenCalledWith(['customSurvey:segments:ModeFirst', 'segments:ModeFirst'], {
            context: undefined,
            originName,
            destinationName,
            count: 1
        });
    });
});
