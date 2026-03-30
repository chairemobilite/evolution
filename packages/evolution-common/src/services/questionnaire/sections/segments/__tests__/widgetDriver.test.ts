/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _cloneDeep from 'lodash/cloneDeep';
import { QuestionWidgetConfig } from '../../../../questionnaire/types';
import { getSegmentDriverWidgetConfig } from '../widgetDriver';
import { interviewAttributesForTestCases, widgetFactoryOptions } from '../../../../../tests/surveys';
import { setResponse, translateString } from '../../../../../utils/helpers';
import * as odHelpers from '../../../../odSurvey/helpers';

const segmentSectionConfig = {
	type: 'segments' as const,
	enabled: true
};

describe('widgetDriver config', () => {
	test('should return the expected base widget configuration', () => {
		const widgetConfig = getSegmentDriverWidgetConfig(segmentSectionConfig, widgetFactoryOptions);
		expect(widgetConfig).toEqual({
			type: 'question',
			path: 'driver',
			inputType: 'select',
			datatype: 'string',
			twoColumns: false,
			label: expect.any(Function),
			choices: expect.any(Function),
			conditional: expect.any(Function),
			validations: expect.any(Function)
		});
	});
});

describe('widgetDriver label', () => {
	test('should use active person context and count in label', () => {
		const mockedGetActivePerson = jest.spyOn(odHelpers, 'getActivePerson').mockReturnValue({
			_uuid: 'personId1',
			_sequence: 1,
			gender: 'female'
		} as any);
		const mockedGetCountOrSelfDeclared = jest.spyOn(odHelpers, 'getCountOrSelfDeclared').mockReturnValue(2);
		const mockedT = jest.fn();

		const interview = _cloneDeep(interviewAttributesForTestCases);
		const widgetConfig = getSegmentDriverWidgetConfig(
			segmentSectionConfig,
			widgetFactoryOptions
		) as QuestionWidgetConfig;
		translateString(widgetConfig.label, { t: mockedT } as any, interview, 'some.path.driver');

		expect(mockedT).toHaveBeenCalledWith('segments:Driver', { context: 'female', count: 2 });
		expect(mockedGetActivePerson).toHaveBeenCalledWith({ interview });
		expect(mockedGetCountOrSelfDeclared).toHaveBeenCalledWith({
			interview,
			person: { _uuid: 'personId1', _sequence: 1, gender: 'female' }
		});
	});
});

describe('widgetDriver choices', () => {
	beforeEach(() => {
		jest.restoreAllMocks();
	});

	test('should return empty choices if there is no active person', () => {
		jest.spyOn(odHelpers, 'getActivePerson').mockReturnValue(null);

		const interview = _cloneDeep(interviewAttributesForTestCases);
		const widgetConfig = getSegmentDriverWidgetConfig(
			segmentSectionConfig,
			widgetFactoryOptions
		) as any;
		const choices = (widgetConfig.choices as any)(interview, 'some.path.driver');

		expect(choices).toEqual([]);
	});

	test('should prepend household drivers and exclude active person', () => {
		const activePerson = { _uuid: 'personId1', _sequence: 1 } as any;
		jest.spyOn(odHelpers, 'getActivePerson').mockReturnValue(activePerson);
        // Return the active person as one of the drivers to test that they are
        // properly excluded from the choices, and that the other drivers are
        // included
		jest.spyOn(odHelpers, 'getPotentialDrivers').mockReturnValue([
			activePerson,
			{ _uuid: 'personId2', _sequence: 2, nickname: 'The Dude' } as any,
			{ _uuid: 'personId3', _sequence: 3 } as any
		]);

		const interview = _cloneDeep(interviewAttributesForTestCases);
		const widgetConfig = getSegmentDriverWidgetConfig(
			segmentSectionConfig,
			widgetFactoryOptions
		) as any;
		const choices = (widgetConfig.choices as any)(interview, 'some.path.driver');

		expect(choices).toHaveLength(3);
        expect(choices).toEqual([{
            groupShortname: '',
            groupLabel: '',
            choices: [
                { value: 'personId2', label: expect.any(Function) },
                { value: 'personId3', label: expect.any(Function) }
            ]
        }, {
            groupShortname: '',
            groupLabel: '',
            choices: [
                { value: 'familyMember', label: expect.any(Function) },
                { value: 'colleague', label: expect.any(Function) },
            ]
        }, {
            groupShortname: '',
            groupLabel: '',
            choices: [
                { value: 'taxiDriver', label: expect.any(Function) },
                { value: 'transitTaxiDriver', label: expect.any(Function) },
                { value: 'paratransit', label: expect.any(Function), conditional: expect.any(Function) },
                { value: 'carpool', label: expect.any(Function) },
                { value: 'other', label: expect.any(Function) },
                { value: 'dontKnow', label: expect.any(Function), conditional: expect.any(Function) }
            ]
        }]);

        // Make sure the labels for household drivers are correctly generated using the person helper
        const mockedT = jest.fn();
        // person ID2 should return the nickname since it is defined
        const personId2Choice = choices[0].choices.find((choice: any) => choice.value === 'personId2');
        expect(translateString(personId2Choice.label, { t: mockedT } as any, interview, 'some.path.driver')).toEqual('The Dude');
        expect(mockedT).not.toHaveBeenCalled();
        // person ID3 should call the `t` function with the personWithSequence key since there is no nickname and no age defined
        const personId3Choice = choices[0].choices.find((choice: any) => choice.value === 'personId3');
        translateString(personId3Choice.label, { t: mockedT } as any, interview, 'some.path.driver');
        expect(mockedT).toHaveBeenCalledWith('survey:personWithSequence', { sequence: 3, context: undefined });
	});

    test('should not contain household members if the person is the only driver in the household', () => {
		const activePerson = { _uuid: 'personId1', _sequence: 1 } as any;
		jest.spyOn(odHelpers, 'getActivePerson').mockReturnValue(activePerson);
        // Return the active person as the only driver
		jest.spyOn(odHelpers, 'getPotentialDrivers').mockReturnValue([
			activePerson
        ]);

		const interview = _cloneDeep(interviewAttributesForTestCases);
		const widgetConfig = getSegmentDriverWidgetConfig(
			segmentSectionConfig,
			widgetFactoryOptions
		) as any;
		const choices = (widgetConfig.choices as any)(interview, 'some.path.driver');

		expect(choices).toHaveLength(2);
        expect(choices).toEqual([{
            groupShortname: '',
            groupLabel: '',
            choices: [
                { value: 'familyMember', label: expect.any(Function) },
                { value: 'colleague', label: expect.any(Function) },
            ]
        }, {
            groupShortname: '',
            groupLabel: '',
            choices: [
                { value: 'taxiDriver', label: expect.any(Function) },
                { value: 'transitTaxiDriver', label: expect.any(Function) },
                { value: 'paratransit', label: expect.any(Function), conditional: expect.any(Function) },
                { value: 'carpool', label: expect.any(Function) },
                { value: 'other', label: expect.any(Function) },
                { value: 'dontKnow', label: expect.any(Function), conditional: expect.any(Function) }
            ]
        }]);
	});

    test('should not contain household members if there are no drivers in the household', () => {
		const activePerson = { _uuid: 'personId1', _sequence: 1 } as any;
		jest.spyOn(odHelpers, 'getActivePerson').mockReturnValue(activePerson);
        // Return no drivers
		jest.spyOn(odHelpers, 'getPotentialDrivers').mockReturnValue([]);

		const interview = _cloneDeep(interviewAttributesForTestCases);
		const widgetConfig = getSegmentDriverWidgetConfig(
			segmentSectionConfig,
			widgetFactoryOptions
		) as any;
		const choices = (widgetConfig.choices as any)(interview, 'some.path.driver');

		expect(choices).toHaveLength(2);
        expect(choices).toEqual([{
            groupShortname: '',
            groupLabel: '',
            choices: [
                { value: 'familyMember', label: expect.any(Function) },
                { value: 'colleague', label: expect.any(Function) },
            ]
        }, {
            groupShortname: '',
            groupLabel: '',
            choices: [
                { value: 'taxiDriver', label: expect.any(Function) },
                { value: 'transitTaxiDriver', label: expect.any(Function) },
                { value: 'paratransit', label: expect.any(Function), conditional: expect.any(Function) },
                { value: 'carpool', label: expect.any(Function) },
                { value: 'other', label: expect.any(Function) },
                { value: 'dontKnow', label: expect.any(Function), conditional: expect.any(Function) }
            ]
        }]);
	});

	test('paratransit conditional should depend on disability helpers', () => {
		const activePerson = { _uuid: 'personId1', _sequence: 1 } as any;
		jest.spyOn(odHelpers, 'getActivePerson').mockReturnValue(activePerson);
		jest.spyOn(odHelpers, 'getPotentialDrivers').mockReturnValue([]);
		const mockedPersonMayHaveDisability = jest.spyOn(odHelpers, 'personMayHaveDisability');
		const mockedHouseholdMayHaveDisability = jest.spyOn(odHelpers, 'householdMayHaveDisability');

		const interview = _cloneDeep(interviewAttributesForTestCases);
		const widgetConfig = getSegmentDriverWidgetConfig(
			segmentSectionConfig,
			widgetFactoryOptions
		) as any;
		const choices = (widgetConfig.choices as any)(interview, 'some.path.driver');
		const groupedChoices = choices.flatMap((group: any) => group.choices);
		const paratransit = groupedChoices.find((choice: any) => choice.value === 'paratransit');

		mockedPersonMayHaveDisability.mockReturnValueOnce(false);
		mockedHouseholdMayHaveDisability.mockReturnValueOnce(true);
		expect(paratransit.conditional(interview, 'some.path.driver')).toEqual(true);
        expect(mockedPersonMayHaveDisability).toHaveBeenCalledWith({ person: activePerson });
        expect(mockedHouseholdMayHaveDisability).toHaveBeenCalledWith({ interview });
        expect(mockedPersonMayHaveDisability).toHaveBeenCalledTimes(1);
        expect(mockedHouseholdMayHaveDisability).toHaveBeenCalledTimes(1);

		mockedPersonMayHaveDisability.mockReturnValueOnce(false);
		mockedHouseholdMayHaveDisability.mockReturnValueOnce(false);
		expect(paratransit.conditional(interview, 'some.path.driver')).toEqual(false);
        expect(mockedPersonMayHaveDisability).toHaveBeenCalledTimes(2);
        expect(mockedHouseholdMayHaveDisability).toHaveBeenCalledTimes(2);
	});

	test('dontKnow conditional should depend on household count/self-declared', () => {
		const activePerson = { _uuid: 'personId1', _sequence: 1 } as any;
		jest.spyOn(odHelpers, 'getActivePerson').mockReturnValue(activePerson);
		jest.spyOn(odHelpers, 'getPotentialDrivers').mockReturnValue([]);
		const mockedGetCountOrSelfDeclared = jest.spyOn(odHelpers, 'getCountOrSelfDeclared');

		const interview = _cloneDeep(interviewAttributesForTestCases);
		const widgetConfig = getSegmentDriverWidgetConfig(
			segmentSectionConfig,
			widgetFactoryOptions
		) as any;
		const choices = (widgetConfig.choices as any)(interview, 'some.path.driver');
		const groupedChoices = choices.flatMap((group: any) => group.choices);
		const dontKnow = groupedChoices.find((choice: any) => choice.value === 'dontKnow');

		mockedGetCountOrSelfDeclared.mockReturnValueOnce(1);
		expect(dontKnow.conditional(interview, 'some.path.driver')).toEqual(false);

		mockedGetCountOrSelfDeclared.mockReturnValueOnce(3);
		expect(dontKnow.conditional(interview, 'some.path.driver')).toEqual(true);
	});

	test.each([
		['familyMember', 'segments:DriverFamily'],
		['colleague', 'segments:DriverColleague'],
		['taxiDriver', 'segments:DriverTaxi'],
		['transitTaxiDriver', 'segments:DriverTransitTaxi'],
		['paratransit', 'segments:DriverParaTransit'],
		['carpool', 'segments:DriverCarpool'],
		['other', 'segments:DriverOther'],
		['dontKnow', 'segments:DriverDontKnow']
	])('builtin choice label should translate %s with key %s', (choiceValue, expectedLabelKey) => {
		const activePerson = { _uuid: 'personId1', _sequence: 1 } as any;
		jest.spyOn(odHelpers, 'getActivePerson').mockReturnValue(activePerson);
		jest.spyOn(odHelpers, 'getPotentialDrivers').mockReturnValue([]);

		const interview = _cloneDeep(interviewAttributesForTestCases);
		const widgetConfig = getSegmentDriverWidgetConfig(
			segmentSectionConfig,
			widgetFactoryOptions
		) as any;
		const choices = (widgetConfig.choices as any)(interview, 'some.path.driver');
		const groupedChoices = choices.flatMap((choiceGroup: any) => choiceGroup.choices);
		const choice = groupedChoices.find((choice: any) => choice.value === choiceValue);

		expect(choice).toBeDefined();
		const mockedT = jest.fn();
		translateString(choice.label, { t: mockedT } as any, interview, 'some.path.driver');
		expect(mockedT).toHaveBeenCalledWith(expectedLabelKey);
	});

    test.each([
        ['undefined', undefined],
        ['null', null],
        ['empty string', ''],
        ['string with only spaces', '   ']
    ])('Test person with invalid nickname %s', (_description, nickname) => {
		const activePerson = { _uuid: 'personId1', _sequence: 1 } as any;
		jest.spyOn(odHelpers, 'getActivePerson').mockReturnValue(activePerson);
        // Include a driver without a nickname to test the label of that choice
		jest.spyOn(odHelpers, 'getPotentialDrivers').mockReturnValue([
			{ _uuid: 'personId3', _sequence: 3, nickname, age: 34, gender: 'male' } as any
		]);

		const interview = _cloneDeep(interviewAttributesForTestCases);
		const widgetConfig = getSegmentDriverWidgetConfig(
			segmentSectionConfig,
			widgetFactoryOptions
		) as any;
		const choices = (widgetConfig.choices as any)(interview, 'some.path.driver');
		const groupedChoices = choices.flatMap((choiceGroup: any) => choiceGroup.choices);
		const choice = groupedChoices.find((choice: any) => choice.value === 'personId3');

		expect(choice).toBeDefined();
		const mockedT = jest.fn();
		translateString(choice.label, { t: mockedT } as any, interview, 'some.path.driver');
		expect(mockedT).toHaveBeenCalledWith('survey:personWithSequenceAndAge', { sequence: 3, age: 34, context: 'male' });
	});
});

describe('widgetDriver conditional', () => {
	const segmentPath =
		'household.persons.personId2.journeys.journeyId2.trips.tripId1P2.segments.segmentId1P2T1';

	beforeEach(() => {
		jest.restoreAllMocks();
	});

	test('should be hidden if mode is not carPassenger', () => {
		const interview = _cloneDeep(interviewAttributesForTestCases);
		setResponse(interview, `${segmentPath}.mode`, 'walk');

		const widgetConfig = getSegmentDriverWidgetConfig(
			segmentSectionConfig,
			widgetFactoryOptions
		) as QuestionWidgetConfig;
		const conditionalResult = widgetConfig.conditional?.(interview, `${segmentPath}.driver`);

		expect(conditionalResult).toEqual([false, null]);
	});

	test('should be hidden and log an error if trip or journey is missing', () => {
		const interview = _cloneDeep(interviewAttributesForTestCases);
		setResponse(interview, `${segmentPath}.mode`, 'carPassenger');
		jest.spyOn(odHelpers, 'getActiveTrip').mockReturnValue(null);
		jest.spyOn(odHelpers, 'getActiveJourney').mockReturnValue(null);
		const mockedConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

		const widgetConfig = getSegmentDriverWidgetConfig(
			segmentSectionConfig,
			widgetFactoryOptions
		) as QuestionWidgetConfig;
		const conditionalResult = widgetConfig.conditional?.(interview, `${segmentPath}.driver`);

		expect(conditionalResult).toEqual([false, null]);
		expect(mockedConsoleError).toHaveBeenCalledTimes(1);
	});

	test('should be shown when activity is not workOnTheRoad', () => {
		const interview = _cloneDeep(interviewAttributesForTestCases);
		setResponse(interview, `${segmentPath}.mode`, 'carPassenger');
		jest.spyOn(odHelpers, 'getActiveTrip').mockReturnValue({ _uuid: 'tripId1P2', _sequence: 1});
		jest.spyOn(odHelpers, 'getActiveJourney').mockReturnValue({ _uuid: 'journeyId2', _sequence: 1 });
		jest.spyOn(odHelpers, 'getVisitedPlaces').mockReturnValue({});
		jest.spyOn(odHelpers, 'getDestination').mockReturnValue({ _uuid: 'dest', _sequence: 1, activity: 'workUsual' });

		const widgetConfig = getSegmentDriverWidgetConfig(
			segmentSectionConfig,
			widgetFactoryOptions
		) as QuestionWidgetConfig;
		const conditionalResult = widgetConfig.conditional?.(interview, `${segmentPath}.driver`);

		expect(conditionalResult).toEqual([true, null]);
	});

	test('should be hidden when activity is workOnTheRoad', () => {
		const interview = _cloneDeep(interviewAttributesForTestCases);
		setResponse(interview, `${segmentPath}.mode`, 'carPassenger');
		jest.spyOn(odHelpers, 'getActiveTrip').mockReturnValue({ _uuid: 'tripId1P2', _sequence: 1 });
		jest.spyOn(odHelpers, 'getActiveJourney').mockReturnValue({ _uuid: 'journeyId2', _sequence: 1 });
		jest.spyOn(odHelpers, 'getVisitedPlaces').mockReturnValue({});
		jest.spyOn(odHelpers, 'getDestination').mockReturnValue({ _uuid: 'dest', _sequence: 1, activity: 'workOnTheRoad' });

		const widgetConfig = getSegmentDriverWidgetConfig(
			segmentSectionConfig,
			widgetFactoryOptions
		) as QuestionWidgetConfig;
		const conditionalResult = widgetConfig.conditional?.(interview, `${segmentPath}.driver`);

		expect(conditionalResult).toEqual([false, null]);
	});
});
