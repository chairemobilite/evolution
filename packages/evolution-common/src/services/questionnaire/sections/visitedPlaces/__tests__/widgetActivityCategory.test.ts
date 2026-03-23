/*
 * Copyright 2026, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _cloneDeep from 'lodash/cloneDeep';
import each from 'jest-each';
import { InputRadioType, QuestionWidgetConfig, RadioChoiceType } from '../../../../questionnaire/types';
import { interviewAttributesForTestCases, widgetFactoryOptions } from '../../../../../tests/surveys';
import { setResponse, translateString } from '../../../../../utils/helpers';
import * as odHelpers from '../../../../odSurvey/helpers';
import { getActivityCategoryWidgetConfig } from '../widgetActivityCategory';

const visitedPlacesSectionConfig = {
	type: 'visitedPlaces' as const,
	enabled: true
};

const setActiveVisitedPlace = (
	interview: typeof interviewAttributesForTestCases,
	personId: string,
	journeyId: string,
	visitedPlaceId: string
) => {
	setResponse(interview, '_activePersonId', personId);
	setResponse(interview, '_activeJourneyId', journeyId);
	setResponse(interview, '_activeVisitedPlaceId', visitedPlaceId);
};

describe('getActivityCategoryWidgetConfig', () => {
	test('should return the correct widget config', () => {
		const widgetConfig = getActivityCategoryWidgetConfig(
			visitedPlacesSectionConfig,
			widgetFactoryOptions
		) as QuestionWidgetConfig & InputRadioType;

		expect(widgetConfig).toEqual({
			type: 'question',
			path: 'activityCategory',
			inputType: 'radio',
			twoColumns: false,
			datatype: 'string',
			columns: 2,
			containsHtml: true,
			useAssignedValueOnHide: true,
			choices: expect.arrayContaining([
				expect.objectContaining({ value: 'home', label: expect.any(Function), conditional: expect.any(Function) }),
				expect.objectContaining({ value: 'work', label: expect.any(Function), conditional: expect.any(Function) }),
				expect.objectContaining({ value: 'school', label: expect.any(Function), conditional: expect.any(Function) }),
				expect.objectContaining({ value: 'shoppingServiceRestaurant', label: expect.any(Function) }),
				expect.objectContaining({ value: 'dropFetchSomeone', label: expect.any(Function) }),
				expect.objectContaining({ value: 'leisure', label: expect.any(Function) }),
				expect.objectContaining({ value: 'otherParentHome', label: expect.any(Function), conditional: expect.any(Function) }),
				expect.objectContaining({ value: 'other', label: expect.any(Function) })
			]),
			label: expect.any(Function),
			validations: expect.any(Function),
			conditional: expect.any(Function)
		});
	});
});

describe('Activity category choices labels', () => {
	const widgetConfig = getActivityCategoryWidgetConfig(
		visitedPlacesSectionConfig,
		widgetFactoryOptions
	) as QuestionWidgetConfig & InputRadioType;
	const choices = widgetConfig.choices as RadioChoiceType[];
	const interview = _cloneDeep(interviewAttributesForTestCases);

	each([
		['home', 'visitedPlaces:activityCategories.home'],
		['work', 'visitedPlaces:activityCategories.work'],
		['shoppingServiceRestaurant', 'visitedPlaces:activityCategories.shoppingServiceRestaurant'],
		['dropFetchSomeone', 'visitedPlaces:activityCategories.dropFetchSomeone'],
		['leisure', 'visitedPlaces:activityCategories.leisure'],
		['otherParentHome', 'visitedPlaces:activityCategories.otherParentHome'],
		['other', 'visitedPlaces:activityCategories.other']
	]).test('should return the right label for %s choice', (choiceValue, expectedLabel) => {
		const mockedT = jest.fn();
		const choice = choices.find((c) => c.value === choiceValue);
		expect(choice).toBeDefined();
		translateString(choice?.label, { t: mockedT } as any, interview, 'path');
		expect(mockedT).toHaveBeenCalledWith(expectedLabel);
	});

	each([
		['childcare', 'visitedPlaces:activityCategories.childcare'],
		['kindergarten', 'visitedPlaces:activityCategories.kindergarten'],
		['kindergartenFor4YearsOld', 'visitedPlaces:activityCategories.school'],
		['primarySchool', 'visitedPlaces:activityCategories.school'],
		['secondarySchool', 'visitedPlaces:activityCategories.school'],
		['university', 'visitedPlaces:activityCategories.schoolStudies']
	]).test('school label should use right translation key for schoolType %s', (schoolType, expectedLabel) => {
		const mockedT = jest.fn();
		const schoolChoice = choices.find((c) => c.value === 'school');
		expect(schoolChoice).toBeDefined();
		setActiveVisitedPlace(interview, 'personId1', 'journeyId1', 'workPlace1P1');
		interview.response.household!.persons!.personId1!.schoolType = schoolType as any;
		translateString(schoolChoice?.label, { t: mockedT } as any, interview, 'path');
		expect(mockedT).toHaveBeenCalledWith(expectedLabel);
	});
});

describe('Activity category choices conditionals', () => {
	const widgetConfig = getActivityCategoryWidgetConfig(
		visitedPlacesSectionConfig,
		widgetFactoryOptions
	) as QuestionWidgetConfig & InputRadioType;
	const choices = widgetConfig.choices as RadioChoiceType[];

	const mockedIsStudentFromSchoolType = jest.spyOn(odHelpers, 'isStudentFromSchoolType');

	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('home conditional should return false when active person/journey/place is missing', () => {
		const interview = _cloneDeep(interviewAttributesForTestCases);
		const homeChoice = choices.find((c) => c.value === 'home');
		expect(homeChoice).toBeDefined();
		expect(homeChoice?.conditional?.(interview, 'path')).toEqual(false);
	});

	test('home conditional should return true when previous and next places are not home', () => {
		const interview = _cloneDeep(interviewAttributesForTestCases);
		interview.response.household!.persons!.personId1!.journeys!.journeyId1!.visitedPlaces = {
			firstPlace: { _uuid: 'firstPlace', _sequence: 1, activity: 'shopping', activityCategory: 'shoppingServiceRestaurant' },
			middlePlace: { _uuid: 'middlePlace', _sequence: 2, activity: 'other', activityCategory: 'leisure' },
			lastPlace: { _uuid: 'lastPlace', _sequence: 3, activity: 'workUsual', activityCategory: 'work' }
		};
		setActiveVisitedPlace(interview, 'personId1', 'journeyId1', 'middlePlace');
		const homeChoice = choices.find((c) => c.value === 'home');
		expect(homeChoice).toBeDefined();
		expect(homeChoice?.conditional?.(interview, 'path')).toEqual(true);
	});

	test('home conditional should return false when previous place activityCategory is home', () => {
		const interview = _cloneDeep(interviewAttributesForTestCases);
		setActiveVisitedPlace(interview, 'personId1', 'journeyId1', 'workPlace1P1');
		const homeChoice = choices.find((c) => c.value === 'home');
		expect(homeChoice).toBeDefined();
		expect(homeChoice?.conditional?.(interview, 'path')).toEqual(false);
	});

    test('home conditional should return false when next place activityCategory is home', () => {
		const interview = _cloneDeep(interviewAttributesForTestCases);
		setActiveVisitedPlace(interview, 'personId2', 'journeyId2', 'otherWorkPlace1P2');
		const homeChoice = choices.find((c) => c.value === 'home');
		expect(homeChoice).toBeDefined();
		expect(homeChoice?.conditional?.(interview, 'path')).toEqual(false);
	});

	each([
		['No person', null, false],
		['Age undefined', undefined, true],
		['Age below working age', 14, false],
		['Age at working age', 15, true]
	]).test('work conditional: %s', (_title, age, expected) => {
		const interview = _cloneDeep(interviewAttributesForTestCases);
		const workChoice = choices.find((c) => c.value === 'work');
		expect(workChoice).toBeDefined();

		if (age === null) {
			setResponse(interview, '_activePersonId', null);
		} else {
			setActiveVisitedPlace(interview, 'personId1', 'journeyId1', 'workPlace1P1');
			interview.response.household!.persons!.personId1!.age = age;
		}

		expect(workChoice?.conditional?.(interview, 'path')).toEqual(expected);
	});

    // FIXME Review this one
	each([
		['No person', false, null, undefined, undefined],
        ['Person with no age and occupation', true, undefined, undefined, undefined],
		['Full time student occupation', true, 45, 'fullTimeStudent', undefined],
        ['Part time student occupation', true, 10, 'partTimeStudent', undefined],
        ['Full time Worker occupation', true, 25, 'fullTimeWorker', undefined],
		['Part time Worker occupation', true, 18, 'partTimeWorker', undefined],
        ['Worker and student occupation', true, 60, 'workerAndStudent', undefined],
		['No occupation, isStudentFromEnrolled true', true, 4, undefined, true],
        ['No occupation, isStudentFromEnrolled true', false, 4, undefined, false],
		['Non-student/worker occupation, isStudentFromEnrolled true', true, 10, 'other', true],
		['Non-student/worker occupation, isStudentFromEnrolled false', false, 10, 'other', false]
	]).test(
		'school conditional: %s => %s',
		(_title, expected, age, occupation, isStudentFromEnrolledValue: boolean | undefined) => {
			const interview = _cloneDeep(interviewAttributesForTestCases);
			const schoolChoice = choices.find((c) => c.value === 'school');
			expect(schoolChoice).toBeDefined();

			if (age === null) {
				setResponse(interview, '_activePersonId', null);
			} else {
				setActiveVisitedPlace(interview, 'personId1', 'journeyId1', 'workPlace1P1');
				interview.response.household!.persons!.personId1!.age = age;
				interview.response.household!.persons!.personId1!.occupation = occupation as any;
				if (isStudentFromEnrolledValue !== undefined) {
					mockedIsStudentFromSchoolType.mockReturnValueOnce(isStudentFromEnrolledValue);
				}
			}

            // Test the conditional and verify the call to isStudentFromSchoolType
			expect(schoolChoice?.conditional?.(interview, 'path')).toEqual(expected);
			if (isStudentFromEnrolledValue !== undefined) {
				expect(mockedIsStudentFromSchoolType).toHaveBeenCalledWith({
					person: interview.response.household!.persons!.personId1!
				});
			} else {
                expect(mockedIsStudentFromSchoolType).not.toHaveBeenCalled();
            }
		}
	);

    each([
        ['No person', false, null],
        ['No age', false, undefined],
        ['Person below adult age', true, 10],
        ['Person below adult age, previous place is otherParentHome', false, 10, {
			firstPlace: { _uuid: 'firstPlace', _sequence: 1, activity: 'shopping', activityCategory: 'otherParentHome' },
			workPlace1P1: { _uuid: 'workPlace1P1', _sequence: 2, activity: 'other', activityCategory: 'leisure' }
		}],
        ['Person below adult age, next place is otherParentHome', false, 10, {
            workPlace1P1: { _uuid: 'workPlace1P1', _sequence: 1, activity: 'other', activityCategory: 'leisure' },
            middlePlace: { _uuid: 'middlePlace', _sequence: 2, activity: 'other', activityCategory: 'otherParentHome' },
        }],
        ['Person exactly adult age', false, 18],
        ['Person of adult age', false, 20]
    ]).test('otherParentHome conditional: %s => %s', (_title, expected, age, visitedPlaces = false) => {
        // Prepare interview data
		const interview = _cloneDeep(interviewAttributesForTestCases);
        if (age === null) {
            setResponse(interview, '_activePersonId', null);
        } else {
            setActiveVisitedPlace(interview, 'personId1', 'journeyId1', 'workPlace1P1');
            interview.response.household!.persons!.personId1!.age = age;
            // Set the visitedPlaces if provided, otherwise, use the default ones
            if (visitedPlaces) {
                interview.response.household!.persons!.personId1!.journeys!.journeyId1!.visitedPlaces = visitedPlaces;
            }
        }

        // Test the conditional
		const otherParentHomeChoice = choices.find((c) => c.value === 'otherParentHome');
		expect(otherParentHomeChoice).toBeDefined();
		expect(otherParentHomeChoice?.conditional?.(interview, 'path')).toEqual(expected);
	});

});

describe('Activity category widget label', () => {
	const widgetConfig = getActivityCategoryWidgetConfig(
		visitedPlacesSectionConfig,
		widgetFactoryOptions
	) as QuestionWidgetConfig & InputRadioType;
	const label = widgetConfig.label;

	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('should return empty string when person/journey/active place is missing', () => {
		const interview = _cloneDeep(interviewAttributesForTestCases);
		const mockedT = jest.fn();
		const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
		expect(translateString(label, { t: mockedT } as any, interview, 'path')).toEqual('');
		expect(consoleSpy).toHaveBeenCalled();
		consoleSpy.mockRestore();
	});

	test('should use first location label for first visited place', () => {
		const interview = _cloneDeep(interviewAttributesForTestCases);
		const mockedT = jest.fn().mockReturnValue('translatedLabel');
		setActiveVisitedPlace(interview, 'personId1', 'journeyId1', 'homePlace1P1');
		expect(translateString(label, { t: mockedT } as any, interview, 'path')).toEqual('translatedLabel');
		expect(mockedT).toHaveBeenCalledWith('visitedPlaces:ActivityCategoryFirstLocation');
	});

	test('should use after home label for second place when first place activity is home', () => {
		const interview = _cloneDeep(interviewAttributesForTestCases);
		const mockedT = jest.fn().mockReturnValue('translatedLabel');
		setActiveVisitedPlace(interview, 'personId1', 'journeyId1', 'workPlace1P1');
		expect(translateString(label, { t: mockedT } as any, interview, 'path')).toEqual('translatedLabel');
		expect(mockedT).toHaveBeenCalledWith('visitedPlaces:ActivityCategoryAfterHome');
	});

	test('should use default activity category label for other places', () => {
		const interview = _cloneDeep(interviewAttributesForTestCases);
		const mockedT = jest.fn().mockReturnValue('translatedLabel');
		setActiveVisitedPlace(interview, 'personId1', 'journeyId1', 'homePlace2P1');
		expect(translateString(label, { t: mockedT } as any, interview, 'path')).toEqual('translatedLabel');
		expect(mockedT).toHaveBeenCalledWith('visitedPlaces:ActivityCategory');
	});
});

describe('Activity category validations', () => {
	const interview = _cloneDeep(interviewAttributesForTestCases);
	const widgetConfig = getActivityCategoryWidgetConfig(
		visitedPlacesSectionConfig,
		widgetFactoryOptions
	) as QuestionWidgetConfig & InputRadioType;
	const validations = widgetConfig.validations;

	test('should return error when value is blank', () => {
		expect(validations!(undefined, null, interview, 'path')).toEqual([
			{
				validation: true,
				errorMessage: expect.any(Function)
			}
		]);
	});

	test('should return no error when value is set', () => {
        const validation = validations!('home', null, interview, 'path');
        expect(validation).toEqual([
			{
				validation: false,
				errorMessage: expect.any(Function)
			}
		]);

        // Verify the error message
		const mockedT = jest.fn();
		translateString(validation[0].errorMessage, { t: mockedT } as any, interview, 'path');
		expect(mockedT).toHaveBeenCalledWith('visitedPlaces:activityIsRequiredError');
	});
});

describe('Activity category widget conditional', () => {
	const widgetConfig = getActivityCategoryWidgetConfig(
		visitedPlacesSectionConfig,
		widgetFactoryOptions
	) as QuestionWidgetConfig & InputRadioType;
	const conditional = widgetConfig.conditional;

	test('should hide widget and assign home when active visited place is a new home place', () => {
		const interview = _cloneDeep(interviewAttributesForTestCases);
		setActiveVisitedPlace(interview, 'personId1', 'journeyId1', 'homePlace2P1');
		const activeVisitedPlace = interview.response.household!.persons!.personId1!.journeys!.journeyId1!.visitedPlaces!
			.homePlace2P1!;
		(activeVisitedPlace as any)._isNew = true;
		activeVisitedPlace.activityCategory = 'home' as any;

		expect(conditional!(interview, 'path')).toEqual([false, 'home']);
	});

	test('should show widget in regular case', () => {
		const interview = _cloneDeep(interviewAttributesForTestCases);
		setActiveVisitedPlace(interview, 'personId1', 'journeyId1', 'workPlace1P1');
		expect(conditional!(interview, 'path')).toEqual([true]);
	});
});
