/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _cloneDeep from 'lodash/cloneDeep';
import each from 'jest-each';
import { InputRadioType, QuestionWidgetConfig, RadioChoiceType } from 'evolution-common/lib/services/widgets';
import { getModePreWidgetConfig } from '../widgetSegmentModePre';
import { interviewAttributesForTestCases } from 'evolution-common/lib/tests/surveys';
import { setResponse, translateString } from 'evolution-common/lib/utils/helpers';
import * as surveyHelper from 'evolution-common/lib/services/odSurvey/helpers';

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
        interview.responses._activePersonId = 'personId1';
        interview.responses._activeJourneyId = 'journeyId1';
        interview.responses._activeTripId = 'tripId1P1';

        // Find the carDriver choice
        const carDriverChoice = choices.find((choice) => choice.value === 'carDriver');
        expect(carDriverChoice).toBeDefined();
        const carDriverResult = carDriverChoice?.conditional?.(interview, 'household.persons.personId1.journeys.journeyId1.trips.tripId1P1.segments.segmentId1P1T1.modePre');
        expect(carDriverResult).toEqual(true);
    });

    test('carDriver conditional should return false if person does not have driving license', () => {
        // Prepare test data with active person/journey/trip
        const interview = _cloneDeep(interviewAttributesForTestCases);
        interview.responses._activePersonId = 'personId2';
        interview.responses._activeJourneyId = 'journeyId2';
        interview.responses._activeTripId = 'tripId1P2';

        // Find the carDriver choice
        const carDriverChoice = choices.find((choice) => choice.value === 'carDriver');
        expect(carDriverChoice).toBeDefined();
        const carDriverResult = carDriverChoice?.conditional?.(interview, 'household.persons.personId2.journeys.journeyId2.trips.tripId1P2.segments.segmentId1P2T1.modePre');
        expect(carDriverResult).toEqual(false);
    });

    test('carDriver conditional should return true if no driving license information is available', () => {
        // Prepare test data with active person/journey/trip
        const interview = _cloneDeep(interviewAttributesForTestCases);
        interview.responses._activePersonId = 'personId3';
        interview.responses._activeJourneyId = 'journeyId3';
        interview.responses._activeTripId = 'tripId1P3';

        // Find the carDriver choice
        const carDriverChoice = choices.find((choice) => choice.value === 'carDriver');
        expect(carDriverChoice).toBeDefined();
        const carDriverResult = carDriverChoice?.conditional?.(interview, 'household.persons.personId3.journeys.journeyId3.trips.tripId1P2.segments.segmentId1P3T1.modePre');
        expect(carDriverResult).toEqual(true);
    });

    test('carDriver conditional should return false if no driving license information is available, but person is too young', () => {
        // Prepare test data with active person/journey/trip
        const interview = _cloneDeep(interviewAttributesForTestCases);
        interview.responses._activePersonId = 'personId3';
        interview.responses._activeJourneyId = 'journeyId3';
        interview.responses._activeTripId = 'tripId1P3';
        interview.responses.household!.persons!.personId3!.age = 15;

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
        ['carDriver', ['customSurvey:segments:mode:CarDriver', 'segments:mode:CarDriver']],
        ['carPassenger', ['customSurvey:segments:mode:CarPassenger', 'segments:mode:CarPassenger']],
        ['taxi', ['customSurvey:segments:mode:Taxi', 'segments:mode:Taxi']],
        ['bicycle', ['customSurvey:segments:mode:Bicycle', 'segments:mode:Bicycle']],
        ['transit', ['customSurvey:segments:mode:Transit', 'segments:mode:Transit']],
        ['walk', ['customSurvey:segments:mode:Walk', 'segments:mode:Walk']],
        ['other', ['customSurvey:segments:mode:Other', 'segments:mode:Other']],
        ['dontKnow', ['customSurvey:segments:mode:DontKnow', 'segments:mode:DontKnow']]
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
        interview.responses._activePersonId = 'personId2';
        const person = surveyHelper.getPerson({ interview });
        person!.hasDisability = 'yes'
        const mockedT = jest.fn();
        const choice = choices.find((choice) => choice.value === 'walk');
        translateString(choice?.label, { t: mockedT } as any, interview, 'path');
        expect(mockedT).toHaveBeenCalledWith(['customSurvey:segments:mode:WalkOrMobilityHelp', 'segments:mode:WalkOrMobilityHelp']);
    });

});

describe('Mode validations', () => {
    // Prepare test data with active person/journey/trip
    const interview = _cloneDeep(interviewAttributesForTestCases);

    const widgetConfig = getModePreWidgetConfig({}) as QuestionWidgetConfig & InputRadioType;
    const validations = widgetConfig.validations;

    test('should return no error if value is not empty', () => {
        expect(validations!(null, null, interview, 'household.persons.personId2.journeys.journeyId2.trips.tripId1P2.segments.segmentId1P2T1.modePre'))
            .toEqual([{ validation: true, errorMessage: expect.anything() }]);
    });

    test('should return an error if value is empty', () => {
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

describe('Mode conditional', () => {
    const widgetConfig = getModePreWidgetConfig({}) as QuestionWidgetConfig & InputRadioType;
    const conditional = widgetConfig.conditional;

    test('should be displayed by default', () => {
        // Prepare interview data
        const interview = _cloneDeep(interviewAttributesForTestCases);
        interview.responses._activePersonId = 'personId2';
        interview.responses._activeJourneyId = 'journeyId2';
        interview.responses._activeTripId = 'tripId1P2';

        // Test conditional
        const result = conditional!(interview, 'household.persons.personId2.journeys.journeyId2.trips.tripId1P2.segments.segmentId1P2T1.modePre');
        expect(result).toEqual([true, null]);
    });

    test('should be displayed, if no trip and no journey', () => {
        // Prepare interview data, with no active object, but setting the same mode as reverse
        const interview = _cloneDeep(interviewAttributesForTestCases);
        
        // Test conditional
        const result = conditional!(interview, 'household.persons.personId2.journeys.journeyId2.trips.tripId1P2.segments.segmentId1P2T1.modePre');
        expect(result).toEqual([true, null]);
    });

    test('should be displayed, if no trip and no journey, even if same mode as return', () => {
        // Prepare interview data, with no active object, but setting the same mode as reverse
        const interview = _cloneDeep(interviewAttributesForTestCases);
        setResponse(interview, 'household.persons.personId2.journeys.journeyId2.trips.tripId2P2.segments.segmentId1P2T2.sameModeAsReverseTrip', true);

        // Test conditional
        const result = conditional!(interview, 'household.persons.personId2.journeys.journeyId2.trips.tripId2P2.segments.segmentId1P2T2.modePre');
        expect(result).toEqual([true, null]);
    });

    test('should not be displayed if same mode as reverse trip and segment is new', () => {
        // Prepare interview data and set same mode as reverse trip and segment new
        const interview = _cloneDeep(interviewAttributesForTestCases);
        interview.responses._activePersonId = 'personId2';
        interview.responses._activeJourneyId = 'journeyId2';
        interview.responses._activeTripId = 'tripId2P2';
        setResponse(interview, 'household.persons.personId2.journeys.journeyId2.trips.tripId2P2.segments.segmentId1P2T2.sameModeAsReverseTrip', true);
        setResponse(interview, 'household.persons.personId2.journeys.journeyId2.trips.tripId2P2.segments.segmentId1P2T2._isNew', true);

        // Test conditional
        const result = conditional!(interview, 'household.persons.personId2.journeys.journeyId2.trips.tripId2P2.segments.segmentId1P2T2.modePre');
        expect(result).toEqual([false, 'walk']);
    });

    test('should be displayed if same mode as reverse trip but segment is not new', () => {
        // Prepare interview data and set same mode as reverse trip and segment new
        const interview = _cloneDeep(interviewAttributesForTestCases);
        interview.responses._activePersonId = 'personId2';
        interview.responses._activeJourneyId = 'journeyId2';
        interview.responses._activeTripId = 'tripId2P2';
        setResponse(interview, 'household.persons.personId2.journeys.journeyId2.trips.tripId2P2.segments.segmentId1P2T2.sameModeAsReverseTrip', true);
        setResponse(interview, 'household.persons.personId2.journeys.journeyId2.trips.tripId2P2.segments.segmentId1P2T2._isNew', false);

        // Test conditional
        const result = conditional!(interview, 'household.persons.personId2.journeys.journeyId2.trips.tripId2P2.segments.segmentId1P2T2.modePre');
        expect(result).toEqual([true, null]);
    });

    test('should be displayed if same mode as reverse trip, but no previous trip', () => {
        // Prepare interview data and set same mode as reverse trip on trip1
        const interview = _cloneDeep(interviewAttributesForTestCases);
        interview.responses._activePersonId = 'personId2';
        interview.responses._activeJourneyId = 'journeyId2';
        interview.responses._activeTripId = 'tripId1P2';
        setResponse(interview, 'household.persons.personId2.journeys.journeyId2.trips.tripId1P2.segments.segmentId1P2T1.sameModeAsReverseTrip', true);

        // Test conditional
        const result = conditional!(interview, 'household.persons.personId2.journeys.journeyId2.trips.tripId1P2.segments.segmentId1P2T1.modePre');
        expect(result).toEqual([true, null]);
    });
});

describe('Mode label', () => {
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
    })

    test('should return the right label for first segment', () => {
        // Prepare mocked data
        const originName = 'originName';
        const destinationName = 'destinationName';
        const context = 'currentContext';
        mockedGetPlaceName.mockReturnValueOnce(originName).mockReturnValueOnce(destinationName);
        mockedGetContext.mockReturnValue(context);

        // Prepare interview
        const interview = _cloneDeep(interviewAttributesForTestCases);
        interview.responses._activePersonId = 'personId2';
        interview.responses._activeJourneyId = 'journeyId2';
        interview.responses._activeTripId = 'tripId2P2';

        // Test label function
        translateString(label, { t: mockedT } as any, interview, `${p2t2segmentsPath}.segmentId1P2T2.modePre`);
        expect(mockedT).toHaveBeenCalledWith(['customSurvey:segments:ModeFirst', 'segments:ModeFirst'], {
            context,
            originName,
            destinationName,
            count: 1
        });
        expect(mockedT).toHaveBeenCalledTimes(1);
        expect(mockedGetPlaceName).toHaveBeenCalledWith({ t: mockedT, visitedPlace: interview.responses.household!.persons!.personId2!.journeys!.journeyId2!.visitedPlaces!.shoppingPlace1P2, interview });
        expect(mockedGetPlaceName).toHaveBeenCalledWith({ t: mockedT, visitedPlace: interview.responses.household!.persons!.personId2!.journeys!.journeyId2!.visitedPlaces!.otherWorkPlace1P2, interview });
        expect(mockedGetCountOrSelfDeclared).toHaveBeenCalledWith({ interview, person: interview.responses.household!.persons!.personId2 });
    });

    test('should return label with generic place names, when origin/destination do not exist', () => {
        // Prepare mocked data
        const context = 'currentContext';
        const count = 3;
        mockedGetContext.mockReturnValue(context);
        mockedGetCountOrSelfDeclared.mockReturnValueOnce(count)

        // Prepare interview
        const interview = _cloneDeep(interviewAttributesForTestCases);
        interview.responses._activePersonId = 'personId2';
        interview.responses._activeJourneyId = 'journeyId2';
        interview.responses._activeTripId = 'tripId2P2';
        // Change trip for one with undefined origin/destination
        interview.responses.household!.persons!.personId2!.journeys!.journeyId2!.trips!.tripId2P2 = {
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
        }

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
        interview.responses._activePersonId = 'personId2';
        interview.responses._activeJourneyId = 'journeyId2';
        interview.responses._activeTripId = 'tripId2P2';

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
        interview.responses._activePersonId = 'personId2';
        interview.responses._activeJourneyId = 'journeyId2';
        interview.responses._activeTripId = 'tripId2P2';

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