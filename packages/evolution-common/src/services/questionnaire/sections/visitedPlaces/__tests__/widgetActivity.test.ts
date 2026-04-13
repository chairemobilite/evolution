/*
 * Copyright 2026, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _cloneDeep from 'lodash/cloneDeep';
import each from 'jest-each';
import { InputRadioType, QuestionWidgetConfig, RadioChoiceType } from '../../../../questionnaire/types';
import { interviewAttributesForTestCases, setActiveSurveyObjects, widgetFactoryOptions } from '../../../../../tests/surveys';
import { setResponse, translateString } from '../../../../../utils/helpers';
import {
    Activity,
    activityCategoryValues,
    activityToDisplayCategory,
    activityValues
} from '../../../../odSurvey/types';
import * as odHelpers from '../../../../odSurvey/helpers';
import { getActivityWidgetConfig } from '../widgetActivity';

const visitedPlacesSectionConfig = {
    type: 'visitedPlaces' as const,
    enabled: true,
    tripDiaryMinTimeOfDay: 4 * 60 * 60, // 4h in seconds
    tripDiaryMaxTimeOfDay: 28 * 60 * 60 // 28h in seconds (i.e. 4h the next day)
};

describe('getActivityWidgetConfig', () => {
    test('should return the correct widget config', () => {
        const widgetConfig = getActivityWidgetConfig(visitedPlacesSectionConfig, widgetFactoryOptions);

        expect(widgetConfig).toEqual({
            type: 'question',
            path: 'activity',
            inputType: 'radio',
            twoColumns: false,
            datatype: 'string',
            columns: 2,
            label: expect.any(Function),
            choices: activityValues.map((activity) =>
                expect.objectContaining({
                    value: activity,
                    label: expect.any(Function),
                    conditional: expect.any(Function),
                    iconPath: expect.any(String)
                })
            ),
            validations: expect.any(Function),
            conditional: expect.any(Function)
        });
    });

    test('should throw if there are no available activities', () => {
        expect(() =>
            getActivityWidgetConfig(
                {
                    ...visitedPlacesSectionConfig,
                    enabled: false
                },
                widgetFactoryOptions
            )
        ).toThrow('No available activities to create activity widget configuration');
    });
});

describe('Activity choices conditionals', () => {
    const widgetConfig = getActivityWidgetConfig(visitedPlacesSectionConfig, widgetFactoryOptions) as QuestionWidgetConfig &
        InputRadioType;
    const choices = widgetConfig.choices as RadioChoiceType[];

    const interview = _cloneDeep(interviewAttributesForTestCases);
    // Make sure conditional on carsharing members return true
    jest.spyOn(odHelpers, 'getCarsharingMembersCount').mockReturnValue(1);
    const activityPath =
        'household.persons.personId1.journeys.journeyId1.visitedPlaces.workPlace1P1.activity';
    const activityCategoryPath =
        'household.persons.personId1.journeys.journeyId1.visitedPlaces.workPlace1P1.activityCategory';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    each(
        activityValues.flatMap((activity) =>
            activityCategoryValues.map((activityCategory) => [
                activity,
                activityCategory,
                activityToDisplayCategory[activity].includes(activityCategory)
            ])
        )
    ).test(
        'activity %s should be shown for activityCategory %s: %s',
        (activityValue, activityCategoryValue, expected) => {
            const activityChoice = choices.find((choice) => choice.value === activityValue);
            expect(activityChoice).toBeDefined();

            setResponse(interview, activityCategoryPath, activityCategoryValue);
            const result = activityChoice?.conditional?.(interview, activityPath);
            expect(result).toEqual(expected);
        }
    );

    test('all activity choices should be hidden if activityCategory is blank', () => {
        setResponse(interview, activityCategoryPath, undefined);

        const availableActivities = choices.filter((choice) => choice.conditional?.(interview, activityPath) === true);
        expect(availableActivities).toHaveLength(0);
    });
});

describe('Activity choices labels', () => {
    const widgetConfig = getActivityWidgetConfig(visitedPlacesSectionConfig, widgetFactoryOptions) as QuestionWidgetConfig &
        InputRadioType;
    const choices = widgetConfig.choices as RadioChoiceType[];
    const interview = _cloneDeep(interviewAttributesForTestCases);

    each(activityValues).test('should return the right label for %s choice', (choiceValue) => {
        const mockedT = jest.fn();
        const choice = choices.find((c) => c.value === choiceValue);
        expect(choice).toBeDefined();
        translateString(choice?.label, { t: mockedT } as any, interview, 'path');
        expect(mockedT).toHaveBeenCalledWith(`visitedPlaces:activities.${choiceValue}`);
    });
});

describe('Activity per-choice conditionals', () => {
    const widgetConfig = getActivityWidgetConfig(visitedPlacesSectionConfig, widgetFactoryOptions) as QuestionWidgetConfig &
        InputRadioType;
    const choices = widgetConfig.choices as RadioChoiceType[];

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('workUsual conditional should return false for non-worker occupation without usual work place', () => {
        const interview = _cloneDeep(interviewAttributesForTestCases);
        const workUsualChoice = choices.find((c) => c.value === 'workUsual');
        expect(workUsualChoice).toBeDefined();

        setActiveSurveyObjects(interview, { personId: 'personId1', journeyId: 'journeyId1', visitedPlaceId: 'workPlace1P1' });
        interview.response.household!.persons!.personId1!.occupation = 'fullTimeStudent';
        (interview.response.household!.persons!.personId1! as any).usualWorkPlace = undefined;

        expect(workUsualChoice?.conditional?.(interview, 'household.persons.personId1.journeys.journeyId1.visitedPlaces.workPlace1P1.activity')).toEqual(false);
    });

    test('workUsual conditional should return true for worker with usual work place', () => {
        const interview = _cloneDeep(interviewAttributesForTestCases);
        const workUsualChoice = choices.find((c) => c.value === 'workUsual');
        expect(workUsualChoice).toBeDefined();

        setActiveSurveyObjects(interview, { personId: 'personId1', journeyId: 'journeyId1', visitedPlaceId: 'workPlace1P1' });
        interview.response.household!.persons!.personId1!.occupation = 'fullTimeWorker';
        (interview.response.household!.persons!.personId1! as any).usualWorkPlace = {
            geography: {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [-73, 45] },
                properties: { lastAction: 'mapClicked' }
            }
        };

        expect(workUsualChoice?.conditional?.(interview, 'household.persons.personId1.journeys.journeyId1.visitedPlaces.workPlace1P1.activity')).toEqual(true);
    });

    test('workUsual conditional should return true if occupation is not set', () => {
        const interview = _cloneDeep(interviewAttributesForTestCases);
        const workUsualChoice = choices.find((c) => c.value === 'workUsual');
        expect(workUsualChoice).toBeDefined();

        setActiveSurveyObjects(interview, { personId: 'personId1', journeyId: 'journeyId1', visitedPlaceId: 'workPlace1P1' });
        interview.response.household!.persons!.personId1!.occupation = undefined;
        (interview.response.household!.persons!.personId1! as any).usualWorkPlace = undefined;

        expect(workUsualChoice?.conditional?.(interview, 'household.persons.personId1.journeys.journeyId1.visitedPlaces.workPlace1P1.activity')).toEqual(true);
    });

    test('schoolUsual conditional should return false when active person is missing', () => {
        const interview = _cloneDeep(interviewAttributesForTestCases);
        // Set wrong active person to trigger invalid person condition in the conditional function
        setActiveSurveyObjects(interview, { personId: 'personId4', journeyId: 'journeyId4', visitedPlaceId: 'schoolPlace1P4' });
        const schoolUsualChoice = choices.find((c) => c.value === 'schoolUsual');
        expect(schoolUsualChoice).toBeDefined();

        expect(schoolUsualChoice?.conditional?.(interview, 'household.persons.personId3.journeys.journeyId3.visitedPlaces.schoolPlace1P3.activity')).toEqual(false);
    });

    test('schoolUsual conditional should return true for kindergarten', () => {
        const interview = _cloneDeep(interviewAttributesForTestCases);
        const schoolUsualChoice = choices.find((c) => c.value === 'schoolUsual');
        expect(schoolUsualChoice).toBeDefined();

        setActiveSurveyObjects(interview, { personId: 'personId3', journeyId: 'journeyId3', visitedPlaceId: 'schoolPlace1P3' });
        interview.response.household!.persons!.personId3!.schoolType = 'kindergarten';

        expect(schoolUsualChoice?.conditional?.(interview, 'household.persons.personId3.journeys.journeyId3.visitedPlaces.schoolPlace1P3.activity')).toEqual(true);
    });

    test('schoolUsual conditional should return true if occupation is not set', () => {
        const interview = _cloneDeep(interviewAttributesForTestCases);
        const schoolUsualChoice = choices.find((c) => c.value === 'schoolUsual');
        expect(schoolUsualChoice).toBeDefined();

        setActiveSurveyObjects(interview, { personId: 'personId3', journeyId: 'journeyId3', visitedPlaceId: 'schoolPlace1P3' });
        interview.response.household!.persons!.personId3!.occupation = undefined;

        expect(schoolUsualChoice?.conditional?.(interview, 'household.persons.personId3.journeys.journeyId3.visitedPlaces.schoolPlace1P3.activity')).toEqual(true);
    });

    test('schoolUsual conditional should return false for non-student without usual school place', () => {
        const interview = _cloneDeep(interviewAttributesForTestCases);
        const schoolUsualChoice = choices.find((c) => c.value === 'schoolUsual');
        expect(schoolUsualChoice).toBeDefined();

        setActiveSurveyObjects(interview, { personId: 'personId3', journeyId: 'journeyId3', visitedPlaceId: 'schoolPlace1P3' });
        interview.response.household!.persons!.personId3!.occupation = 'fullTimeWorker';
        interview.response.household!.persons!.personId3!.age = 30;
        (interview.response.household!.persons!.personId3! as any).usualSchoolPlace = undefined;

        expect(schoolUsualChoice?.conditional?.(interview, 'household.persons.personId3.journeys.journeyId3.visitedPlaces.schoolPlace1P3.activity')).toEqual(false);
    });

    test('carElectricChargingStation conditional should delegate to hasOrUnknownDrivingLicense', () => {
        const interview = _cloneDeep(interviewAttributesForTestCases);
        const choice = choices.find((c) => c.value === 'carElectricChargingStation');
        expect(choice).toBeDefined();

        const hasDrivingLicenseSpy = jest.spyOn(odHelpers, 'hasOrUnknownDrivingLicense').mockReturnValueOnce(true);
        setActiveSurveyObjects(interview, { personId: 'personId2', journeyId: 'journeyId2', visitedPlaceId: 'otherWorkPlace1P2' });

        expect(choice?.conditional?.(interview, 'household.persons.personId2.journeys.journeyId2.visitedPlaces.otherWorkPlace1P2.activity')).toEqual(true);
        expect(hasDrivingLicenseSpy).toHaveBeenCalledWith({
            person: interview.response.household!.persons!.personId2
        });
    });

    test('carElectricChargingStation conditional should return false when active person is missing', () => {
        const interview = _cloneDeep(interviewAttributesForTestCases);
        const choice = choices.find((c) => c.value === 'carElectricChargingStation');
        expect(choice).toBeDefined();

        setResponse(interview, '_activePersonId', null);
        expect(choice?.conditional?.(interview, 'household.persons.personId2.journeys.journeyId2.visitedPlaces.otherWorkPlace1P2.activity')).toEqual(false);
    });

    each([
        ['no carsharing members', 0, false],
        ['at least one carsharing member', 1, true]
    ]).test('carsharingStation conditional: %s', (_title, membersCount, expected) => {
        const interview = _cloneDeep(interviewAttributesForTestCases);
        const choice = choices.find((c) => c.value === 'carsharingStation');
        expect(choice).toBeDefined();

        const membersCountSpy = jest
            .spyOn(odHelpers, 'getCarsharingMembersCount')
            .mockReturnValueOnce(membersCount);
        setActiveSurveyObjects(interview, { personId: 'personId2', journeyId: 'journeyId2', visitedPlaceId: 'otherWorkPlace1P2' });

        expect(choice?.conditional?.(interview, 'household.persons.personId2.journeys.journeyId2.visitedPlaces.otherWorkPlace1P2.activity')).toEqual(expected);
        expect(membersCountSpy).toHaveBeenCalledWith({ interview });
    });
});

describe('Activity next/previous incompatibility validations', () => {
    const widgetConfig = getActivityWidgetConfig(visitedPlacesSectionConfig, widgetFactoryOptions) as QuestionWidgetConfig &
        InputRadioType;
    const choices = widgetConfig.choices as RadioChoiceType[];

    const getActivityConditionalResult = (activity: Activity, interview: typeof interviewAttributesForTestCases) => {
        const choice = choices.find((c) => c.value === activity);
        expect(choice).toBeDefined();
        const path =
            'household.persons.personId1.journeys.journeyId1.visitedPlaces.currentPlace.activity';
        return choice?.conditional?.(interview, path);
    };

    each([
        [
            'home should be invalid when previous place is home',
            {
                prevPlace: { _uuid: 'prevPlace', _sequence: 1, activityCategory: 'home', activity: 'home' },
                currentPlace: { _uuid: 'currentPlace', _sequence: 2, activityCategory: 'home', activity: 'other' },
                nextPlace: {
                    _uuid: 'nextPlace',
                    _sequence: 3,
                    activityCategory: 'shoppingServiceRestaurant',
                    activity: 'shopping'
                }
            },
            'home',
            false
        ],
        [
            'home should be invalid when next place is home',
            {
                prevPlace: {
                    _uuid: 'prevPlace',
                    _sequence: 1,
                    activityCategory: 'shoppingServiceRestaurant',
                    activity: 'shopping'
                },
                currentPlace: { _uuid: 'currentPlace', _sequence: 2, activityCategory: 'home', activity: 'other' },
                nextPlace: { _uuid: 'nextPlace', _sequence: 3, activityCategory: 'home', activity: 'home' }
            },
            'home',
            false
        ],
        [
            'home should be valid when adjacent places are not home',
            {
                prevPlace: {
                    _uuid: 'prevPlace',
                    _sequence: 1,
                    activityCategory: 'shoppingServiceRestaurant',
                    activity: 'shopping'
                },
                currentPlace: { _uuid: 'currentPlace', _sequence: 2, activityCategory: 'home', activity: 'other' },
                nextPlace: {
                    _uuid: 'nextPlace',
                    _sequence: 3,
                    activityCategory: 'shoppingServiceRestaurant',
                    activity: 'shopping'
                }
            },
            'home',
            true
        ],
        [
            'workUsual should be invalid when previous place is workUsual',
            {
                prevPlace: { _uuid: 'prevPlace', _sequence: 1, activityCategory: 'work', activity: 'workUsual' },
                currentPlace: { _uuid: 'currentPlace', _sequence: 2, activityCategory: 'work', activity: 'other' },
                nextPlace: {
                    _uuid: 'nextPlace',
                    _sequence: 3,
                    activityCategory: 'shoppingServiceRestaurant',
                    activity: 'shopping'
                }
            },
            'workUsual',
            false
        ],
        [
            'leisureStroll should be invalid when previous is workOnTheRoad',
            {
                prevPlace: { _uuid: 'prevPlace', _sequence: 1, activityCategory: 'work', activity: 'workOnTheRoad' },
                currentPlace: { _uuid: 'currentPlace', _sequence: 2, activityCategory: 'other', activity: 'leisureStroll' }
            },
            'leisureStroll',
            false
        ]
    ]).test('%s', (_title, visitedPlaces, activity: Activity, expected) => {
        const interview = _cloneDeep(interviewAttributesForTestCases);
        setActiveSurveyObjects(interview, { personId: 'personId1', journeyId: 'journeyId1', visitedPlaceId: 'currentPlace' });
        interview.response.household!.persons!.personId1!.journeys!.journeyId1!.visitedPlaces = visitedPlaces as any;
        interview.response.household!.persons!.personId1!.occupation = undefined;

        expect(getActivityConditionalResult(activity, interview)).toEqual(expected);
    });
});

describe('Activity widget label', () => {
    const widgetConfig = getActivityWidgetConfig(visitedPlacesSectionConfig, widgetFactoryOptions) as QuestionWidgetConfig &
        InputRadioType;
    const label = widgetConfig.label;

    test('should return the right translation key', () => {
        const mockedT = jest.fn();
        const interview = _cloneDeep(interviewAttributesForTestCases);

        translateString(label, { t: mockedT } as any, interview, 'path');
        expect(mockedT).toHaveBeenCalledWith('visitedPlaces:Activity');
    });
});

describe('Activity validations', () => {
    const widgetConfig = getActivityWidgetConfig(visitedPlacesSectionConfig, widgetFactoryOptions) as QuestionWidgetConfig &
        InputRadioType;
    const validations = widgetConfig.validations;
    const interview = _cloneDeep(interviewAttributesForTestCases);

    test('should return error when value is blank', () => {
        expect(validations!(undefined, null, interview, 'path')).toEqual([
            {
                validation: true,
                errorMessage: expect.any(Function)
            }
        ]);
    });

    test('should return no error when value is set and expose proper error message key', () => {
        const validation = validations!('shopping', null, interview, 'path');
        expect(validation).toEqual([
            {
                validation: false,
                errorMessage: expect.any(Function)
            }
        ]);

        const mockedT = jest.fn();
        translateString(validation[0].errorMessage, { t: mockedT } as any, interview, 'path');
        expect(mockedT).toHaveBeenCalledWith('visitedPlaces:activityIsRequiredError');
    });
});

describe('Activity widget conditional', () => {
    const widgetConfig = getActivityWidgetConfig(visitedPlacesSectionConfig, widgetFactoryOptions) as QuestionWidgetConfig &
        InputRadioType;
    const conditional = widgetConfig.conditional;

    const interview = _cloneDeep(interviewAttributesForTestCases);
    const activityPath =
        'household.persons.personId1.journeys.journeyId1.visitedPlaces.workPlace1P1.activity';
    const activityCategoryPath =
        'household.persons.personId1.journeys.journeyId1.visitedPlaces.workPlace1P1.activityCategory';

    test('should hide widget and assign null when activityCategory is blank', () => {
        setResponse(interview, activityCategoryPath, undefined);
        expect(conditional?.(interview, activityPath)).toEqual([false, null]);
    });

    test('should hide widget and assign the only matching activity when there is a single choice', () => {
        setResponse(interview, activityCategoryPath, 'dontKnow');
        expect(conditional?.(interview, activityPath)).toEqual([false, 'dontKnow']);
    });

    test('should show widget when there are multiple matching activities', () => {
        setResponse(interview, activityCategoryPath, 'shoppingServiceRestaurant');
        expect(conditional?.(interview, activityPath)).toEqual([true, null]);
    });
});
