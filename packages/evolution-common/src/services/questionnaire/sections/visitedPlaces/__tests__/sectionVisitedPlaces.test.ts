/*
 * Copyright 2026, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _cloneDeep from 'lodash/cloneDeep';
import { v4 as uuidv4 } from 'uuid';

import { interviewAttributesForTestCases, maskFunctions, setActiveSurveyObjects, widgetFactoryOptions } from '../../../../../tests/surveys';
import * as utilHelpers from '../../../../../utils/helpers';
import * as odHelpers from '../../../../odSurvey/helpers';
import {
	Journey,
	UserRuntimeInterviewAttributes,
	VisitedPlacesSectionConfiguration,
	WidgetConfig
} from '../../../types';
import { getButtonConfirmGotoNextSectionWidgetConfig } from '../buttonConfirmGotoNextSection';
import { PersonVisitedPlacesGroupConfigFactory } from '../groupPersonVisitedPlaces';
import { VisitedPlacesSectionFactory } from '../sectionVisitedPlaces';
import { getPersonVisitedPlacesTitleWidgetConfig } from '../widgetPersonVisitedPlacesTitle';
import { getPersonVisitedPlacesMapConfig } from '../../common/widgetPersonVisitedPlacesMap';
import { SwitchPersonWidgetsFactory } from '../../common/widgetsSwitchPerson';
import { tripDiarySectionVisibleConditional } from '../../tripDiary/tripDiaryHelpers';

jest.mock('uuid', () => ({
	v4: jest.fn().mockReturnValue('newVisitedPlaceId')
}));

const mockUuidv4 = uuidv4 as jest.MockedFunction<typeof uuidv4>;

const visitedPlacesSectionConfig: VisitedPlacesSectionConfiguration = {
	type: 'visitedPlaces',
	enabled: true,
	tripDiaryMinTimeOfDay: 4 * 60 * 60,
	tripDiaryMaxTimeOfDay: 28 * 60 * 60
};

beforeEach(() => {
	jest.clearAllMocks();
});

describe('VisitedPlacesSectionFactory#getSectionConfig', () => {
	test('should return the correct section config when section enabled', () => {
		const sectionFactory = new VisitedPlacesSectionFactory(visitedPlacesSectionConfig, widgetFactoryOptions);
		const sectionConfig = sectionFactory.getSectionConfig();

		expect(sectionConfig).toEqual({
			previousSection: 'tripsIntro',
			nextSection: 'segments',
			isSectionVisible: tripDiarySectionVisibleConditional,
			isSectionCompleted: expect.any(Function),
			onSectionEntry: expect.any(Function),
			template: 'visitedPlaces',
			title: expect.any(Function),
			widgets: [
				'activePersonTitle',
				'buttonSwitchPerson',
				'personVisitedPlacesTitle',
				'personVisitedPlaces',
				'personVisitedPlacesMap',
				'buttonVisitedPlacesConfirmNextSection'
			]
		});
	});

	test('should throw when section is disabled', () => {
		expect(
			() =>
				new VisitedPlacesSectionFactory(
					{ ...visitedPlacesSectionConfig, enabled: false },
					widgetFactoryOptions
				)
		).toThrow('Visited places section configuration requested but the section is not enabled');
	});
});

describe('VisitedPlacesSectionFactory#getWidgetConfigs', () => {
	test.each([
		'personVisitedPlacesTitle',
		'personVisitedPlaces',
		'personVisitedPlacesMap',
		'buttonVisitedPlacesConfirmNextSection'
	])('should have a widget named %s', (widgetName) => {
		const widgetConfigs = new VisitedPlacesSectionFactory(visitedPlacesSectionConfig, widgetFactoryOptions).getWidgetConfigs();
		expect(Object.keys(widgetConfigs)).toContain(widgetName);
	});

	describe('should include all widgets from person visited places group', () => {
		const personVisitedPlacesGroupConfig = new PersonVisitedPlacesGroupConfigFactory(
			visitedPlacesSectionConfig,
			widgetFactoryOptions
		).getWidgetConfigs();
		const personVisitedPlacesWidgetNames = Object.keys(personVisitedPlacesGroupConfig);

		test('there should be widgets in the person visited places group', () => {
			expect(personVisitedPlacesWidgetNames.length).toBeGreaterThan(0);
		});

		test.each(
			personVisitedPlacesWidgetNames.map((widgetName) => ({
				widgetName,
				expected: personVisitedPlacesGroupConfig[widgetName]
			}))
		)('should have the person visited places group widget named $widgetName', ({ widgetName, expected }) => {
			const widgetConfigs = new VisitedPlacesSectionFactory(
				visitedPlacesSectionConfig,
				widgetFactoryOptions
			).getWidgetConfigs();
			expect(maskFunctions(widgetConfigs[widgetName])).toEqual(maskFunctions(expected));
		});
	});

	describe('should include all widgets from switch person set', () => {
		const switchPersonWidgetConfig = new SwitchPersonWidgetsFactory(widgetFactoryOptions).getWidgetConfigs();
		const switchPersonWidgetNames = Object.keys(switchPersonWidgetConfig);

		test('there should be widgets in the switch person group', () => {
			expect(switchPersonWidgetNames.length).toBeGreaterThan(0);
		});

		test.each(
			switchPersonWidgetNames.map((widgetName) => ({
				widgetName,
				expected: switchPersonWidgetConfig[widgetName]
			}))
		)('should have the switch person widget named $widgetName', ({ widgetName, expected }) => {
			const widgetConfigs = new VisitedPlacesSectionFactory(
				visitedPlacesSectionConfig,
				widgetFactoryOptions
			).getWidgetConfigs();
			expect(maskFunctions(widgetConfigs[widgetName])).toEqual(maskFunctions(expected));
		});
	});

	test('should not return extra widgets', () => {
		const widgetConfigs = new VisitedPlacesSectionFactory(visitedPlacesSectionConfig, widgetFactoryOptions).getWidgetConfigs();
		const switchPersonsWidgetNames = Object.keys(new SwitchPersonWidgetsFactory(widgetFactoryOptions).getWidgetConfigs());
		const visitedPlacesGroupWidgetNames = Object.keys(
			new PersonVisitedPlacesGroupConfigFactory(visitedPlacesSectionConfig, widgetFactoryOptions).getWidgetConfigs()
		);

		expect(Object.keys(widgetConfigs).length).toBe(3 + switchPersonsWidgetNames.length + visitedPlacesGroupWidgetNames.length);
	});

	test.each([
		{
			widgetName: 'personVisitedPlacesTitle',
			expected: () => getPersonVisitedPlacesTitleWidgetConfig(visitedPlacesSectionConfig, widgetFactoryOptions)
		},
		{
			widgetName: 'personVisitedPlacesMap',
			expected: () => getPersonVisitedPlacesMapConfig(widgetFactoryOptions)
		},
		{
			widgetName: 'buttonVisitedPlacesConfirmNextSection',
			expected: () => getButtonConfirmGotoNextSectionWidgetConfig(visitedPlacesSectionConfig, widgetFactoryOptions)
		}
	])('should return the correct widget config for $widgetName', ({ widgetName, expected }: {
		widgetName: string;
		expected: () => WidgetConfig;
	}) => {
		const widgetConfigs = new VisitedPlacesSectionFactory(visitedPlacesSectionConfig, widgetFactoryOptions).getWidgetConfigs();
		expect(maskFunctions(widgetConfigs[widgetName])).toEqual(maskFunctions(expected()));
	});
});

describe('VisitedPlacesSectionFactory section config functionality', () => {
    // Copy the interview attributes before each test for a fresh start
    let testInterview: UserRuntimeInterviewAttributes;

    beforeEach(() => {
        testInterview = _cloneDeep(interviewAttributesForTestCases);
        setActiveSurveyObjects(testInterview, { personId: 'personId1', journeyId: 'journeyId1' });
    });

	describe('title', () => {
		test('should return the right label for title', () => {
			const sectionConfig = new VisitedPlacesSectionFactory(visitedPlacesSectionConfig, widgetFactoryOptions).getSectionConfig();
			const mockedT = jest.fn();
			utilHelpers.translateString(sectionConfig.title, { t: mockedT } as any, testInterview, 'path');
			expect(mockedT).toHaveBeenCalledWith('visitedPlaces:VisitedPlacesTitle');
		});
	});

	describe('isSectionCompleted', () => {
		const sectionConfig = new VisitedPlacesSectionFactory(visitedPlacesSectionConfig, widgetFactoryOptions).getSectionConfig();
		const iterationContext = ['personId1'];

		test('should return false if person does not exist', () => {
			const result = sectionConfig.isSectionCompleted!(testInterview, ['unexistingPerson']);
			expect(result).toBe(false);
		});

		test('should return false if no iteration context', () => {
            // Unset active objects
            setActiveSurveyObjects(testInterview, {});
			const result = sectionConfig.isSectionCompleted!(testInterview, undefined);
			expect(result).toBe(false);
		});

		test('should return false if there are no visited places', () => {
			testInterview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces = {};

			const result = sectionConfig.isSectionCompleted!(testInterview, iterationContext);
			expect(result).toBe(false);
		});

		test('should return true when there are visited places and no incomplete visited place', () => {
			const result = sectionConfig.isSectionCompleted!(testInterview, iterationContext);
			expect(result).toBe(true);
		});

		test('should return false when there is an incomplete visited place', () => {
            // Set the next place category of the last place to undefined to make it incomplete
			testInterview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.otherPlace2P1.nextPlaceCategory = undefined;

			const result = sectionConfig.isSectionCompleted!(testInterview, iterationContext);
			expect(result).toBe(false);
		});
	});

	describe('onSectionEntry', () => {
		const sectionConfig = new VisitedPlacesSectionFactory(visitedPlacesSectionConfig, widgetFactoryOptions).getSectionConfig();
		const iterationContext = ['personId1'];

		test('should return undefined if person does not exist', () => {
            // Unset active objects
            setActiveSurveyObjects(testInterview, { });
			const result = sectionConfig.onSectionEntry!(testInterview, ['unexistingPerson']);
			expect(result).toBeUndefined();
		});

		test('should return undefined if no iteration context', () => {
            // Unset active objects
            setActiveSurveyObjects(testInterview, { });
			const result = sectionConfig.onSectionEntry!(testInterview, undefined);
			expect(result).toBeUndefined();
		});

		test('should return undefined if person has no active journey', () => {
            // Set journey to null
			setActiveSurveyObjects(testInterview, { personId: 'personIdWithoutJourney', journeyId: undefined });
			const result = sectionConfig.onSectionEntry!(testInterview, iterationContext);
			expect(result).toBeUndefined();
		});

		test('should set active visited place ID to next incomplete visited place', () => {
			// Remove the arrival time of otherPlaceP1 to make it incomplete
			testInterview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.otherPlaceP1.arrivalTime = undefined;

			const result = sectionConfig.onSectionEntry!(testInterview, iterationContext);
			expect(result).toEqual({ 'response._activeVisitedPlaceId': 'otherPlaceP1' });
		});

		test('should set active visited place ID to undefined when all visited places are complete', () => {
			// Journey should be complete with all required attributes by default in the test interview
			const result = sectionConfig.onSectionEntry!(testInterview, iterationContext);
			expect(result).toEqual({ 'response._activeVisitedPlaceId': undefined });
		});

		test('should add 2 visited places when departure place is home and select the second one', () => {
            // Reset the visited places for journey and set departure place to home
			const testJourney = testInterview.response.household!.persons!.personId1.journeys!.journeyId1;
			testJourney.departurePlaceIsHome = 'yes';
			testJourney.visitedPlaces = {};
			mockUuidv4.mockReturnValueOnce('placeId1' as any);
			mockUuidv4.mockReturnValueOnce('placeId2' as any);

			const result = sectionConfig.onSectionEntry!(testInterview, iterationContext);
			expect(result).toEqual({
				'response.household.persons.personId1.journeys.journeyId1.visitedPlaces.placeId1': {
					_sequence: 1,
					_uuid: 'placeId1',
					activity: 'home',
					activityCategory: 'home',
					nextPlaceCategory: 'visitedAnotherPlace'
				},
				'validations.household.persons.personId1.journeys.journeyId1.visitedPlaces.placeId1': {},
				'response.household.persons.personId1.journeys.journeyId1.visitedPlaces.placeId2': {
					_sequence: 2,
					_uuid: 'placeId2'
				},
				'validations.household.persons.personId1.journeys.journeyId1.visitedPlaces.placeId2': {},
				'response._activeVisitedPlaceId': 'placeId2'
			});
		});

		test.each([
			{
				departurePlaceOther: 'otherParentHome',
				expected: { activity: 'otherParentHome', activityCategory: 'otherParentHome' }
			},
			{
				departurePlaceOther: 'restaurant',
				expected: { activity: 'restaurant', activityCategory: 'shoppingServiceRestaurant' }
			},
			{
				departurePlaceOther: 'secondaryHome',
				expected: { activity: 'secondaryHome', activityCategory: 'leisure' }
			},
			{
				departurePlaceOther: 'sleptAtFriends',
				expected: { activity: 'visiting', activityCategory: 'leisure' }
			},
			{
				departurePlaceOther: 'hotelForWork',
				expected: { activity: 'workNotUsual', activityCategory: 'work' }
			},
			{
				departurePlaceOther: 'hotelForVacation',
				expected: { activity: 'leisureTourism', activityCategory: 'leisure' }
			},
			{
				departurePlaceOther: 'studying',
				expected: { activity: null, activityCategory: 'school' }
			},
			{
				departurePlaceOther: 'workedOvernight',
				expected: { activity: null, activityCategory: 'work' }
			},
			{
				departurePlaceOther: 'unknownValue',
				expected: { activity: null, activityCategory: null }
			}
		])(
			'should map departurePlaceOther "$departurePlaceOther" to the first visited place attributes',
			({ departurePlaceOther, expected }) => {
                // Reset the visited places for journey and set departure place type to other
				const testJourney = testInterview.response.household!.persons!.personId1.journeys!.journeyId1;
				testJourney.departurePlaceIsHome = 'no';
				testJourney.departurePlaceOther = departurePlaceOther;
				testJourney.visitedPlaces = {};
				mockUuidv4.mockReturnValueOnce('placeId1' as any);

				const result = sectionConfig.onSectionEntry!(testInterview, iterationContext);
				expect(result).toEqual({
					'response.household.persons.personId1.journeys.journeyId1.visitedPlaces.placeId1': {
						_sequence: 1,
						_uuid: 'placeId1',
						...expected
					},
					'validations.household.persons.personId1.journeys.journeyId1.visitedPlaces.placeId1': {},
					'response._activeVisitedPlaceId': 'placeId1'
				});
			}
		);
	});
});