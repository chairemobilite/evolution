/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _cloneDeep from 'lodash/cloneDeep';
import each from 'jest-each';
import { InputRadioType, QuestionWidgetConfig, RadioChoiceType } from '../../../../questionnaire/types';
import { interviewAttributesForTestCases, setActiveSurveyObjects, widgetFactoryOptions } from '../../../../../tests/surveys';
import { setResponse, translateString } from '../../../../../utils/helpers';
import * as odHelpers from '../../../../odSurvey/helpers';
import { getNextPlaceCategoryWidgetConfig } from '../widgetNextPlaceCategory';

const visitedPlacesSectionConfig = {
    type: 'visitedPlaces' as const,
    enabled: true,
    tripDiaryMinTimeOfDay: 4 * 60 * 60, // 4 AM in seconds
    tripDiaryMaxTimeOfDay: 28 * 60 * 60 // 4 AM the next day, in seconds
};

describe('getNextPlaceCategoryWidgetConfig', () => {
    test('should return the correct widget config', () => {
        const widgetConfig = getNextPlaceCategoryWidgetConfig(visitedPlacesSectionConfig, widgetFactoryOptions);

        expect(widgetConfig).toEqual({
            type: 'question',
            inputType: 'radio',
            path: 'nextPlaceCategory',
            datatype: 'string',
            twoColumns: false,
            sameLine: false,
            containsHtml: true,
            label: expect.any(Function),
            choices: expect.any(Array),
            validations: expect.any(Function),
            conditional: expect.any(Function)
        });
    });

    test('should have 4 choice options', () => {
        const widgetConfig = getNextPlaceCategoryWidgetConfig(
            visitedPlacesSectionConfig,
            widgetFactoryOptions
        ) as QuestionWidgetConfig & InputRadioType;

        expect(widgetConfig.choices).toHaveLength(4);
        const choiceValues = (widgetConfig.choices as RadioChoiceType[]).map((c) => c.value);
        expect(choiceValues).toContain('wentBackHome');
        expect(choiceValues).toContain('visitedAnotherPlace');
        expect(choiceValues).toContain('stayedThereUntilTheNextDay');
        expect(choiceValues).toContain('wentToUsualWorkPlace');
    });
});

describe('NextPlaceCategory choices conditionals', () => {
    const widgetConfig = getNextPlaceCategoryWidgetConfig(
        visitedPlacesSectionConfig,
        widgetFactoryOptions
    ) as QuestionWidgetConfig & InputRadioType;
    const choices = widgetConfig.choices as RadioChoiceType[];

    test('wentBackHome conditional should return false when active place is home', () => {
        const interview = _cloneDeep(interviewAttributesForTestCases);
        setActiveSurveyObjects(interview, { personId: 'personId1', journeyId: 'journeyId1', visitedPlaceId: 'homePlace1P1' });

        const wentBackHomeChoice = choices.find((c) => c.value === 'wentBackHome');
        expect(wentBackHomeChoice).toBeDefined();
        expect(
            wentBackHomeChoice?.conditional?.(
                interview,
                'household.persons.personId1.journeys.journeyId1.visitedPlaces.homePlace1P1.nextPlaceCategory'
            )
        ).toEqual(false);
    });

    test('wentBackHome conditional should return false when active place is workOnTheRoad', () => {
        const interview = _cloneDeep(interviewAttributesForTestCases);
        setActiveSurveyObjects(interview, { personId: 'personId1', journeyId: 'journeyId1', visitedPlaceId: 'workPlace1P1' });
        const visitedPlace = interview.response.household!.persons!.personId1!.journeys!.journeyId1!
            .visitedPlaces!.workPlace1P1;
        (visitedPlace as any).activity = 'workOnTheRoad';

        const wentBackHomeChoice = choices.find((c) => c.value === 'wentBackHome');
        expect(wentBackHomeChoice).toBeDefined();
        expect(
            wentBackHomeChoice?.conditional?.(
                interview,
                'household.persons.personId1.journeys.journeyId1.visitedPlaces.workPlace1P1.nextPlaceCategory'
            )
        ).toEqual(false);
    });

    test('wentBackHome conditional should return true when active place is not home or workOnTheRoad', () => {
        const interview = _cloneDeep(interviewAttributesForTestCases);
        setActiveSurveyObjects(interview, { personId: 'personId1', journeyId: 'journeyId1', visitedPlaceId: 'workPlace1P1' });

        const wentBackHomeChoice = choices.find((c) => c.value === 'wentBackHome');
        expect(wentBackHomeChoice).toBeDefined();
        expect(
            wentBackHomeChoice?.conditional?.(
                interview,
                'household.persons.personId1.journeys.journeyId1.visitedPlaces.workPlace1P1.nextPlaceCategory'
            )
        ).toEqual(true);
    });

    test.each([
        ['not last place', false, 'homePlace1P1'],
        ['last place', true, 'otherPlace2P1']
    ])('stayedThereUntilTheNextDay conditional: case %s should return %s for place %s', (_, expected, placeUuid) => {
        const interview = _cloneDeep(interviewAttributesForTestCases);
        const stayedChoice = (choices as RadioChoiceType[]).find((c) => c.value === 'stayedThereUntilTheNextDay');

        // Test the requested place
        setActiveSurveyObjects(interview, { personId: 'personId1', journeyId: 'journeyId1', visitedPlaceId: placeUuid });
        expect(stayedChoice).toBeDefined();
        expect(
            stayedChoice?.conditional?.(
                interview,
                `household.persons.personId1.journeys.journeyId1.visitedPlaces.${placeUuid}.nextPlaceCategory`
            )
        ).toEqual(expected);

    });
});

describe('NextPlaceCategory choices labels', () => {
    const widgetConfig = getNextPlaceCategoryWidgetConfig(
        visitedPlacesSectionConfig,
        widgetFactoryOptions
    ) as QuestionWidgetConfig & InputRadioType;
    const choices = widgetConfig.choices as RadioChoiceType[];
    let interview = _cloneDeep(interviewAttributesForTestCases);

    beforeEach(() => {
        interview = _cloneDeep(interviewAttributesForTestCases);
        setActiveSurveyObjects(interview, { personId: 'personId1', journeyId: 'journeyId1', visitedPlaceId: 'workPlace1P1' });
    });

    test('wentBackHome label should include home address', () => {
        const mockedT = jest.fn();
        const wentBackHomeChoice = choices.find((c) => c.value === 'wentBackHome');
        expect(wentBackHomeChoice).toBeDefined();

        translateString(wentBackHomeChoice?.label, { t: mockedT } as any, interview, 'household.persons.personId1.journeys.journeyId1.visitedPlaces.workPlace1P1.nextPlaceCategory');
        expect(mockedT).toHaveBeenCalledWith(
            'visitedPlaces:nextPlaceRadioChoices.wentBackHome',
            expect.objectContaining({
                address: '1234 Main St, Montreal',
                context: undefined
            })
        );
    });

    test('visitedAnotherPlace label should be called with correct key', () => {
        const mockedT = jest.fn();
        const visitedAnotherChoice = choices.find((c) => c.value === 'visitedAnotherPlace');
        expect(visitedAnotherChoice).toBeDefined();

        translateString(visitedAnotherChoice?.label, { t: mockedT } as any, interview, 'household.persons.personId1.journeys.journeyId1.visitedPlaces.workPlace1P1.nextPlaceCategory');
        expect(mockedT).toHaveBeenCalledWith(
            'visitedPlaces:nextPlaceRadioChoices.visitedAnotherPlace',
            expect.objectContaining({
                context: undefined
            })
        );
    });

    test.each([
        ['home', 'homePlace1P1', 'visitedPlaces:nextPlaceRadioChoices.stayedHomeUntilTheNextDay'],
        ['other', 'workPlace1P1', 'visitedPlaces:nextPlaceRadioChoices.stayedThereUntilTheNextDay']
    ])('stayedThereUntilTheNextDay label should be called with right label when activity is %s', (_, placeUuid, expectedKey) => {
        const mockedT = jest.fn();
        
        const stayedChoice = (choices as RadioChoiceType[]).find((c) => c.value === 'stayedThereUntilTheNextDay');
        expect(stayedChoice).toBeDefined();

        translateString(stayedChoice?.label, { t: mockedT } as any, interview, `household.persons.personId1.journeys.journeyId1.visitedPlaces.${placeUuid}.nextPlaceCategory`);
        expect(mockedT).toHaveBeenCalledWith(
            expectedKey,
            expect.objectContaining({
                context: undefined
            })
        );
    });

    test('wentToUsualWorkPlace should be hidden', () => {
        const wentToUsualWorkChoice = choices.find((c) => c.value === 'wentToUsualWorkPlace');
        expect(wentToUsualWorkChoice).toBeDefined();
        expect(wentToUsualWorkChoice?.hidden).toEqual(true);
    });
});

describe('NextPlaceCategory widget label', () => {
    const widgetConfig = getNextPlaceCategoryWidgetConfig(
        visitedPlacesSectionConfig,
        widgetFactoryOptions
    ) as QuestionWidgetConfig & InputRadioType;
    const label = widgetConfig.label;
    let interview = _cloneDeep(interviewAttributesForTestCases);
    const mockedT = jest.fn().mockImplementation((str) => str);

    beforeEach(() => {
        interview = _cloneDeep(interviewAttributesForTestCases);
        jest.clearAllMocks();
        setActiveSurveyObjects(interview, { personId: 'personId1', journeyId: 'journeyId1', visitedPlaceId: 'workPlace1P1' });
    });

    test('should call translation function with correct key and context', () => {
        translateString(label, { t: mockedT } as any, interview, 'household.persons.personId1.journeys.journeyId1.visitedPlaces.workPlace1P1.nextPlaceCategory');
        expect(mockedT).toHaveBeenCalledWith(
            'visitedPlaces:nextPlaceCategory',
            expect.objectContaining({
                context: undefined,
                nickname: expect.any(String),
                atPlace: expect.any(String),
                count: expect.any(Number)
            })
        );
    });

    test('should throw error if active person is missing', () => {
        setResponse(interview, '_activePersonId', null);

        expect(() =>
            translateString(label, { t: mockedT } as any, interview, 'household.persons.personId1.journeys.journeyId1.visitedPlaces.workPlace1P1.nextPlaceCategory')
        ).toThrow('Active person or visited place not found in interview response');
    });

    test('should use visited place name in atPlace when name exists', () => {
        translateString(label, { t: mockedT } as any, interview, 'household.persons.personId1.journeys.journeyId1.visitedPlaces.workPlace1P1.nextPlaceCategory');
        expect(mockedT).toHaveBeenCalledWith('survey:atPlace', expect.objectContaining({
            placeName: expect.any(String)
        }));
    });
});

describe('NextPlaceCategory validations', () => {
    const widgetConfig = getNextPlaceCategoryWidgetConfig(
        visitedPlacesSectionConfig,
        widgetFactoryOptions
    ) as QuestionWidgetConfig & InputRadioType;
    const validations = widgetConfig.validations;
    const interview = _cloneDeep(interviewAttributesForTestCases);

    test('should return error when value is blank', () => {
        expect(validations!(undefined, null, interview, 'household.persons.personId1.journeys.journeyId1.visitedPlaces.workPlace1P1.nextPlaceCategory')).toEqual([
            {
                validation: true,
                errorMessage: expect.any(Object)
            }
        ]);
    });

    test('should return no error when value is set', () => {
        const validation = validations!('wentBackHome', null, interview, 'household.persons.personId1.journeys.journeyId1.visitedPlaces.workPlace1P1.nextPlaceCategory');
        expect(validation).toEqual([
            {
                validation: false,
                errorMessage: expect.any(Object)
            }
        ]);
    });
});

describe('NextPlaceCategory widget conditional', () => {
    const widgetConfig = getNextPlaceCategoryWidgetConfig(
        visitedPlacesSectionConfig,
        widgetFactoryOptions
    ) as QuestionWidgetConfig & InputRadioType;
    const conditional = widgetConfig.conditional;
    let interview = _cloneDeep(interviewAttributesForTestCases);

    beforeEach(() => {
        interview = _cloneDeep(interviewAttributesForTestCases);
        // By default, set the last place as active
        setActiveSurveyObjects(interview, { personId: 'personId1', journeyId: 'journeyId1', visitedPlaceId: 'otherPlace2P1' });
    });

    test('should return auto-filled stayedThereUntilTheNextDay when arrival time equals max time of day', () => {
        const visitedPlace = interview.response.household!.persons!.personId1!.journeys!.journeyId1!
            .visitedPlaces!.otherPlace2P1;
        (visitedPlace as any).arrivalTime = visitedPlacesSectionConfig.tripDiaryMaxTimeOfDay;

        expect(conditional?.(interview, 'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlace2P1.nextPlaceCategory')).toEqual([
            false,
            'stayedThereUntilTheNextDay'
        ]);
    });

    test('should return auto-filled stayedThereUntilTheNextDay for loop activity with onTheRoadArrivalType to stayed there', () => {
        const visitedPlace = interview.response.household!.persons!.personId1!.journeys!.journeyId1!
            .visitedPlaces!.otherPlace2P1;
        (visitedPlace as any).activity = 'workOnTheRoad';
        (visitedPlace as any).activityCategory = 'work';
        (visitedPlace as any).onTheRoadArrivalType = 'stayedThereUntilTheNextDay';

        setActiveSurveyObjects(interview, { personId: 'personId1', journeyId: 'journeyId1', visitedPlaceId: 'otherPlace2P1' });
        expect(
            conditional?.(interview, 'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlace2P1.nextPlaceCategory')
        ).toEqual([false, 'stayedThereUntilTheNextDay']);
    });

    test('should hide widget when no activity is set', () => {
        const visitedPlace = interview.response.household!.persons!.personId1!.journeys!.journeyId1!
            .visitedPlaces!.otherPlace2P1;
        delete (visitedPlace as any).activity;

        expect(
            conditional?.(interview, 'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlace2P1.nextPlaceCategory')
        ).toEqual([false, null]);
    });

    test('should hide widget when active place is not the last', () => {
        setActiveSurveyObjects(interview, { personId: 'personId1', journeyId: 'journeyId1', visitedPlaceId: 'homePlace1P1' });
        expect(
            conditional?.(interview, 'household.persons.personId1.journeys.journeyId1.visitedPlaces.homePlace1P1.nextPlaceCategory')
        ).toEqual([false, null]);
    });

    test('should hide widget when last place is workOnTheRoad', () => {
       const visitedPlace = interview.response.household!.persons!.personId1!.journeys!.journeyId1!
            .visitedPlaces!.otherPlace2P1;
        (visitedPlace as any).activity = 'workOnTheRoad';

        expect(
            conditional?.(interview, `household.persons.personId1.journeys.journeyId1.visitedPlaces.${visitedPlace._uuid}.nextPlaceCategory`)
        ).toEqual([false, null]);
    });

    each([
        ['work', 'workUsual'],
        ['shopping', 'shopping'],
        ['leisure', 'leisureStroll']
    ]).test(
        'should show widget when last place has activity %s and is not workOnTheRoad',
        (_title, activity) => {
            const journey = interview.response.household!.persons!.personId1!.journeys!.journeyId1!;
            const visitedPlacesArray = odHelpers.getVisitedPlacesArray({ journey });
            const lastPlace = visitedPlacesArray[visitedPlacesArray.length - 1];

            setActiveSurveyObjects(interview, { personId: 'personId1', journeyId: 'journeyId1', visitedPlaceId: lastPlace._uuid });
            (lastPlace as any).activity = activity;

            expect(
                conditional?.(interview, `household.persons.personId1.journeys.journeyId1.visitedPlaces.${lastPlace._uuid}.nextPlaceCategory`)
            ).toEqual([true, null]);
        }
    );
});
