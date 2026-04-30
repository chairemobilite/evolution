/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _cloneDeep from 'lodash/cloneDeep';
import { InputRadioType, InputSelectType, QuestionWidgetConfig } from '../../../types';
import { interviewAttributesForTestCases, widgetFactoryOptions } from '../../../../../tests/surveys';
import { setResponse, translateString } from '../../../../../utils/helpers';
import * as odHelpers from '../../../../odSurvey/helpers';
import * as visitedPlacesHelpers from '../helpers';
import { loopActivities, usualActivities } from '../../../../odSurvey/types';
import { VisitedPlaceShortcutWidgetFactory } from '../widgetsVisitedPlaceShortcut';
import { yesNoChoices } from '../../common/choices';

const visitedPlacesSectionConfig = {
    type: 'visitedPlaces' as const,
    enabled: true,
    tripDiaryMinTimeOfDay: 4 * 60 * 60, // 4h in seconds
    tripDiaryMaxTimeOfDay: 28 * 60 * 60 // 28h in seconds (i.e. 4h the next day)
};

describe('VisitedPlaceShortcutWidgetFactory', () => {
    test('should return expected shortcut widget configurations', () => {
        const widgetConfigs = new VisitedPlaceShortcutWidgetFactory(
            visitedPlacesSectionConfig,
            widgetFactoryOptions
        ).getWidgetConfigs();

        expect(widgetConfigs).toEqual({
            visitedPlaceAlreadyVisited: {
                type: 'question',
                inputType: 'radio',
                datatype: 'boolean',
                columns: 1,
                path: 'alreadyVisitedBySelfOrAnotherHouseholdMember',
                twoColumns: false,
                containsHtml: true,
                label: expect.any(Function),
                choices: expect.any(Array),
                conditional: expect.any(Function),
                validations: expect.any(Function)
            },
            visitedPlaceShortcut: {
                type: 'question',
                path: 'shortcut',
                inputType: 'select',
                datatype: 'string',
                twoColumns: false,
                containsHtml: true,
                label: expect.any(Function),
                choices: expect.any(Function),
                conditional: expect.any(Function)
            }
        });
    });
});

describe('visitedPlaceAlreadyVisited widget', () => {
    const widgetConfig = new VisitedPlaceShortcutWidgetFactory(
        visitedPlacesSectionConfig,
        widgetFactoryOptions
    ).getWidgetConfigs()['visitedPlaceAlreadyVisited'] as QuestionWidgetConfig & InputRadioType;

    // Helper to build a full path for the alreadyVisitedBySelfOrAnotherHouseholdMember field
    const alreadyVisitedPath = (
        visitedPlaceId: string,
        personId = 'personId1',
        journeyId = 'journeyId1'
    ) =>
        `household.persons.${personId}.journeys.${journeyId}.visitedPlaces.${visitedPlaceId}.alreadyVisitedBySelfOrAnotherHouseholdMember`;

    beforeEach(() => {
        jest.restoreAllMocks();
    });

    describe('label', () => {
        const label = widgetConfig.label;

        test('should throw when person not found for path', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            const mockedT = jest.fn();
            expect(() =>
                // Call translateString with the widget's label function, providing a path with a non-existent personId
                translateString(
                    label,
                    { t: mockedT } as any,
                    interview,
                    alreadyVisitedPath('otherPlaceP1', 'personId99')
                )
            ).toThrow('Active person not found in interview response');
        });

        test('should call t with correct key and person count', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            const mockedT = jest.fn().mockImplementation((key, opts) => JSON.stringify({ key, opts }));

            translateString(label, { t: mockedT } as any, interview, alreadyVisitedPath('otherPlaceP1'));

            expect(mockedT).toHaveBeenCalledWith(
                'visitedPlaces:alreadyVisitedBySelfOrAnotherHouseholdMember',
                expect.objectContaining({ count: 3 }) // 3 persons in testCasesInterview
            );
        });
    });

    describe('choices', () => {
        test('should be yesNoChoices', () => {
            expect(widgetConfig.choices).toBe(yesNoChoices);
        });
    });

    describe('validations', () => {
        const validations = widgetConfig.validations;

        test('should flag answer as required when value is blank', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            const validationResults = validations!(undefined, null, interview, alreadyVisitedPath('otherPlaceP1'));
            expect(validationResults.length).toEqual(1);
            expect(validationResults[0].validation).toBe(true);
        });

        test('should not flag answer as required when value is set', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            const validationResults = validations!(true, null, interview, alreadyVisitedPath('otherPlaceP1'));
            expect(validationResults.length).toEqual(1);
            expect(validationResults[0].validation).toBe(false);
        });
    });

    describe('conditional', () => {
        const conditional = widgetConfig.conditional;

        // Parameterized tests for cases that should return [false, null]
        test.each([
            {
                title: 'visited place context not found when journey does not exist',
                path: alreadyVisitedPath('otherPlaceP1', 'personId1', 'journeyId99'),
            },
            {
                title: 'activity is blank',
                path: alreadyVisitedPath('otherPlaceP1'),
                setup: (interview: typeof interviewAttributesForTestCases) =>
                    setResponse(
                        interview,
                        'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlaceP1.activity',
                        undefined
                    )
            },
            {
                title: 'home activity',
                path: alreadyVisitedPath('homePlace1P1'),
            },
            {
                title: 'loop activity workOnTheRoad',
                path: alreadyVisitedPath('otherPlaceP1'),
                setup: (interview: typeof interviewAttributesForTestCases) =>
                    setResponse(
                        interview,
                        'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlaceP1.activity',
                        'workOnTheRoad'
                    )
            },
            {
                title: 'loop activity leisureStroll',
                path: alreadyVisitedPath('otherPlaceP1'),
                setup: (interview: typeof interviewAttributesForTestCases) =>
                    setResponse(
                        interview,
                        'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlaceP1.activity',
                        'leisureStroll'
                    )
            },
            {
                title: 'usual activity workUsual',
                path: alreadyVisitedPath('workPlace1P1'),
            },
            {
                title: 'usual activity schoolUsual',
                path: alreadyVisitedPath('schoolPlace1P3', 'personId3', 'journeyId3'),
            },
            {
                title: 'shortcuts exist but geography lastAction is "mapClicked"',
                // otherPlaceP1 has geography with lastAction: 'mapClicked' in test data
                path: alreadyVisitedPath('otherPlaceP1'),
            },
            {
                title: 'geography lastAction is some other non-shortcut value',
                path: alreadyVisitedPath('otherPlaceP1'),
                setup: (interview: typeof interviewAttributesForTestCases) =>
                    setResponse(interview, 'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlaceP1.geography', {
                        type: 'Feature',
                        geometry: { type: 'Point', coordinates: [-73.6096, 45.5287] },
                        properties: { lastAction: 'findPlace' }
                    })
            }
        ])('should return [false, null] when $title', ({ path, setup }) => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            // Run the setup function if provided to modify the interview for this test case
            if (setup) {
                setup(interview);
            }
            expect(conditional!(interview, path)).toEqual([false, null]);
        });

        test('should return [false, null] when there are no shortcuts and geography lastAction is null', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            // Remove geography so lastAction is null
            setResponse(interview, 'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlaceP1.geography', undefined);
            // Mock to return no shortcuts
            jest.spyOn(visitedPlacesHelpers, 'getShortcutVisitedPlaces').mockReturnValueOnce([]);

            expect(
                conditional!(interview, alreadyVisitedPath('otherPlaceP1'))
            ).toEqual([false, null]);
        });

        test('should return [true, null] when shortcuts exist and geography has no lastAction (null)', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            // Remove geography so lastAction is null; otherPlaceP1 (shopping) has 3 shortcuts
            setResponse(interview, 'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlaceP1.geography', undefined);

            expect(
                conditional!(interview, alreadyVisitedPath('otherPlaceP1'))
            ).toEqual([true, null]);
        });

        test('should return [true, null] when shortcuts exist and geography lastAction is "shortcut"', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            setResponse(interview, 'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlaceP1.geography', {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [-73.6096, 45.5287] },
                properties: { lastAction: 'shortcut' }
            });

            expect(
                conditional!(interview, alreadyVisitedPath('otherPlaceP1'))
            ).toEqual([true, null]);
        });
    });
});

describe('visitedPlaceShortcut widget', () => {
    const widgetConfig = new VisitedPlaceShortcutWidgetFactory(
        visitedPlacesSectionConfig,
        widgetFactoryOptions
    ).getWidgetConfigs()['visitedPlaceShortcut'] as QuestionWidgetConfig & InputSelectType;

    // Helper to build a full path for the shortcut field
    const shortcutPath = (
        visitedPlaceId: string,
        personId = 'personId1',
        journeyId = 'journeyId1'
    ) =>
        `household.persons.${personId}.journeys.${journeyId}.visitedPlaces.${visitedPlaceId}.shortcut`;

    beforeEach(() => {
        jest.restoreAllMocks();
    });

    describe('label', () => {
        const label = widgetConfig.label;

        test('should throw when person not found for path', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            const mockedT = jest.fn();
            // Request for a path with a non-existent personId
            expect(() =>
                translateString(
                    label,
                    { t: mockedT } as any,
                    interview,
                    shortcutPath('otherPlaceP1', 'personId99')
                )
            ).toThrow('Active person not found in interview response');
        });

        test('should call t with correct key and person count', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            const mockedT = jest.fn().mockImplementation((key, opts) => JSON.stringify({ key, opts }));

            translateString(label, { t: mockedT } as any, interview, shortcutPath('otherPlaceP1'));

            expect(mockedT).toHaveBeenCalledWith(
                'visitedPlaces:shortcut',
                expect.objectContaining({ count: 3 }) // 3 persons in testCasesInterview
            );
        });
    });

    describe('choices', () => {
        const choices = widgetConfig.choices as (interview: any, path: string) => any[];

        test('should throw when visited place context not found', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            const requestedPath = shortcutPath('otherPlaceP1', 'personId1', 'journeyId99');
            expect(() =>
                choices(interview, requestedPath)
            ).toThrow('widgetVisitedPlaceShortcut: choices function: visited place context not found for path ' + requestedPath);
        });

        test('should return empty array when there are no shortcuts', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            jest.spyOn(visitedPlacesHelpers, 'getShortcutVisitedPlaces').mockReturnValueOnce([]);

            const result = choices(interview, shortcutPath('otherPlaceP1'));
            expect(result).toEqual([]);
        });

        test('should return one choice per shortcut with correct visitedPlacePath as value', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            // otherPlace2P1 (shopping, last in personId1's journey) has 3 shortcuts:
            //   1. workPlace1P1 (personId1/journeyId1)
            //   2. otherWorkPlace1P2 (personId2/journeyId2)
            //   3. schoolPlace1P3 (personId3/journeyId3)
            const result = choices(interview, shortcutPath('otherPlace2P1'));

            expect(result).toHaveLength(3);
            expect(result[0].value).toBe(
                'household.persons.personId1.journeys.journeyId1.visitedPlaces.workPlace1P1'
            );
            expect(result[1].value).toBe(
                'household.persons.personId2.journeys.journeyId2.visitedPlaces.otherWorkPlace1P2'
            );
            expect(result[2].value).toBe(
                'household.persons.personId3.journeys.journeyId3.visitedPlaces.schoolPlace1P3'
            );
        });

        test('should provide a label function for each choice that calls getVisitedPlaceDescription with correct options', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            const mockedGetVisitedPlaceDescription = jest
                .spyOn(odHelpers, 'getVisitedPlaceDescription')
                .mockReturnValue('place description');

            const result = choices(interview, shortcutPath('otherPlace2P1'));
            expect(result).toHaveLength(3);

            const mockedT = jest.fn();

            // Call the label function of each choice and validate the mockedGetVisitedPlaceDescription call
            result[0].label(mockedT);
            expect(mockedGetVisitedPlaceDescription).toHaveBeenCalledWith({
                t: mockedT,
                visitedPlace: interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1,
                person: interview.response.household!.persons!.personId1,
                interview,
                options: {
                    withTimes: true,
                    withActivity: false,
                    withPersonIdentification: true,
                    allowHtml: false
                }
            });

            result[1].label(mockedT);
            expect(mockedGetVisitedPlaceDescription).toHaveBeenCalledWith({
                t: mockedT,
                visitedPlace: interview.response.household!.persons!.personId2.journeys!.journeyId2.visitedPlaces!.otherWorkPlace1P2,
                person: interview.response.household!.persons!.personId2,
                interview,
                options: {
                    withTimes: true,
                    withActivity: false,
                    withPersonIdentification: true,
                    allowHtml: false
                }
            });

            result[2].label(mockedT);
            expect(mockedGetVisitedPlaceDescription).toHaveBeenCalledWith({
                t: mockedT,
                visitedPlace: interview.response.household!.persons!.personId3.journeys!.journeyId3.visitedPlaces!.schoolPlace1P3,
                person: interview.response.household!.persons!.personId3,
                interview,
                options: {
                    withTimes: true,
                    withActivity: false,
                    withPersonIdentification: true,
                    allowHtml: false
                }
            });
        });
    });

    describe('conditional', () => {
        const conditional = widgetConfig.conditional as (interview: any, path: string) => [boolean, null];

        test('should throw when visited place context not found', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            const requestedPath = shortcutPath('otherPlaceP1', 'personId1', 'journeyId99');
            expect(() =>
                // Call with a journey ID that does not exist
                conditional(interview, requestedPath)
            ).toThrow('widgetVisitedPlaceShortcut: conditional function: visited place context not found for path ' + requestedPath);
        });

        // Tests expected to return [false, null]
        test.each([
            {
                title: 'activity is blank',
                path: shortcutPath('otherPlaceP1'),
                setup: (interview: typeof interviewAttributesForTestCases) =>
                    setResponse(
                        interview,
                        'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlaceP1.activity',
                        undefined
                    )
            },
            {
                title: 'alreadyVisitedBySelfOrAnotherHouseholdMember is false',
                path: shortcutPath('otherPlaceP1'),
                setup: (interview: typeof interviewAttributesForTestCases) =>
                    setResponse(
                        interview,
                        'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlaceP1.alreadyVisitedBySelfOrAnotherHouseholdMember',
                        false
                    )
            },
            {
                title: 'alreadyVisitedBySelfOrAnotherHouseholdMember is not set (undefined)',
                // otherPlaceP1 has no alreadyVisitedBySelfOrAnotherHouseholdMember set in test data
                path: shortcutPath('otherPlaceP1'),
            }
        ])('should return [false, null] when $title', ({ path, setup }) => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            if (setup) {
                setup(interview);
            }
            expect(conditional(interview, path)).toEqual([false, null]);
        });

        test('should return [true, null] when activity is set and alreadyVisitedBySelfOrAnotherHouseholdMember is true', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            setResponse(
                interview,
                'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlaceP1.alreadyVisitedBySelfOrAnotherHouseholdMember',
                true
            );
            // otherPlaceP1 already has activity 'shopping' set in test data
            expect(conditional(interview, shortcutPath('otherPlaceP1'))).toEqual([true, null]);
        });
    });
});
