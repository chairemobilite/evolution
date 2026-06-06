/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _cloneDeep from 'lodash/cloneDeep';
import { InputRadioType, QuestionWidgetConfig, RadioChoiceType } from '../../../types';
import { interviewAttributesForTestCases, widgetFactoryOptions } from '../../../../../tests/surveys';
import { setResponse, translateString } from '../../../../../utils/helpers';
import * as odHelpers from '../../../../odSurvey/helpers';
import { VisitedPlaceOnTheRoadWidgetFactory } from '../widgetsOnTheRoadSpecifics';

const visitedPlacesSectionConfig = {
    type: 'visitedPlaces' as const,
    enabled: true,
    tripDiaryMinTimeOfDay: 4 * 60 * 60,
    tripDiaryMaxTimeOfDay: 28 * 60 * 60
};

const onTheRoadPreviousPlaceActivityPath = (
    visitedPlaceId: string,
    personId = 'personId1',
    journeyId = 'journeyId1'
) =>
    `household.persons.${personId}.journeys.${journeyId}.visitedPlaces.${visitedPlaceId}.onTheRoadPreviousPlaceActivity`;

const onTheRoadNextPlaceCategoryPath = (
    visitedPlaceId: string,
    personId = 'personId1',
    journeyId = 'journeyId1'
) =>
    `household.persons.${personId}.journeys.${journeyId}.visitedPlaces.${visitedPlaceId}.onTheRoadNextPlaceCategory`;

describe('VisitedPlaceOnTheRoadWidgetFactory', () => {
    test('should return expected widget configurations', () => {
        const widgetConfigs = new VisitedPlaceOnTheRoadWidgetFactory(
            visitedPlacesSectionConfig,
            widgetFactoryOptions
        ).getWidgetConfigs();

        expect(widgetConfigs).toEqual({
            visitedPlaceOnTheRoadPreviousPlaceActivity: {
                type: 'question',
                inputType: 'radio',
                path: 'onTheRoadPreviousPlaceActivity',
                datatype: 'string',
                twoColumns: false,
                sameLine: false,
                containsHtml: true,
                label: expect.any(Function),
                choices: expect.any(Array),
                validations: expect.any(Function),
                conditional: expect.any(Function)
            },
            visitedPlaceOnTheRoadNextPlaceCategory: {
                type: 'question',
                inputType: 'radio',
                datatype: 'string',
                sameLine: false,
                path: 'onTheRoadNextPlaceCategory',
                twoColumns: false,
                containsHtml: true,
                label: expect.any(Function),
                choices: expect.any(Array),
                conditional: expect.any(Function),
                validations: expect.any(Function)
            }
        });
    });
});

describe('visitedPlaceOnTheRoadPreviousPlaceActivity widget', () => {
    const widgetConfig = new VisitedPlaceOnTheRoadWidgetFactory(
        visitedPlacesSectionConfig,
        widgetFactoryOptions
    ).getWidgetConfigs()['visitedPlaceOnTheRoadPreviousPlaceActivity'] as QuestionWidgetConfig & InputRadioType;

    describe('label', () => {
        const label = widgetConfig.label;

        test('should throw when person is not found in interview response', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            setResponse(interview, '_activePersonId', null);

            expect(() =>
                translateString(label, { t: jest.fn() } as any, interview, onTheRoadPreviousPlaceActivityPath('workPlace1P1', 'personId9999'))
            ).toThrow('visitedPlaceOnTheRoadPreviousPlaceActivity label: Person not found in interview response');
        });

        test('should call translation with expected key and person parameters', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            interview.response.household!.persons!.personId1.gender = 'female';
            const mockedT = jest.fn().mockReturnValue('Translated label');

            translateString(label, { t: mockedT } as any, interview, onTheRoadPreviousPlaceActivityPath('workPlace1P1', 'personId1'));

            expect(mockedT).toHaveBeenCalledWith(
                'visitedPlaces:visitedPlaceOnTheRoadPreviousPlaceActivity',
                expect.objectContaining({
                    nickname: expect.any(String),
                    count: 3,
                    context: 'female'
                })
            );
        });
    });

    describe('choices', () => {
        const choices = widgetConfig.choices as RadioChoiceType[];

        describe('home choice', () => {
            const homeChoice = choices.find((choice) => choice.value === 'home') as RadioChoiceType;

            test('should translate home label with expected key', () => {
                const interview = _cloneDeep(interviewAttributesForTestCases);
                const mockedT = jest.fn();

                translateString(homeChoice.label, { t: mockedT } as any, interview, onTheRoadPreviousPlaceActivityPath('workPlace1P1'));

                expect(mockedT).toHaveBeenCalledWith('visitedPlaces:onTheRoadPreviousPlaceActivityChoices.home');
            });
        });

        describe('workUsual choice', () => {
            const workUsualChoice = choices.find((choice) => choice.value === 'workUsual') as RadioChoiceType;

            test('should translate workUsual label with expected key', () => {
                const interview = _cloneDeep(interviewAttributesForTestCases);
                const mockedT = jest.fn();

                translateString(
                    workUsualChoice.label,
                    { t: mockedT } as any,
                    interview,
                    onTheRoadPreviousPlaceActivityPath('workPlace1P1')
                );

                expect(mockedT).toHaveBeenCalledWith('visitedPlaces:onTheRoadPreviousPlaceActivityChoices.workUsual');
            });

            test.each([{
                workPlaceType: 'onTheRoadWithUsualPlace',
                expected: true
            }, {
                workPlaceType: 'onLocation',
                expected: false
            }, {
                workPlaceType: undefined,
                expected: true
            }])('should return $expected when person work place type is $workPlaceType', ({ workPlaceType, expected }) => {
                const interview = _cloneDeep(interviewAttributesForTestCases);
                setResponse(interview, 'household.persons.personId1.workPlaceType', workPlaceType);

                expect(
                    workUsualChoice.conditional?.(interview, onTheRoadPreviousPlaceActivityPath('workPlace1P1'))
                ).toEqual(expected);
            });

            test('should throw when person is not found for workUsual conditional', () => {
                const interview = _cloneDeep(interviewAttributesForTestCases);
                const requestedPath = onTheRoadPreviousPlaceActivityPath('workPlace1P1', 'personId999');

                expect(() => workUsualChoice.conditional?.(interview, requestedPath)).toThrow(
                    'visitedPlaceOnTheRoadPreviousPlaceActivityChoices workUsual label: Person not found in interview response'
                );
            });
        });

        describe('other choice', () => {
            const otherChoice = choices.find((choice) => choice.value === 'other') as RadioChoiceType;

            test('should return the previous visited place description when available', () => {
                const interview = _cloneDeep(interviewAttributesForTestCases);
                const mockedT = jest.fn();
                const mockedGetVisitedPlaceDescription = jest
                    .spyOn(odHelpers, 'getVisitedPlaceDescription')
                    .mockReturnValue('Previous place description');

                const label = translateString(
                    otherChoice.label,
                    { t: mockedT } as any,
                    interview,
                    onTheRoadPreviousPlaceActivityPath('workPlace1P1')
                );

                expect(label).toEqual('Previous place description');
                expect(mockedGetVisitedPlaceDescription).toHaveBeenCalledWith(
                    expect.objectContaining({
                        options: {
                            withTimes: false,
                            allowHtml: false,
                            withActivity: false,
                            withPersonIdentification: false
                        }
                    })
                );
            });

            test('should fallback to translation key when no previous visited place exists', () => {
                const interview = _cloneDeep(interviewAttributesForTestCases);
                const mockedT = jest.fn().mockReturnValue('Other');

                translateString(
                    otherChoice.label,
                    { t: mockedT } as any,
                    interview,
                    onTheRoadPreviousPlaceActivityPath('homePlace1P1')
                );

                expect(mockedT).toHaveBeenCalledWith('visitedPlaces:onTheRoadPreviousPlaceActivityChoices.other');
            });

            test('should throw when visited place context is not found for label', () => {
                const interview = _cloneDeep(interviewAttributesForTestCases);
                const requestedPath = onTheRoadPreviousPlaceActivityPath('workPlace1P1', 'personId1', 'journeyId999');

                expect(() => translateString(otherChoice.label, { t: jest.fn() } as any, interview, requestedPath)).toThrow(
                    'visitedPlaceOnTheRoadPreviousPlaceActivityChoices other label: Visited place context not found for path ' +
                        requestedPath
                );
            });

            test.each([
                {
                    title: 'returns true when previous visited place is valid for other choice',
                    setup: (interview: typeof interviewAttributesForTestCases) => {
                        setResponse(interview, 'household.persons.personId1.journeys.journeyId1.visitedPlaces.homePlace1P1.activityCategory', 'other');
                        setResponse(interview, 'household.persons.personId1.journeys.journeyId1.visitedPlaces.homePlace1P1.activity', 'shopping');
                        setResponse(interview, 'household.persons.personId1.workPlaceType', 'onTheRoadWithoutUsualPlace');
                    },
                    expected: true
                },
                {
                    title: 'returns false when previous place activityCategory is home',
                    setup: (interview: typeof interviewAttributesForTestCases) => {
                        setResponse(interview, 'household.persons.personId1.journeys.journeyId1.visitedPlaces.homePlace1P1.activityCategory', 'home');
                    },
                    expected: false
                },
                {
                    title: 'returns false when previous place activity is workOnTheRoad',
                    setup: (interview: typeof interviewAttributesForTestCases) => {
                        setResponse(interview, 'household.persons.personId1.journeys.journeyId1.visitedPlaces.homePlace1P1.activityCategory', 'other');
                        setResponse(interview, 'household.persons.personId1.journeys.journeyId1.visitedPlaces.homePlace1P1.activity', 'workOnTheRoad');
                    },
                    expected: false
                },
                {
                    title: 'returns false when previous activity is workUsual and person has usual workplace for on the road',
                    setup: (interview: typeof interviewAttributesForTestCases) => {
                        setResponse(interview, 'household.persons.personId1.journeys.journeyId1.visitedPlaces.homePlace1P1.activityCategory', 'work');
                        setResponse(interview, 'household.persons.personId1.journeys.journeyId1.visitedPlaces.homePlace1P1.activity', 'workUsual');
                        setResponse(interview, 'household.persons.personId1.workPlaceType', 'onTheRoadWithUsualPlace');
                    },
                    expected: false
                },
                {
                    title: 'returns false when previous activity is workUsual and person\'s work place type is undefined',
                    setup: (interview: typeof interviewAttributesForTestCases) => {
                        setResponse(interview, 'household.persons.personId1.journeys.journeyId1.visitedPlaces.homePlace1P1.activityCategory', 'work');
                        setResponse(interview, 'household.persons.personId1.journeys.journeyId1.visitedPlaces.homePlace1P1.activity', 'workUsual');
                        setResponse(interview, 'household.persons.personId1.workPlaceType', undefined);
                    },
                    expected: false
                }
            ])('other conditional: $title', ({ setup, expected }) => {
                const interview = _cloneDeep(interviewAttributesForTestCases);
                setup(interview);

                expect(otherChoice.conditional?.(interview, onTheRoadPreviousPlaceActivityPath('workPlace1P1'))).toEqual(expected);
            });

            test('should throw when visited place context is not found for conditional', () => {
                const interview = _cloneDeep(interviewAttributesForTestCases);
                const requestedPath = onTheRoadPreviousPlaceActivityPath('workPlace1P1', 'personId1', 'journeyId999');

                expect(() => otherChoice.conditional?.(interview, requestedPath)).toThrow(
                    'visitedPlaceOnTheRoadPreviousPlaceActivityChoices other conditional: Visited place context not found for path ' +
                        requestedPath
                );
            });
        });
    });

    describe('conditional', () => {
        const conditional = widgetConfig.conditional;

        beforeEach(() => {
            jest.restoreAllMocks();
        });

        test('should return [false, null] when visited place context is not found', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            const requestedPath = onTheRoadPreviousPlaceActivityPath('workPlace1P1', 'personId1', 'journeyId999');
            const mockedError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

            expect(conditional?.(interview, requestedPath)).toEqual([false, null]);
            expect(mockedError).toHaveBeenCalledWith('Visited place context not found for path', requestedPath);
        });

        test.each([
            {
                title: 'returns [false, null] when visited place is not new',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    setResponse(interview, 'household.persons.personId1.journeys.journeyId1.visitedPlaces.workPlace1P1._isNew', false);
                    setResponse(interview, 'household.persons.personId1.journeys.journeyId1.visitedPlaces.workPlace1P1.activity', 'workOnTheRoad');
                }
            },
            {
                title: 'returns [false, null] when visited place is first in sequence',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    setResponse(interview, 'household.persons.personId1.journeys.journeyId1.visitedPlaces.homePlace1P1.activity', 'workOnTheRoad');
                    setResponse(interview, 'household.persons.personId1.journeys.journeyId1.visitedPlaces.homePlace1P1._isNew', true);
                },
                path: onTheRoadPreviousPlaceActivityPath('homePlace1P1')
            },
            {
                title: 'returns [false, null] when activity is not workOnTheRoad',
                setup: (_interview: typeof interviewAttributesForTestCases) => {
                    // Keep fixture default activity: workUsual
                }
            }
        ])('should handle case: $title', ({ setup, path }) => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            setup(interview);

            expect(conditional?.(interview, path ?? onTheRoadPreviousPlaceActivityPath('workPlace1P1'))).toEqual([false, null]);
        });

        test('should return [false, value] when there is only one valid departure choice', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            // Previous place is home, the person does not have a usual workplace, so home is the only valid choice
            setResponse(interview, 'household.persons.personId1.journeys.journeyId1.visitedPlaces.workPlace1P1.activity', 'workOnTheRoad');
            setResponse(interview, 'household.persons.personId1.workPlaceType', 'onTheRoadWithoutUsualPlace');
            // Keep previous place as home so `other` is hidden, leaving only `home`.

            expect(conditional?.(interview, onTheRoadPreviousPlaceActivityPath('workPlace1P1'))).toEqual([false, 'home']);
        });

        test('should return [true, null] when multiple departure choices are available', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            // Previous place is home, the person works on the road with usual place, there should be 2 choices
            setResponse(interview, 'household.persons.personId1.journeys.journeyId1.visitedPlaces.workPlace1P1.activity', 'workOnTheRoad');
            setResponse(interview, 'household.persons.personId1.workPlaceType', 'onTheRoadWithUsualPlace');
            // Home and workUsual are both visible in this case.

            expect(conditional?.(interview, onTheRoadPreviousPlaceActivityPath('workPlace1P1'))).toEqual([true, null]);
        });
    });
});

describe('visitedPlaceOnTheRoadNextPlaceCategory widget', () => {
    const widgetConfig = new VisitedPlaceOnTheRoadWidgetFactory(
        visitedPlacesSectionConfig,
        widgetFactoryOptions
    ).getWidgetConfigs()['visitedPlaceOnTheRoadNextPlaceCategory'] as QuestionWidgetConfig & InputRadioType;

    describe('label', () => {
        const label = widgetConfig.label;

        test('should throw when person is not found in interview response', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);

            expect(() =>
                translateString(label, { t: jest.fn() } as any, interview, onTheRoadNextPlaceCategoryPath('otherPlace2P1', 'personId9999'))
            ).toThrow('visitedPlaceOnTheRoadNextPlaceCategory label: Person not found in interview response');
        });

        test('should call translation with expected key and person parameters', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            interview.response.household!.persons!.personId1.gender = 'female';
            const mockedT = jest.fn().mockReturnValue('Translated arrival label');

            translateString(label, { t: mockedT } as any, interview, onTheRoadNextPlaceCategoryPath('otherPlace2P1'));

            expect(mockedT).toHaveBeenCalledWith(
                'visitedPlaces:visitedPlaceOnTheRoadNextPlaceCategory',
                expect.objectContaining({
                    nickname: expect.any(String),
                    count: 3,
                    context: 'female'
                })
            );
        });
    });

    describe('choices', () => {
        const choices = widgetConfig.choices as RadioChoiceType[];

        test.each([
            { value: 'wentBackHome', expectedKey: 'visitedPlaces:onTheRoadNextPlaceCategoryChoices.wentBackHome' },
            { value: 'wentToUsualWorkPlace', expectedKey: 'visitedPlaces:onTheRoadNextPlaceCategoryChoices.wentToUsualWorkPlace' },
            { value: 'visitedAnotherPlace', expectedKey: 'visitedPlaces:onTheRoadNextPlaceCategoryChoices.visitedAnotherPlace' }
        ])('should translate $value label with expected key', ({ value, expectedKey }) => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            const mockedT = jest.fn();
            const choice = choices.find((currentChoice) => currentChoice.value === value) as RadioChoiceType;

            translateString(choice.label, { t: mockedT } as any, interview, onTheRoadNextPlaceCategoryPath('otherPlace2P1'));

            expect(mockedT).toHaveBeenCalledWith(expectedKey);
        });

        describe('workUsual choice', () => {
            const workUsualChoice = choices.find((choice) => choice.value === 'wentToUsualWorkPlace') as RadioChoiceType;

            test.each([
                { workPlaceType: 'onTheRoadWithUsualPlace', expected: true },
                { workPlaceType: 'onLocation', expected: false },
                { workPlaceType: undefined, expected: true }
            ])('should return $expected when person work place type is $workPlaceType', ({ workPlaceType, expected }) => {
                const interview = _cloneDeep(interviewAttributesForTestCases);
                setResponse(interview, 'household.persons.personId1.workPlaceType', workPlaceType);

                expect(
                    workUsualChoice.conditional?.(interview, onTheRoadNextPlaceCategoryPath('otherPlace2P1'))
                ).toEqual(expected);
            });

            test('should throw when person is not found for workUsual conditional', () => {
                const interview = _cloneDeep(interviewAttributesForTestCases);
                const requestedPath = onTheRoadNextPlaceCategoryPath('otherPlace2P1', 'personId999');

                expect(() => workUsualChoice.conditional?.(interview, requestedPath)).toThrow(
                    'visitedPlaceOnTheRoadNextPlaceCategory workUsual label: Person not found in interview response'
                );
            });
        });

        describe('stayedThereUntilTheNextDay choice', () => {
            const stayedChoice = choices.find(
                (choice) => choice.value === 'stayedThereUntilTheNextDay'
            ) as RadioChoiceType;

            test('should translate stayedThereUntilTheNextDay label with person parameters', () => {
                const interview = _cloneDeep(interviewAttributesForTestCases);
                interview.response.household!.persons!.personId1.gender = 'female';
                const mockedT = jest.fn().mockReturnValue('Stayed there until next day');

                translateString(stayedChoice.label, { t: mockedT } as any, interview, onTheRoadNextPlaceCategoryPath('otherPlace2P1'));

                expect(mockedT).toHaveBeenCalledWith(
                    'visitedPlaces:onTheRoadNextPlaceCategoryChoices.stayedThereUntilTheNextDay',
                    expect.objectContaining({
                        nickname: expect.any(String),
                        count: 3,
                        context: 'female'
                    })
                );
            });

            test('should throw when person is not found for stayedThereUntilTheNextDay label', () => {
                const interview = _cloneDeep(interviewAttributesForTestCases);

                expect(() =>
                    translateString(stayedChoice.label, { t: jest.fn() } as any, interview, onTheRoadNextPlaceCategoryPath('otherPlace2P1', 'personId9999'))
                ).toThrow('visitedPlaceOnTheRoadNextPlaceCategory label: Person not found in interview response');
            });

            test.each([
                { title: 'returns false when place is not last', path: onTheRoadNextPlaceCategoryPath('otherPlaceP1'), expected: false },
                { title: 'returns true when place is last', path: onTheRoadNextPlaceCategoryPath('otherPlace2P1'), expected: true }
            ])('$title', ({ path, expected }) => {
                const interview = _cloneDeep(interviewAttributesForTestCases);

                expect(stayedChoice.conditional?.(interview, path)).toEqual(expected);
            });
        });
    });

    describe('conditional', () => {
        const conditional = widgetConfig.conditional;

        test('should throw when visited place context is not found', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);

            expect(() => conditional?.(interview, onTheRoadNextPlaceCategoryPath('otherPlace2P1', 'personId1', 'journeyId999'))).toThrow(
                'visitedPlaceOnTheRoadNextPlaceCategory label: Visited place context not found in interview response'
            );
        });

        test.each([
            {
                title: 'returns [false, null] when visited place is not workOnTheRoad',
                setup: (_interview: typeof interviewAttributesForTestCases) => {
                    // Keep default shopping activity on last place
                },
                path: onTheRoadNextPlaceCategoryPath('otherPlace2P1'),
                expected: [false, null]
            },
            {
                title: 'returns [false, null] when workOnTheRoad place is not last',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    setResponse(interview, 'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlaceP1.activity', 'workOnTheRoad');
                },
                path: onTheRoadNextPlaceCategoryPath('otherPlaceP1'),
                expected: [false, null]
            },
            {
                title: 'returns [true, null] when workOnTheRoad place is last',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    setResponse(interview, 'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlace2P1.activity', 'workOnTheRoad');
                },
                path: onTheRoadNextPlaceCategoryPath('otherPlace2P1'),
                expected: [true, null]
            }
        ])('should handle case: $title', ({ setup, path, expected }) => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            setup(interview);

            expect(conditional?.(interview, path)).toEqual(expected);
        });
    });
});
