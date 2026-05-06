/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import _cloneDeep from 'lodash/cloneDeep';
import _escape from 'lodash/escape';
import {
    interviewAttributesForTestCases,
    setActiveSurveyObjects,
    widgetFactoryOptions
} from '../../../../../tests/surveys';
import { translateString } from '../../../../../utils/helpers';
import { InputTimeType, QuestionWidgetConfig, UserInterviewAttributes } from '../../../types';
import { VisitedPlaceTimeWidgetFactory } from '../widgetsTime';
import * as helpers from '../helpers';
import { requiredValidation } from '../../../../widgets/validations/validations';

const visitedPlacesSectionConfig = {
    type: 'visitedPlaces' as const,
    enabled: true,
    tripDiaryMinTimeOfDay: 4 * 60 * 60, // 4h in seconds
    tripDiaryMaxTimeOfDay: 28 * 60 * 60 // 28h in seconds (i.e. 4h the next day)
};

const visitedPlaceFieldPath = (visitedPlaceId: string, fieldName: string) =>
    `household.persons.personId1.journeys.journeyId1.visitedPlaces.${visitedPlaceId}.${fieldName}`;

// Unset all times, so individual tests can set it again without interference
const unsetAllTimes = (interview: UserInterviewAttributes) => {
    const visitedPlaces = interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!;
    Object.values(visitedPlaces).forEach(visitedPlace => {
        visitedPlace.arrivalTime = undefined;
        visitedPlace.departureTime = undefined;
        visitedPlace._previousArrivalTime = undefined;
        visitedPlace._previousDepartureTime = undefined;
        visitedPlace._previousPreviousDepartureTime = undefined;
    });
}

describe('VisitedPlaceTimeWidgetFactory', () => {
    let factory: VisitedPlaceTimeWidgetFactory;
    let widgetConfigs: Record<string, QuestionWidgetConfig>;

    beforeEach(() => {
        factory = new VisitedPlaceTimeWidgetFactory(
            visitedPlacesSectionConfig,
            widgetFactoryOptions
        );
        widgetConfigs = factory.getWidgetConfigs();
    });

    describe('getWidgetConfigs', () => {
        test('should return a record with exactly 5 time widgets', () => {
            expect(Object.keys(widgetConfigs).length).toBe(5);
        });

        test('should return the expected widget names', () => {
            const expectedWidgets = [
                'visitedPlacePreviousPreviousDepartureTime',
                'visitedPlacePreviousArrivalTime',
                'visitedPlacePreviousDepartureTime',
                'visitedPlaceArrivalTime',
                'visitedPlaceDepartureTime'
            ];

            expect(Object.keys(widgetConfigs)).toEqual(expect.arrayContaining(expectedWidgets));
        });

        test('should return InputTimeType widgets with correct paths', () => {
            const expectedPaths: Record<string, string> = {
                visitedPlacePreviousPreviousDepartureTime: '_previousPreviousDepartureTime',
                visitedPlacePreviousArrivalTime: '_previousArrivalTime',
                visitedPlacePreviousDepartureTime: '_previousDepartureTime',
                visitedPlaceArrivalTime: 'arrivalTime',
                visitedPlaceDepartureTime: 'departureTime'
            };

            for (const [widgetName, expectedPath] of Object.entries(expectedPaths)) {
                const widget = widgetConfigs[widgetName] as InputTimeType;
                expect(widget.inputType).toBe('time');
                expect(widget.path).toBe(expectedPath);
                expect(widget.datatype).toBe('integer');
            }
        });

    });

    test('should return the same widget configs on multiple calls', () => {
        const configs1 = factory.getWidgetConfigs();
        const configs2 = factory.getWidgetConfigs();

        expect(Object.keys(configs1)).toEqual(Object.keys(configs2));
    });

});

describe('visitedPlacePreviousPreviousDepartureTime widget', () => {
    const factory = new VisitedPlaceTimeWidgetFactory(
        visitedPlacesSectionConfig,
        widgetFactoryOptions
    );
    const widgetConfigs = factory.getWidgetConfigs();
    const widget = widgetConfigs['visitedPlacePreviousPreviousDepartureTime'] as InputTimeType;

    test('Test the widget configuration', () => {
        expect(widget).toEqual({
            type: 'question',
            inputType: 'time',
            path: '_previousPreviousDepartureTime',
            datatype: 'integer',
            twoColumns: false,
            containsHtml: true,
            label: expect.any(Function),
            minuteStep: 5,
            addHourSeparators: true,
            suffixTimes:undefined,
            maxTimeSecondsSinceMidnight: expect.any(Function),
            minTimeSecondsSinceMidnight: expect.any(Function),
            validations: requiredValidation,
            conditional: expect.any(Function)
        });
    });

    describe('conditional function', () => {
        const conditionalFn = widget.conditional as Function;

        test.each([
            {
                title: 'returns [false, null] when there is no previous place',
                visitedPlaceId: 'homePlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace1P1.activity = 'workOnTheRoad';
                },
                expected: [false, null]
            },
            {
                title: 'returns [false, null] when activity is not workOnTheRoad',
                visitedPlaceId: 'workPlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.activity = 'workUsual';
                },
                expected: [false, null]
            },
            {
                title: 'returns [true, null] when workOnTheRoad usualWorkPlace requires insertion before and previous departure time is not set',
                visitedPlaceId: 'workPlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    // Delete departureTime of previous place, current is work on the road with start at usual place, which is not the previous place activity
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.activity = 'workOnTheRoad';
                    (interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1 as any).onTheRoadDepartureType = 'usualWorkPlace';
                    delete interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace1P1.departureTime;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace1P1.activity = 'home';
                },
                expected: [true, null]
            },
            {
                title: 'returns [false, null] when workOnTheRoad usualWorkPlace when previous departure time is set, even if requires insertion before',
                visitedPlaceId: 'workPlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    // Set departureTime of previous place, current is work on the road with start at usual place, which is not the previous place activity
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.activity = 'workOnTheRoad';
                    (interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1 as any).onTheRoadDepartureType = 'usualWorkPlace';
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace1P1.departureTime = 7 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace1P1.activity = 'home';
                },
                expected: [false, null]
            }
        ])('should handle case: $title', ({ visitedPlaceId, setup, expected }) => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            const path = visitedPlaceFieldPath(visitedPlaceId, '_previousPreviousDepartureTime')
            setup(interview);
            expect(conditionalFn(interview, path)).toEqual(expected);
        });

        test('should throw error when visited place context is not found', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            expect(() => conditionalFn(interview, 'invalid/nonexistent/path')).toThrow(
                'widgetVisitedPlacePreviousPreviousDepartureTime: conditional function: visited place context not found for path invalid/nonexistent/path'
            );
        });
    });

    describe('label function', () => {
        const label = widget.label;

        test.each([
            {
                title: 'uses home-to-usual-workplace labels for home previous place',
                visitedPlaceId: 'workPlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.activity = 'workOnTheRoad';
                    (interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1 as any).onTheRoadDepartureType = 'usualWorkPlace';
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace1P1.activity = 'home';
                },
                expectedKeys: ['visitedPlaces:visitedPlacePreviousPreviousDepartureTime_home_usualWorkPlace', 'visitedPlaces:visitedPlacePreviousPreviousDepartureTime_usualWorkPlace', 'visitedPlaces:visitedPlacePreviousPreviousDepartureTime']
            },
            {
                title: 'uses other generic labels for non-home previous place',
                visitedPlaceId: 'workPlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.activity = 'workOnTheRoad';
                    (interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1 as any).onTheRoadDepartureType = 'usualWorkPlace';
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace1P1.activity = 'shopping';
                },
                expectedKeys: ['visitedPlaces:visitedPlacePreviousPreviousDepartureTime_shopping_usualWorkPlace', 'visitedPlaces:visitedPlacePreviousPreviousDepartureTime_usualWorkPlace', 'visitedPlaces:visitedPlacePreviousPreviousDepartureTime']
            },
            {
                title: 'workUsual activity with a home departure place',
                visitedPlaceId: 'workPlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.activity = 'workOnTheRoad';
                    (interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1 as any).onTheRoadDepartureType = 'home';
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace1P1.activity = 'workUsual';
                },
                expectedKeys: ['visitedPlaces:visitedPlacePreviousPreviousDepartureTime_workUsual_home', 'visitedPlaces:visitedPlacePreviousPreviousDepartureTime_home', 'visitedPlaces:visitedPlacePreviousPreviousDepartureTime']
            }
        ])('should handle case: $title', ({ visitedPlaceId, setup, expectedKeys }) => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            setup(interview);
            const mockedT = jest.fn().mockImplementation((key) => Array.isArray(key) ? key[0] : key);

            const path = visitedPlaceFieldPath(visitedPlaceId, '_previousPreviousDepartureTime');
            const labelResult = translateString(label, { t: mockedT } as any, interview, path);

            expect(labelResult).toEqual(expectedKeys[0]);
            expect(mockedT).toHaveBeenLastCalledWith(expectedKeys, expect.objectContaining({
                departureTypeActivity: expect.any(String),
                previousPlaceDescription: expect.any(String)
            }));
        });

        test('should throw when previous visited place does not exist', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            const mockedT = jest.fn();
            const path = visitedPlaceFieldPath('homePlace1P1', '_previousPreviousDepartureTime');
            expect(() => translateString(label, { t: mockedT } as any, interview, path)).toThrow(
                'widgetVisitedPlacePreviousPreviousDepartureTime: label function: previous visited place not found for path ' +
                    path
            );
        });

        test('should throw when visited place context is not found', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            const mockedT = jest.fn();
            expect(() => translateString(label, { t: mockedT } as any, interview, 'invalid/nonexistent/path')).toThrow(
                'widgetVisitedPlacePreviousPreviousDepartureTime: label function: visited place context not found for path invalid/nonexistent/path'
            );
        });
    });

    describe('minTimeSecondsSinceMidnight function', () => {
        const minTimeFn = widget.minTimeSecondsSinceMidnight as Function;

        test.each([
            {
                title: 'returns config min bound when no previous places exist',
                visitedPlaceId: 'homePlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace1P1.activity = 'home';
                },
                expected: visitedPlacesSectionConfig.tripDiaryMinTimeOfDay
            },
            {
                title: 'returns previous place departure time when available',
                visitedPlaceId: 'workPlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace1P1.departureTime = 7 * 60 * 60;
                },
                expected: 7 * 60 * 60
            },
            {
                title: 'returns previous place departure time, even if current times are set',
                visitedPlaceId: 'workPlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace1P1.departureTime = 7 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1._previousPreviousDepartureTime = 8 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1._previousArrivalTime = 9 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1._previousDepartureTime = 10 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.arrivalTime = 11 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.departureTime = 12 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace2P1.arrivalTime = 13 * 60 * 60;
                },
                expected: 7 * 60 * 60
            },
            {
                title: 'returns previous place arrival time when departure not available',
                visitedPlaceId: 'workPlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    delete interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace1P1.departureTime;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace1P1.arrivalTime = 6 * 60 * 60;
                },
                expected: 6 * 60 * 60
            },
            {
                title: 'returns config min bound when both previous place times are missing',
                visitedPlaceId: 'workPlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    delete interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace1P1.departureTime;
                    delete interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace1P1.arrivalTime;
                },
                expected: visitedPlacesSectionConfig.tripDiaryMinTimeOfDay
            },
            {
                title: 'returns max time from multiple previous places',
                visitedPlaceId: 'otherPlace2P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace1P1.departureTime = 7 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.departureTime = 10 * 60 * 60;
                },
                expected: 10 * 60 * 60
            }
        ])('should handle case: $title', ({ visitedPlaceId, setup, expected }) => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            unsetAllTimes(interview);
            setup(interview);
            const path = visitedPlaceFieldPath(visitedPlaceId, '_previousPreviousDepartureTime');
            expect(minTimeFn(interview, path)).toEqual(expected);
        });

        test('should throw error when visited place context is not found', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            expect(() => minTimeFn(interview, 'invalid/nonexistent/path')).toThrow(
                'time lower bound for field: _previousPreviousDepartureTime: visited place context not found for path invalid/nonexistent/path'
            );
        });
    });

    describe('maxTimeSecondsSinceMidnight function', () => {
        const maxTimeFn = widget.maxTimeSecondsSinceMidnight as Function;

        test.each([
            {
                title: 'returns config max bound when no next places exist',
                visitedPlaceId: 'otherPlace2P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.otherPlace2P1.activity = 'shopping';
                },
                expected: visitedPlacesSectionConfig.tripDiaryMaxTimeOfDay
            },
            {
                title: 'returns next _previousArrivalTime when available',
                visitedPlaceId: 'workPlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1._previousArrivalTime = 8 * 60 * 60;
                },
                expected: 8 * 60 * 60
            },
            {
                title: 'returns next _previousDepartureTime when _previousArrivalTime not available',
                visitedPlaceId: 'workPlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    delete interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1._previousArrivalTime;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1._previousDepartureTime = 9 * 60 * 60;
                },
                expected: 9 * 60 * 60
            },
            {
                title: 'returns _previousArrivalTime, when all times are set',
                visitedPlaceId: 'workPlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace1P1.departureTime = 7 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1._previousPreviousDepartureTime = 8 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1._previousArrivalTime = 9 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1._previousDepartureTime = 10 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.arrivalTime = 11 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.departureTime = 12 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace2P1.arrivalTime = 13 * 60 * 60;
                },
                expected: 9 * 60 * 60
            },
            {
                title: 'returns next arrivalTime when previous departure not available',
                visitedPlaceId: 'homePlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    delete interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1._previousArrivalTime;
                    delete interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1._previousDepartureTime;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.arrivalTime = 10 * 60 * 60;
                },
                expected: 10 * 60 * 60
            },
            {
                title: 'returns min time from multiple next places',
                visitedPlaceId: 'homePlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.arrivalTime = 10 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.otherPlace2P1.arrivalTime = 15 * 60 * 60;
                },
                expected: 10 * 60 * 60
            },
            {
                title: 'returns next place arrivalTime even when next is a loop activity',
                visitedPlaceId: 'workPlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace2P1.arrivalTime = 7 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace2P1.departureTime = 8 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace2P1.activity = 'leisureStroll';
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.otherPlaceP1.arrivalTime = 8 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.otherPlaceP1.departureTime = 9 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.otherPlaceP1.activity = 'shopping';
                },
                expected: 7 * 60 * 60
            },
        ])('should handle case: $title', ({ visitedPlaceId, setup, expected }) => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            unsetAllTimes(interview);
            setup(interview);
            const path = visitedPlaceFieldPath(visitedPlaceId, '_previousPreviousDepartureTime');
            expect(maxTimeFn(interview, path)).toEqual(expected);
        });

        test('should throw error when visited place context is not found', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            expect(() => maxTimeFn(interview, 'invalid/nonexistent/path')).toThrow(
                'time upper bound for field: _previousPreviousDepartureTime: visited place context not found for path invalid/nonexistent/path'
            );
        });
    });

});

describe('visitedPlacePreviousArrivalTime widget', () => {
    const factory = new VisitedPlaceTimeWidgetFactory(
        visitedPlacesSectionConfig,
        widgetFactoryOptions
    );
    const widgetConfigs = factory.getWidgetConfigs();
    const widget = widgetConfigs['visitedPlacePreviousArrivalTime'] as InputTimeType;

    test('Test the widget configuration', () => {
        expect(widget).toEqual({
            type: 'question',
            inputType: 'time',
            path: '_previousArrivalTime',
            datatype: 'integer',
            twoColumns: false,
            containsHtml: true,
            label: expect.any(Function),
            minuteStep: 5,
            addHourSeparators: true,
            suffixTimes:undefined,
            maxTimeSecondsSinceMidnight: expect.any(Function),
            minTimeSecondsSinceMidnight: expect.any(Function),
            validations: requiredValidation,
            conditional: expect.any(Function)
        });
    });

    describe('conditional function', () => {
        const conditionalFn = widget.conditional as Function;

        test.each([
            {
                title: 'returns [false, null] when there is no previous place',
                visitedPlaceId: 'homePlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace1P1.activity = 'workOnTheRoad';
                },
                expected: [false, null]
            },
            {
                title: 'returns [false, null] if not work on the road',
                visitedPlaceId: 'workPlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.activity = 'workUsual';
                },
                expected: [false, null]
            },
            {
                title: 'returns [true, null] for workOnTheRoad with home departure and previous not home',
                visitedPlaceId: 'otherPlaceP1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    // Set place to workOnTheRoad activity with home departure, but previous place is workUsual
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.otherPlaceP1.activity = 'workOnTheRoad';
                    (interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.otherPlaceP1 as any).onTheRoadDepartureType = 'home';
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace2P1.activity = 'workUsual';
                },
                expected: [true, null]
            },
            {
                title: 'returns [true, null] for workOnTheRoad with usualWorkPlace departure and previous not workUsual',
                visitedPlaceId: 'workPlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    // Set place to workOnTheRoad activity with usualWorkPlace departure, but previous place not workUsual
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.activity = 'workOnTheRoad';
                    (interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1 as any).onTheRoadDepartureType = 'usualWorkPlace';
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace1P1.activity = 'home';
                },
                expected: [true, null]
            },
            {
                title: 'returns [false, null] when workOnTheRoad departure matches previous activity',
                visitedPlaceId: 'otherPlaceP1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.otherPlaceP1.activity = 'workOnTheRoad';
                    (interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.otherPlaceP1 as any).onTheRoadDepartureType = 'home';
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace2P1.activity = 'home';
                },
                expected: [false, null]
            }
        ])('should handle case: $title', ({ visitedPlaceId, setup, expected }) => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            setup(interview);
            const path = visitedPlaceFieldPath(visitedPlaceId, '_previousArrivalTime');
            expect(conditionalFn(interview, path)).toEqual(expected);
        });

        test('should throw error when visited place context is not found', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            expect(() => conditionalFn(interview, 'invalid/nonexistent/path')).toThrow(
                'widgetVisitedPlacePreviousArrivalTime: conditional function: visited place context not found for path invalid/nonexistent/path'
            );
        });
    });

    describe('label function', () => {
        const label = widget.label;

        test.each([
            {
                title: 'uses home departure label',
                visitedPlaceId: 'otherPlaceP1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.otherPlaceP1.activity = 'workOnTheRoad';
                    (interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.otherPlaceP1 as any).onTheRoadDepartureType = 'home';
                },
                expectedSpecificKey: 'visitedPlaces:visitedPlacePreviousArrivalTime_home'
            },
            {
                title: 'uses usual workplace departure label',
                visitedPlaceId: 'workPlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.activity = 'workOnTheRoad';
                    (interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1 as any).onTheRoadDepartureType = 'usualWorkPlace';
                },
                expectedSpecificKey: 'visitedPlaces:visitedPlacePreviousArrivalTime_usualWorkPlace'
            }
        ])('should handle case: $title', ({ visitedPlaceId, setup, expectedSpecificKey }) => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            setup(interview);
            const mockedT = jest.fn().mockImplementation((key) => Array.isArray(key) ? key[0] : key);

            const path = visitedPlaceFieldPath(visitedPlaceId, '_previousArrivalTime');
            const labelResult = translateString(label, { t: mockedT } as any, interview, path);

            expect(labelResult).toEqual(expectedSpecificKey);
            expect(mockedT).toHaveBeenCalledWith([expectedSpecificKey, 'visitedPlaces:visitedPlacePreviousArrivalTime'], expect.any(Object));
        });

        test('should throw when visited place context is not found', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            const mockedT = jest.fn();
            expect(() => translateString(label, { t: mockedT } as any, interview, 'invalid/nonexistent/path')).toThrow(
                'widgetVisitedPlacePreviousArrivalTime: label function: visited place context not found for path invalid/nonexistent/path'
            );
        });
    });

    describe('minTimeSecondsSinceMidnight function', () => {
        const minTimeFn = widget.minTimeSecondsSinceMidnight as Function;

        test.each([
            {
                title: 'returns config min bound when no previous places exist',
                visitedPlaceId: 'homePlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace1P1.activity = 'home';
                },
                expected: visitedPlacesSectionConfig.tripDiaryMinTimeOfDay
            },
            {
                title: 'return previous place arrival time if departure time not set',
                visitedPlaceId: 'workPlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace1P1.arrivalTime = 6 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace1P1.departureTime = undefined;
                },
                expected: 6 * 60 * 60
            },
            {
                title: 'returns max time from multiple previous places',
                visitedPlaceId: 'otherPlace2P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace1P1.departureTime = 7 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.departureTime = 10 * 60 * 60;
                },
                expected: 10 * 60 * 60
            },
            {
                title: 'returns _previousPreviousDepartureTime, when all times are set',
                visitedPlaceId: 'workPlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace1P1.departureTime = 7 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1._previousPreviousDepartureTime = 8 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1._previousArrivalTime = 9 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1._previousDepartureTime = 10 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.arrivalTime = 11 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.departureTime = 12 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace2P1.arrivalTime = 13 * 60 * 60;
                },
                expected: 8 * 60 * 60
            },
        ])('should handle case: $title', ({ visitedPlaceId, setup, expected }) => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            unsetAllTimes(interview);
            setup(interview);
            const path = visitedPlaceFieldPath(visitedPlaceId, '_previousArrivalTime');
            expect(minTimeFn(interview, path)).toEqual(expected);
        });

        test('should throw error when visited place context is not found', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            expect(() => minTimeFn(interview, 'invalid/nonexistent/path')).toThrow(
                'time lower bound for field: _previousArrivalTime: visited place context not found for path invalid/nonexistent/path'
            );
        });
    });

    describe('maxTimeSecondsSinceMidnight function', () => {
        const maxTimeFn = widget.maxTimeSecondsSinceMidnight as Function;

        test.each([
            {
                title: 'returns config max bound when no next places exist',
                visitedPlaceId: 'otherPlace2P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.otherPlace2P1.activity = 'shopping';
                },
                expected: visitedPlacesSectionConfig.tripDiaryMaxTimeOfDay
            },
            {
                title: 'returns next _previousDepartureTime when available',
                visitedPlaceId: 'workPlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1._previousDepartureTime = 8 * 60 * 60;
                },
                expected: 8 * 60 * 60
            },
            {
                title: 'returns min time from multiple next places',
                visitedPlaceId: 'homePlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.departureTime = 9 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.otherPlace2P1.arrivalTime = 15 * 60 * 60;
                },
                expected: 9 * 60 * 60
            },
            {
                title: 'returns _previousDepartureTime, when all times are set',
                visitedPlaceId: 'workPlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace1P1.departureTime = 7 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1._previousPreviousDepartureTime = 8 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1._previousArrivalTime = 9 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1._previousDepartureTime = 10 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.arrivalTime = 11 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.departureTime = 12 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace2P1.arrivalTime = 13 * 60 * 60;
                },
                expected: 10 * 60 * 60
            },
            {
                title: 'returns next place arrivalTime even when next is a loop activity',
                visitedPlaceId: 'workPlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace2P1.arrivalTime = 7 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace2P1.departureTime = 8 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace2P1.activity = 'leisureStroll';
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.otherPlaceP1.arrivalTime = 8 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.otherPlaceP1.departureTime = 9 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.otherPlaceP1.activity = 'shopping';
                },
                expected: 7 * 60 * 60
            },
        ])('should handle case: $title', ({ visitedPlaceId, setup, expected }) => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            unsetAllTimes(interview);
            setup(interview);
            const path = visitedPlaceFieldPath(visitedPlaceId, '_previousArrivalTime');
            expect(maxTimeFn(interview, path)).toEqual(expected);
        });

        test('should throw error when visited place context is not found', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            expect(() => maxTimeFn(interview, 'invalid/nonexistent/path')).toThrow(
                'time upper bound for field: _previousArrivalTime: visited place context not found for path invalid/nonexistent/path'
            );
        });
    });

});

describe('visitedPlacePreviousDepartureTime widget', () => {
    const factory = new VisitedPlaceTimeWidgetFactory(
        visitedPlacesSectionConfig,
        widgetFactoryOptions
    );
    const widgetConfigs = factory.getWidgetConfigs();
    const widget = widgetConfigs['visitedPlacePreviousDepartureTime'] as InputTimeType;

    test('Test the widget configuration', () => {
        expect(widget).toEqual({
            type: 'question',
            inputType: 'time',
            path: '_previousDepartureTime',
            datatype: 'integer',
            twoColumns: false,
            containsHtml: true,
            label: expect.any(Function),
            minuteStep: expect.any(Function),
            addHourSeparators: true,
            suffixTimes:undefined,
            maxTimeSecondsSinceMidnight: expect.any(Function),
            minTimeSecondsSinceMidnight: expect.any(Function),
            validations: requiredValidation,
            conditional: expect.any(Function)
        });
    });

    describe('conditional function', () => {
        const conditionalFn = widget.conditional as Function;

        test.each([
            {
                title: 'returns [false, null] when there is no previous place',
                visitedPlaceId: 'homePlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace1P1.activity = 'shopping';
                },
                expected: [false, null]
            },
            {
                title: 'returns [false, null] when activity is blank',
                visitedPlaceId: 'workPlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    delete interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.activity;
                },
                expected: [false, null]
            },
            {
                title: 'returns [false, null] when previous departure time is already defined',
                visitedPlaceId: 'workPlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.activity = 'shopping';
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace1P1.departureTime = 7 * 60 * 60;
                },
                expected: [false, null]
            },
            {
                title: 'returns [true, null] when previous departure is missing and activity is non-loop',
                visitedPlaceId: 'workPlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.activity = 'shopping';
                    delete interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace1P1.departureTime;
                },
                expected: [true, null]
            },
            {
                title: 'returns [false, arrivalTime] for loop activity when previous departure is missing',
                visitedPlaceId: 'workPlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.activity = 'workOnTheRoad';
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.arrivalTime = 9 * 60 * 60;
                    delete interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace1P1.departureTime;
                },
                expected: [false, 9 * 60 * 60]
            }
        ])('should handle case: $title', ({ visitedPlaceId, setup, expected }) => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            setup(interview);
            const path = visitedPlaceFieldPath(visitedPlaceId, '_previousDepartureTime');
            expect(conditionalFn(interview, path)).toEqual(expected);
        });

        test('should throw error when visited place context is not found', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            expect(() => conditionalFn(interview, 'invalid/nonexistent/path')).toThrow(
                'widgetVisitedPlacePreviousDepartureTime: conditional function: visited place context not found for path invalid/nonexistent/path'
            );
        });
    });

    describe('label function', () => {
        const label = widget.label;

        test('should call translation with specific and fallback keys', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            const mockedT = jest.fn().mockImplementation((keys) => (Array.isArray(keys) ? keys[0] : keys));

            interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace1P1.activity = 'home';
            interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.activity = 'workUsual';

            const path = visitedPlaceFieldPath('workPlace1P1', '_previousDepartureTime');
            const labelResult = translateString(label, { t: mockedT } as any, interview, path);

            expect(labelResult).toEqual('visitedPlaces:visitedPlacePreviousDepartureTime_home_workUsual');
            // Should have called translation with various keys, then result of the getVisitedPlaceDescription helper function
            expect(mockedT).toHaveBeenCalledWith(
                [
                    'visitedPlaces:visitedPlacePreviousDepartureTime_home_workUsual',
                    'visitedPlaces:visitedPlacePreviousDepartureTime_home_other',
                    'visitedPlaces:visitedPlacePreviousDepartureTime'
                ],
                expect.objectContaining({
                    previousPlaceDescription: 'visitedPlaces:activities:home',
                    visitedPlaceDescription: interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.name
                })
            );
        });

        test('should throw when visited place context is not found', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            const mockedT = jest.fn();
            expect(() => translateString(label, { t: mockedT } as any, interview, 'invalid/nonexistent/path')).toThrow(
                'widgetVisitedPlacePreviousDepartureTime: label function: visited place context not found for path invalid/nonexistent/path'
            );
        });
    });

    describe('minuteStep function', () => {
        const minuteStepFn = widget.minuteStep as Function;

        test('should return 15 when visiting second place and previous place is new', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            setActiveSurveyObjects(interview, {
                personId: 'personId1',
                journeyId: 'journeyId1',
                visitedPlaceId: 'workPlace1P1'
            });

            // Set the first visited place new
            const previousPlace = interview.response.household!.persons!['personId1'].journeys!['journeyId1'].visitedPlaces!['homePlace1P1'];
            previousPlace._isNew = true;

            const result = minuteStepFn(interview, 'household.persons.personId1.journeys.journeyId1.visitedPlaces.workPlace1P1._previousDepartureTime');

            expect(result).toBe(15);
        });

        test('should return 5 when visiting second place and previous place is not new', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            setActiveSurveyObjects(interview, {
                personId: 'personId1',
                journeyId: 'journeyId1',
                visitedPlaceId: 'workPlace1P1'
            });

            // Set the visited place to be the second place (_sequence === 2)
            const activePlace = interview.response.household!.persons!['personId1'].journeys!['journeyId1'].visitedPlaces!['workPlace1P1'];
            activePlace._sequence = 2;
            activePlace._isNew = false;

            const result = minuteStepFn(interview, 'household.persons.personId1.journeys.journeyId1.visitedPlaces.workPlace1P1._previousDepartureTime');

            expect(result).toBe(5);
        });

        test('should return 5 when visiting a place with sequence !== 2', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            setActiveSurveyObjects(interview, {
                personId: 'personId1',
                journeyId: 'journeyId1',
                visitedPlaceId: 'otherPlaceP1'
            });

            const result = minuteStepFn(interview, 'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlaceP1._previousDepartureTime');

            expect(result).toBe(5);
        });

        test('should throw error when visited place context is not found', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);

            expect(() => {
                minuteStepFn(interview, 'invalid/nonexistent/path');
            }).toThrow('widgetVisitedPlacePreviousDepartureTime: minuteStep function: visited place context not found for path invalid/nonexistent/path');
        });
    });

    describe('minTimeSecondsSinceMidnight function', () => {
        const minTimeFn = widget.minTimeSecondsSinceMidnight as Function;

        test.each([
            {
                title: 'returns config min bound when no previous places exist',
                visitedPlaceId: 'homePlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace1P1.activity = 'home';
                },
                expected: visitedPlacesSectionConfig.tripDiaryMinTimeOfDay
            },
            {
                title: 'returns max of previous places times',
                visitedPlaceId: 'workPlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace1P1.departureTime = 7 * 60 * 60;
                },
                expected: 7 * 60 * 60
            },
            {
                title: 'returns max time from multiple previous places',
                visitedPlaceId: 'otherPlace2P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace1P1.departureTime = 7 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.arrivalTime = 10 * 60 * 60;
                },
                expected: 10 * 60 * 60
            },
            {
                title: 'returns _previousArrivalTime, when all times are set',
                visitedPlaceId: 'workPlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace1P1.departureTime = 7 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1._previousPreviousDepartureTime = 8 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1._previousArrivalTime = 9 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1._previousDepartureTime = 10 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.arrivalTime = 11 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.departureTime = 12 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace2P1.arrivalTime = 13 * 60 * 60;
                },
                expected: 9 * 60 * 60
            },
        ])('should handle case: $title', ({ visitedPlaceId, setup, expected }) => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            unsetAllTimes(interview);
            setup(interview);
            const path = visitedPlaceFieldPath(visitedPlaceId, '_previousDepartureTime');
            expect(minTimeFn(interview, path)).toEqual(expected);
        });

        test('should throw error when visited place context is not found', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            expect(() => minTimeFn(interview, 'invalid/nonexistent/path')).toThrow(
                'time lower bound for field: _previousDepartureTime: visited place context not found for path invalid/nonexistent/path'
            );
        });
    });

    describe('maxTimeSecondsSinceMidnight function', () => {
        const maxTimeFn = widget.maxTimeSecondsSinceMidnight as Function;

        test.each([
            {
                title: 'returns config max bound when no next places exist',
                visitedPlaceId: 'otherPlace2P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.otherPlace2P1.activity = 'shopping';
                },
                expected: visitedPlacesSectionConfig.tripDiaryMaxTimeOfDay
            },
            {
                title: 'returns next arrivalTime when available',
                visitedPlaceId: 'homePlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.arrivalTime = 9 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.departureTime = 10 * 60 * 60;
                },
                expected: 9 * 60 * 60
            },
            {
                title: 'returns min time from multiple next places',
                visitedPlaceId: 'homePlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.arrivalTime = 10 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.otherPlace2P1.arrivalTime = 15 * 60 * 60;
                },
                expected: 10 * 60 * 60
            },
            {
                title: 'returns arrivalTime, when all times are set',
                visitedPlaceId: 'workPlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace1P1.departureTime = 7 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1._previousPreviousDepartureTime = 8 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1._previousArrivalTime = 9 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1._previousDepartureTime = 10 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.arrivalTime = 11 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.departureTime = 12 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace2P1.arrivalTime = 13 * 60 * 60;
                },
                expected: 11 * 60 * 60
            },
            {
                title: 'returns next place arrivalTime even when next is a loop activity',
                visitedPlaceId: 'workPlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace2P1.arrivalTime = 7 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace2P1.departureTime = 8 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace2P1.activity = 'leisureStroll';
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.otherPlaceP1.arrivalTime = 8 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.otherPlaceP1.departureTime = 9 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.otherPlaceP1.activity = 'shopping';
                },
                expected: 7 * 60 * 60
            },
        ])('should handle case: $title', ({ visitedPlaceId, setup, expected }) => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            unsetAllTimes(interview);
            setup(interview);
            const path = visitedPlaceFieldPath(visitedPlaceId, '_previousDepartureTime');
            expect(maxTimeFn(interview, path)).toEqual(expected);
        });

        test('should throw error when visited place context is not found', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            expect(() => maxTimeFn(interview, 'invalid/nonexistent/path')).toThrow(
                'time upper bound for field: _previousDepartureTime: visited place context not found for path invalid/nonexistent/path'
            );
        });
    });

});

describe('visitedPlaceArrivalTime widget', () => {
    const factory = new VisitedPlaceTimeWidgetFactory(
        visitedPlacesSectionConfig,
        widgetFactoryOptions
    );
    const widgetConfigs = factory.getWidgetConfigs();
    const widget = widgetConfigs['visitedPlaceArrivalTime'] as InputTimeType;

    test('Test the widget configuration', () => {
        expect(widget).toEqual({
            type: 'question',
            inputType: 'time',
            path: 'arrivalTime',
            datatype: 'integer',
            twoColumns: false,
            containsHtml: true,
            label: expect.any(Function),
            minuteStep: 5,
            addHourSeparators: true,
            suffixTimes: expect.any(Function),
            maxTimeSecondsSinceMidnight: expect.any(Function),
            minTimeSecondsSinceMidnight: expect.any(Function),
            validations: requiredValidation,
            conditional: expect.any(Function)
        });
    });

    describe('conditional function', () => {
        const conditionalFn = widget.conditional as Function;

        // Function to setup the interview for a case that would display the _previousPrevious question
        const setupInterviewWithPreviousPreviousCase = (interview: typeof interviewAttributesForTestCases) => {
            // Delete departureTime of previous place, current is work on the road with start at usual place, which is not the previous place activity
            interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.activity = 'workOnTheRoad';
            (interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1 as any).onTheRoadDepartureType = 'usualWorkPlace';
            delete interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace1P1.departureTime;
            interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace1P1.activity = 'home';
        };

        test.each([
            {
                title: 'returns [false, null] when activity is blank',
                visitedPlaceId: 'workPlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    delete interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.activity;
                },
                expected: [false, null]
            },
            {
                title: 'returns [false, null] for first place even if activity is set',
                visitedPlaceId: 'homePlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace1P1.activity = 'home';
                },
                expected: [false, null]
            },
            {
                title: 'returns [false, null] when previousPreviousDeparture and previousArrival times widgets are visible, but _previousPreviousDepartureTime is missing',
                visitedPlaceId: 'workPlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    setupInterviewWithPreviousPreviousCase(interview);
                    delete interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1._previousPreviousDepartureTime;
                    delete interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1._previousArrivalTime;
                    delete interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1._previousDepartureTime;
                    delete interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.arrivalTime;
                },
                expected: [false, null]
            },
            {
                title: 'returns [false, null] when previousPreviousDeparture and previousArrival times widgets are visible, but _previousArrivalTime is missing',
                visitedPlaceId: 'workPlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    setupInterviewWithPreviousPreviousCase(interview);
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1._previousPreviousDepartureTime = 7 * 60 * 60;
                    delete interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1._previousArrivalTime;
                    delete interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1._previousDepartureTime;
                    delete interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.arrivalTime;
                },
                expected: [false, null]
            },
            {
                title: 'returns [true, null] when previousPreviousDeparture and previousArrival times widgets are visible and all values are set',
                visitedPlaceId: 'workPlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    setupInterviewWithPreviousPreviousCase(interview);
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1._previousPreviousDepartureTime = 7 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1._previousArrivalTime = 7 * 60 * 60 + 15 * 60;
                },
                expected: [true, null]
            },
            {
                title: 'returns [false, null] when previous departure time widget is visible, but _previousDepartureTime is missing',
                visitedPlaceId: 'workPlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    // Delete previous departure time so it is asked
                    delete interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace1P1.departureTime;
                    delete interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1._previousDepartureTime;
                },
                expected: [false, null]
            },
            {
                title: 'returns [true, null] when previous departure time widget is visible, but _previousDepartureTime is set',
                visitedPlaceId: 'workPlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    // Delete previous departure time so it is asked
                    delete interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace1P1.departureTime;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1._previousDepartureTime = 8 * 60 * 60;
                },
                expected: [true, null]
            },
            {
                title: 'returns [false, previousDepartureTime] when previous place is loop and departure is set',
                visitedPlaceId: 'workPlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace1P1.activity = 'workOnTheRoad';
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace1P1.departureTime = 8 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.activity = 'shopping';
                },
                expected: [false, 8 * 60 * 60]
            },
            {
                title: 'returns [false, previousDepartureTime] when current place is loop and previous departure is set',
                visitedPlaceId: 'workPlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace1P1.activity = 'home';
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace1P1.departureTime = 8 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.activity = 'workOnTheRoad';
                },
                expected: [false, 8 * 60 * 60]
            },
            {
                title: 'returns [true, null] when place is not first and activity is set',
                visitedPlaceId: 'workPlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.activity = 'shopping';
                },
                expected: [true, null]
            }
        ])('should handle case: $title', ({ title, visitedPlaceId, setup, expected }) => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            setup(interview);
            const path = visitedPlaceFieldPath(visitedPlaceId, 'arrivalTime');
            expect(conditionalFn(interview, path)).toEqual(expected);
        });

        test('should throw error when visited place context is not found', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            expect(() => conditionalFn(interview, 'invalid/nonexistent/path')).toThrow(
                'widgetVisitedPlaceArrivalTime: conditional function: visited place context not found for path invalid/nonexistent/path'
            );
        });
    });

    describe('label function', () => {
        const label = widget.label;

        beforeEach(() => {
            jest.restoreAllMocks();
        })

        test('should use activity-specific arrival label with place name and duration text when available', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            const mockedT = jest.fn().mockImplementation((keys) => {
                if (Array.isArray(keys)) {
                    return keys[0];
                }
                return keys;
            });
            const formatTripDurationSpy = jest
                .spyOn(helpers, 'formatTripDuration')
                .mockReturnValue('MOCK_DURATION');

            const currentPlace = interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1;
            const previousPlace = interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace1P1;
            currentPlace.activity = 'shopping';
            currentPlace.name = '<strong>Place name</strong>';
            currentPlace.arrivalTime = 9 * 60 * 60;
            previousPlace.departureTime = 8 * 60 * 60;
            previousPlace.activity = 'home';

            const path = visitedPlaceFieldPath('workPlace1P1', 'arrivalTime');
            const labelResult = translateString(label, { t: mockedT } as any, interview, path);

            expect(labelResult).toContain('visitedPlaces:visitedPlaceArrivalTime_shopping');
            expect(formatTripDurationSpy).toHaveBeenCalledWith(8 * 60 * 60, 9 * 60 * 60, mockedT);
            // Make sure mockedT has been called with proper keys and values
            expect(mockedT).toHaveBeenCalledWith('visitedPlaces:tripDurationText', {
                durationText: 'MOCK_DURATION'
            });
            expect(mockedT).toHaveBeenCalledWith(
                ['visitedPlaces:visitedPlaceArrivalTime_shopping', 'visitedPlaces:visitedPlaceArrivalTime'], 
                expect.objectContaining({ atPlace: 'visitedPlaces:atPlace' })
            );
            expect(mockedT).toHaveBeenCalledWith('visitedPlaces:atPlace', { placeName: _escape(currentPlace.name) });
        });

        test('should not append duration text for loop activities', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            const mockedT = jest.fn().mockImplementation((keys) => (Array.isArray(keys) ? keys[0] : keys));
            const formatTripDurationSpy = jest.spyOn(helpers, 'formatTripDuration');

            // Set activity to work on the road and remove the name and geography
            const currentPlace = interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1;
            const previousPlace = interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace1P1;
            currentPlace.activity = 'workOnTheRoad';
            delete currentPlace.name;
            delete currentPlace.geography;
            currentPlace.arrivalTime = 9 * 60 * 60;
            previousPlace.departureTime = 8 * 60 * 60;
            previousPlace.activity = 'home';

            const path = visitedPlaceFieldPath('workPlace1P1', 'arrivalTime');
            translateString(label, { t: mockedT } as any, interview, path);

            expect(formatTripDurationSpy).not.toHaveBeenCalled();
            expect(mockedT).toHaveBeenCalledWith(
                ['visitedPlaces:visitedPlaceArrivalTime_workOnTheRoad', 'visitedPlaces:visitedPlaceArrivalTime'], 
                expect.objectContaining({ atPlace: 'visitedPlaces:atThisPlace' })
            );
            expect(mockedT).toHaveBeenCalledWith('visitedPlaces:atThisPlace', { context: 'workOnTheRoad' });
        });

        test('should throw when visited place context is not found', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            const mockedT = jest.fn();
            expect(() => translateString(label, { t: mockedT } as any, interview, 'invalid/nonexistent/path')).toThrow(
                'widgetVisitedPlaceArrivalTime: label function: visited place context not found for path invalid/nonexistent/path'
            );
        });
    });

    describe('minTimeSecondsSinceMidnight function', () => {
        const minTimeFn = widget.minTimeSecondsSinceMidnight as Function;

        test.each([
            {
                title: 'returns config min bound when first place and no previous times',
                visitedPlaceId: 'homePlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace1P1.activity = 'home';
                },
                expected: visitedPlacesSectionConfig.tripDiaryMinTimeOfDay
            },
            {
                title: 'prioritizes previous times in same place before previous places',
                visitedPlaceId: 'workPlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    // Set previous place time and also intermediate time in same place
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace1P1.departureTime = 7 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1._previousDepartureTime = 8 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace2P1.arrivalTime = 10 * 60 * 60;
                },
                expected: 8 * 60 * 60
            },
            {
                title: 'returns max time from multiple previous places when no intermediate times',
                visitedPlaceId: 'otherPlace2P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace1P1.departureTime = 7 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.arrivalTime = 9 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.departureTime = 10 * 60 * 60;
                },
                expected: 10 * 60 * 60
            },
            {
                title: 'returns _previousDepartureTime, when all times are set',
                visitedPlaceId: 'workPlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace1P1.departureTime = 7 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1._previousPreviousDepartureTime = 8 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1._previousArrivalTime = 9 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1._previousDepartureTime = 10 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.arrivalTime = 11 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.departureTime = 12 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace2P1.arrivalTime = 13 * 60 * 60;
                },
                expected: 10 * 60 * 60
            },
        ])('should handle case: $title', ({ visitedPlaceId, setup, expected }) => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            unsetAllTimes(interview);
            setup(interview);
            const path = visitedPlaceFieldPath(visitedPlaceId, 'arrivalTime');
            expect(minTimeFn(interview, path)).toEqual(expected);
        });

        test('should throw error when visited place context is not found', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            expect(() => minTimeFn(interview, 'invalid/nonexistent/path')).toThrow(
                'time lower bound for field: arrivalTime: visited place context not found for path invalid/nonexistent/path'
            );
        });
    });

    describe('maxTimeSecondsSinceMidnight function', () => {
        const maxTimeFn = widget.maxTimeSecondsSinceMidnight as Function;

        test.each([
            {
                title: 'returns config max bound when no next places exist',
                visitedPlaceId: 'otherPlace2P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.otherPlace2P1.activity = 'shopping';
                },
                expected: visitedPlacesSectionConfig.tripDiaryMaxTimeOfDay
            },
            {
                title: 'returns current departureTime when available',
                visitedPlaceId: 'homePlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace1P1.departureTime = 11 * 60 * 60;
                },
                expected: 11 * 60 * 60
            },
            {
                title: 'returns min time from multiple next places',
                visitedPlaceId: 'homePlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.departureTime = 11 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.otherPlace2P1.arrivalTime = 15 * 60 * 60;
                },
                expected: 11 * 60 * 60
            },
            {
                title: 'returns departureTime, when all times are set',
                visitedPlaceId: 'workPlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace1P1.departureTime = 7 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1._previousPreviousDepartureTime = 8 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1._previousArrivalTime = 9 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1._previousDepartureTime = 10 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.arrivalTime = 11 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.departureTime = 12 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace2P1.arrivalTime = 13 * 60 * 60;
                },
                expected: 12 * 60 * 60
            },
            {
                title: 'returns next place arrivalTime even when next is a loop activity',
                visitedPlaceId: 'workPlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace2P1.arrivalTime = 7 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace2P1.departureTime = 8 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace2P1.activity = 'leisureStroll';
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.otherPlaceP1.arrivalTime = 8 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.otherPlaceP1.departureTime = 9 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.otherPlaceP1.activity = 'shopping';
                },
                expected: 7 * 60 * 60
            },
        ])('should handle case: $title', ({ visitedPlaceId, setup, expected }) => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            unsetAllTimes(interview);
            setup(interview);
            const path = visitedPlaceFieldPath(visitedPlaceId, 'arrivalTime');
            expect(maxTimeFn(interview, path)).toEqual(expected);
        });

        test('should throw error when visited place context is not found', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            expect(() => maxTimeFn(interview, 'invalid/nonexistent/path')).toThrow(
                'time upper bound for field: arrivalTime: visited place context not found for path invalid/nonexistent/path'
            );
        });
    });

    describe('suffixTimes function', () => {
        const suffixTimesFn = widget.suffixTimes as Function;

        test('should return suffix for very last time', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            unsetAllTimes(interview);
            const path = visitedPlaceFieldPath('workPlace1P1', 'arrivalTime');
            expect(suffixTimesFn(interview, path)).toEqual({ [String(visitedPlacesSectionConfig.tripDiaryMaxTimeOfDay)]: expect.any(String) });
        });
    })

});

describe('visitedPlaceDepartureTime widget', () => {
    const factory = new VisitedPlaceTimeWidgetFactory(
        visitedPlacesSectionConfig,
        widgetFactoryOptions
    );
    const widget = factory.getWidgetConfigs()['visitedPlaceDepartureTime'] as InputTimeType;;

    test('Test the widget configuration', () => {
        expect(widget).toEqual({
            type: 'question',
            inputType: 'time',
            path: 'departureTime',
            datatype: 'integer',
            twoColumns: false,
            containsHtml: true,
            label: expect.any(Function),
            minuteStep: expect.any(Function),
            addHourSeparators: true,
            suffixTimes:undefined,
            maxTimeSecondsSinceMidnight: expect.any(Function),
            minTimeSecondsSinceMidnight: expect.any(Function),
            validations: requiredValidation,
            conditional: expect.any(Function)
        });
    });

    describe('conditional function', () => {
        const conditionalFn = widget.conditional as Function;

        test.each([
            {
                title: 'returns [true, null] when onTheRoadArrivalType is set and not stayedThereUntilTheNextDay',
                visitedPlaceId: 'workPlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.activity = 'workOnTheRoad';
                    (interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1 as any).onTheRoadArrivalType = 'home';
                },
                expected: [true, null]
            },
            {
                title: 'returns [false, null] when last place has blank nextPlaceCategory',
                visitedPlaceId: 'otherPlace2P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.otherPlace2P1.activity = 'shopping';
                    delete interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.otherPlace2P1.nextPlaceCategory;
                },
                expected: [false, null]
            },
            {
                title: 'returns [true, null] when activity is set on first place',
                visitedPlaceId: 'homePlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace1P1.activity = 'home';
                },
                expected: [true, null]
            },
            {
                title: 'returns [false, null] when nextPlaceCategory is stayedThereUntilTheNextDay on non-first place',
                visitedPlaceId: 'workPlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.activity = 'workUsual';
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.nextPlaceCategory = 'stayedThereUntilTheNextDay';
                },
                expected: [false, null]
            },
            {
                title: 'returns [true, null] when activity is set and nextPlaceCategory is not stayedThereUntilTheNextDay',
                visitedPlaceId: 'workPlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.activity = 'workUsual';
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.nextPlaceCategory = 'visitedAnotherPlace';
                },
                expected: [true, null]
            },
            {
                title: 'returns [false, null] when activity is blank',
                visitedPlaceId: 'workPlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    delete interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.activity;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.nextPlaceCategory = 'visitedAnotherPlace';
                },
                expected: [false, null]
            },
        ])('should handle case: $title', ({ visitedPlaceId, setup, expected }) => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            setup(interview);
            const path = visitedPlaceFieldPath(visitedPlaceId, 'departureTime')
            expect(conditionalFn(interview, path)).toEqual(expected);
        });

        test('should throw error when visited place context is not found', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            expect(() => conditionalFn(interview, 'invalid/nonexistent/path')).toThrow(
                'widgetVisitedPlaceDepartureTime: conditional function: visited place context not found for path invalid/nonexistent/path'
            );
        });
    });

    describe('label function', () => {
        const label = widget.label;

        test.each([
            {
                title: 'uses home label for home activity',
                visitedPlaceId: 'homePlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace1P1.activity = 'home';
                },
                expectedPlaceKeys: [
                    { key: 'visitedPlaces:theHome' }, 
                    { key: ['visitedPlaces:visitedPlaceDepartureTime_home', 'visitedPlaces:visitedPlaceDepartureTime'], params: { place: 'visitedPlaces:theHome' } }
                ]
            },
            {
                title: 'uses named place label when name exists',
                visitedPlaceId: 'workPlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.activity = 'workUsual';
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.name = 'Office';
                },
                expectedPlaceKeys: [
                    { key: 'visitedPlaces:place', params: { placeName: 'Office' } },
                    { key: ['visitedPlaces:visitedPlaceDepartureTime_workUsual', 'visitedPlaces:visitedPlaceDepartureTime'], params: { place: 'visitedPlaces:place' } }
                ]
            },
            {
                title: 'uses this place fallback when name is missing',
                visitedPlaceId: 'otherPlaceP1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.otherPlaceP1.activity = 'shopping';
                    delete interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.otherPlaceP1.name;
                },
                expectedPlaceKeys: [
                    { key: 'visitedPlaces:thisPlace', params: { context: 'shopping' } },
                    { key: ['visitedPlaces:visitedPlaceDepartureTime_shopping', 'visitedPlaces:visitedPlaceDepartureTime'], params: { place: 'visitedPlaces:thisPlace' } }
                ]
            }
        ])('should handle case: $title', ({ visitedPlaceId, setup, expectedPlaceKeys }) => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            setup(interview);
            const mockedT = jest.fn().mockImplementation((keys) => (Array.isArray(keys) ? keys[0] : keys));

            const path = visitedPlaceFieldPath(visitedPlaceId, 'departureTime');
            const labelResult = translateString(label, { t: mockedT } as any, interview, path);

            expect(labelResult).toContain('visitedPlaces:visitedPlaceDepartureTime_');
            for (const expectedKey of expectedPlaceKeys) {
                if (expectedKey.params) {
                    expect(mockedT).toHaveBeenCalledWith(expectedKey.key, expect.objectContaining(expectedKey.params));
                } else {
                    expect(mockedT).toHaveBeenCalledWith(expectedKey.key);
                }
                
            }
        });

        test('should throw when visited place context is not found', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            const mockedT = jest.fn();
            expect(() => translateString(label, { t: mockedT } as any, interview, 'invalid/nonexistent/path')).toThrow(
                'widgetVisitedPlaceDepartureTime: label function: visited place context not found for path invalid/nonexistent/path'
            );
        });
    });

    describe('minuteStep function', () => {
        const minuteStepFn = widget.minuteStep as Function;

        test('should return 15 when visiting first place and it is new', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            setActiveSurveyObjects(interview, {
                personId: 'personId1',
                journeyId: 'journeyId1',
                visitedPlaceId: 'homePlace1P1'
            });

            // Set the visited place to be new
            const activePlace = interview.response.household!.persons!['personId1'].journeys!['journeyId1'].visitedPlaces!['homePlace1P1'];
            activePlace._isNew = true;

            const result = minuteStepFn(interview, 'household.persons.personId1.journeys.journeyId1.visitedPlaces.homePlace1P1.departureTime');

            expect(result).toBe(15);
        });

        test('should return 5 when visiting first place and it is not new', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            setActiveSurveyObjects(interview, {
                personId: 'personId1',
                journeyId: 'journeyId1',
                visitedPlaceId: 'homePlace1P1'
            });

            // Set the visited place to be not new
            const activePlace = interview.response.household!.persons!['personId1'].journeys!['journeyId1'].visitedPlaces!['homePlace1P1'];
            delete activePlace._isNew;

            const result = minuteStepFn(interview, 'household.persons.personId1.journeys.journeyId1.visitedPlaces.homePlace1P1.departureTime');

            expect(result).toBe(5);
        });

        test('should return 5 when visiting a place with sequence !== 1', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            setActiveSurveyObjects(interview, {
                personId: 'personId1',
                journeyId: 'journeyId1',
                visitedPlaceId: 'workPlace1P1'
            });

            // Set the visited place to be new, but it's not sequence 1
            const activePlace = interview.response.household!.persons!['personId1'].journeys!['journeyId1'].visitedPlaces!['workPlace1P1'];
            activePlace._isNew = true;

            const result = minuteStepFn(interview, 'household.persons.personId1.journeys.journeyId1.visitedPlaces.workPlace1P1.departureTime');

            expect(result).toBe(5);
        });

        test('should throw error when visited place context is not found', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            const minuteStepFn = widget.minuteStep as Function;

            expect(() => {
                minuteStepFn(interview, 'invalid/nonexistent/path');
            }).toThrow('widgetVisitedPlaceDepartureTime: minuteStep function: visited place context not found for path invalid/nonexistent/path');
        });
    });

    describe('minTimeSecondsSinceMidnight function', () => {
        const minTimeFn = widget.minTimeSecondsSinceMidnight as Function;

        test.each([
            {
                title: 'returns config min bound when first place and no previous times',
                visitedPlaceId: 'homePlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace1P1.activity = 'home';
                },
                expected: visitedPlacesSectionConfig.tripDiaryMinTimeOfDay
            },
            {
                title: 'prioritizes intermediate times in same place before previous places',
                visitedPlaceId: 'workPlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    // Set previous place time and also intermediate times in same place
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace1P1.departureTime = 7 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.arrivalTime = 8 * 60 * 60;
                },
                expected: 8 * 60 * 60
            },
            {
                title: 'returns highest intermediate time when multiple are defined',
                visitedPlaceId: 'workPlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace1P1.departureTime = 6 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1._previousPreviousDepartureTime = 7 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1._previousDepartureTime = 9 * 60 * 60;
                },
                expected: 9 * 60 * 60
            },
            {
                title: 'returns max time from multiple previous places when no intermediate times',
                visitedPlaceId: 'otherPlace2P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace1P1.departureTime = 7 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.departureTime = 10 * 60 * 60;
                },
                expected: 10 * 60 * 60
            },
            {
                title: 'returns arrivalTime, when all times are set',
                visitedPlaceId: 'workPlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace1P1.departureTime = 7 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1._previousPreviousDepartureTime = 8 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1._previousArrivalTime = 9 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1._previousDepartureTime = 10 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.arrivalTime = 11 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.departureTime = 12 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace2P1.arrivalTime = 13 * 60 * 60;
                },
                expected: 11 * 60 * 60
            },
        ])('should handle case: $title', ({ visitedPlaceId, setup, expected }) => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            unsetAllTimes(interview);
            setup(interview);
            const path = visitedPlaceFieldPath(visitedPlaceId, 'departureTime');
            expect(minTimeFn(interview, path)).toEqual(expected);
        });

        test('should throw error when visited place context is not found', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            expect(() => minTimeFn(interview, 'invalid/nonexistent/path')).toThrow(
                'time lower bound for field: departureTime: visited place context not found for path invalid/nonexistent/path'
            );
        });
    });

    describe('maxTimeSecondsSinceMidnight function', () => {
        const maxTimeFn = widget.maxTimeSecondsSinceMidnight as Function;

        test.each([
            {
                title: 'returns config max bound when last place and no next places exist',
                visitedPlaceId: 'otherPlace2P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.otherPlace2P1.activity = 'shopping';
                },
                expected: visitedPlacesSectionConfig.tripDiaryMaxTimeOfDay
            },
            {
                title: 'returns min time from multiple next places',
                visitedPlaceId: 'homePlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.departureTime = 9 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.otherPlace2P1.arrivalTime = 15 * 60 * 60;
                },
                expected: 9 * 60 * 60
            },
            {
                title: 'returns config max when all next places have missing times',
                visitedPlaceId: 'homePlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    // All times are unset, do not add any
                },
                expected: visitedPlacesSectionConfig.tripDiaryMaxTimeOfDay
            },
            {
                title: 'returns next place arrivalTime, when all times are set',
                visitedPlaceId: 'workPlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace1P1.departureTime = 7 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1._previousPreviousDepartureTime = 8 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1._previousArrivalTime = 9 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1._previousDepartureTime = 10 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.arrivalTime = 11 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.workPlace1P1.departureTime = 12 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace2P1.arrivalTime = 13 * 60 * 60;
                },
                expected: 13 * 60 * 60
            },
            {
                title: 'returns next next place arrivalTime when next is a loop activity',
                visitedPlaceId: 'workPlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace2P1.arrivalTime = 7 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace2P1.departureTime = 8 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace2P1.activity = 'leisureStroll';
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.otherPlaceP1.arrivalTime = 8 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.otherPlaceP1.departureTime = 9 * 60 * 60;
                    interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.otherPlaceP1.activity = 'shopping';
                },
                expected: 8 * 60 * 60
            },
        ])('should handle case: $title', ({ visitedPlaceId, setup, expected }) => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            unsetAllTimes(interview);
            setup(interview);
            const path = visitedPlaceFieldPath(visitedPlaceId, 'departureTime');
            expect(maxTimeFn(interview, path)).toEqual(expected);
        });

        test('should throw error when visited place context is not found', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            expect(() => maxTimeFn(interview, 'invalid/nonexistent/path')).toThrow(
                'time upper bound for field: departureTime: visited place context not found for path invalid/nonexistent/path'
            );
        });
    });
    
});
