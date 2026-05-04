/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _cloneDeep from 'lodash/cloneDeep';

import { ButtonsVisitedPlaceConfigFactory } from '../buttonsVisitedPlace';
import {
    interviewAttributesForTestCases,
    setActiveSurveyObjects,
    widgetFactoryOptions
} from '../../../../../tests/surveys';
import * as utilHelpers from '../../../../../utils/helpers';
import * as odHelpers from '../../../../odSurvey/helpers';
import { ButtonWidgetConfig, VisitedPlacesSectionConfiguration } from '../../../types';

const visitedPlacesSectionConfig: VisitedPlacesSectionConfiguration = {
    type: 'visitedPlaces',
    enabled: true,
    tripDiaryMinTimeOfDay: 4 * 60 * 60, // 4h in seconds
    tripDiaryMaxTimeOfDay: 28 * 60 * 60
};

const visitedPlacePath =
    'household.persons.personId1.journeys.journeyId1.visitedPlaces.workPlace1P1';

const getJourney = (interview: typeof interviewAttributesForTestCases) =>
    interview.response.household!.persons!.personId1!.journeys!.journeyId1!;

beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
});

describe('ButtonsVisitedPlaceConfigFactory widgets', () => {
    const widgetConfigs = new ButtonsVisitedPlaceConfigFactory(visitedPlacesSectionConfig, widgetFactoryOptions).getWidgetConfigs();

    test.each(['buttonDeleteVisitedPlace', 'buttonCancelVisitedPlace'])('should have a widget named %s', (widgetName) => {
        expect(Object.keys(widgetConfigs)).toContain(widgetName);
    });

    test('should not return extra widgets', () => {
        expect(Object.keys(widgetConfigs)).toHaveLength(2);
    });

    test('should return the expected full config shape', () => {
        expect(widgetConfigs).toEqual({
            buttonDeleteVisitedPlace: {
                type: 'button',
                color: 'red',
                icon: undefined,
                label: expect.any(Function),
                hideWhenRefreshing: true,
                path: 'deleteVisitedPlace',
                conditional: expect.any(Function),
                align: 'center',
                size: 'small',
                confirmPopup: {
                    content: expect.any(Function)
                },
                action: expect.any(Function)
            },
            buttonCancelVisitedPlace: {
                type: 'button',
                color: 'grey',
                label: expect.any(Function),
                hideWhenRefreshing: true,
                path: 'cancelVisitedPlace',
                conditional: expect.any(Function),
                align: 'center',
                size: 'small',
                action: expect.any(Function)
            }
        });
    });
});

describe('buttonDeleteVisitedPlace widget', () => {
    const widgetConfig = new ButtonsVisitedPlaceConfigFactory(visitedPlacesSectionConfig, widgetFactoryOptions).getWidgetConfigs().buttonDeleteVisitedPlace as ButtonWidgetConfig;

    describe('labels', () => {
        test('should return the right label', () => {
            const mockedT = jest.fn();
            utilHelpers.translateString(widgetConfig.label, { t: mockedT } as any, interviewAttributesForTestCases, 'path');
            expect(mockedT).toHaveBeenCalledWith('visitedPlaces:deleteThisGroupedObject');
        });

        test('should return the right confirm popup content', () => {
            const mockedT = jest.fn();
            utilHelpers.translateString(
                widgetConfig.confirmPopup?.content,
                { t: mockedT } as any,
                interviewAttributesForTestCases,
                'path'
            );
            expect(mockedT).toHaveBeenCalledWith('visitedPlaces:ConfirmDeleteVisitedPlace');
        });
    });

    describe('conditional', () => {
        test.each([
            {
                title: 'true with more than one place and non-blank activity category',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    const journey = getJourney(interview);
                    journey.visitedPlaces!.workPlace1P1.activityCategory = 'work';
                },
                expected: [true, undefined]
            },
            {
                title: 'false with more than one place and blank activity category',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    const journey = getJourney(interview);
                    delete journey.visitedPlaces!.workPlace1P1.activityCategory;
                },
                expected: [false, undefined]
            },
            {
                title: 'false with one place',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    const journey = getJourney(interview);
                    Object.keys(journey.visitedPlaces!).filter((key) => key !== 'workPlace1P1').forEach(key => delete journey.visitedPlaces![key]);
                    journey.visitedPlaces!.workPlace1P1.activityCategory = 'work';
                },
                expected: [false, undefined]
            }
        ])('$title', ({ setup, expected }) => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            setActiveSurveyObjects(interview, {
                personId: 'personId1',
                journeyId: 'journeyId1',
                visitedPlaceId: 'workPlace1P1'
            });
            setup(interview);

            expect(widgetConfig.conditional?.(interview, visitedPlacePath)).toEqual(expected);
        });

        test('throws when visited place context is not found', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            expect(() => widgetConfig.conditional?.(interview, 'invalid.path')).toThrow(
                'visited place context not found for path invalid.path'
            );
        });
    });

    describe('action', () => {
        test('should call deleteVisitedPlace with the proper callbacks', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            setActiveSurveyObjects(interview, {
                personId: 'personId1',
                journeyId: 'journeyId1',
                visitedPlaceId: 'workPlace1P1'
            });

            const context = odHelpers.getVisitedPlaceContextFromPath({ interview, path: visitedPlacePath });
            expect(context).not.toBeNull();

            const startRemoveGroupedObjects = jest.fn();
            const startUpdateInterview = jest.fn();
            const deleteVisitedPlaceSpy = jest.spyOn(odHelpers, 'deleteVisitedPlace').mockImplementation(jest.fn());

            widgetConfig.action?.(
                { startRemoveGroupedObjects, startUpdateInterview } as any,
                interview,
                visitedPlacePath,
                'visitedPlaces',
                {}
            );

            expect(deleteVisitedPlaceSpy).toHaveBeenCalledTimes(1);
            expect(deleteVisitedPlaceSpy).toHaveBeenCalledWith({
                interview,
                person: context!.person,
                journey: context!.journey,
                visitedPlace: context!.visitedPlace,
                startRemoveGroupedObjects,
                startUpdateInterview
            });
        });

        test('throws when visited place context is not found', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            const startRemoveGroupedObjects = jest.fn();
            const startUpdateInterview = jest.fn();

            expect(() =>
                widgetConfig.action?.(
                    { startRemoveGroupedObjects, startUpdateInterview } as any,
                    interview,
                    'invalid.path',
                    'visitedPlaces',
                    {}
                )
            ).toThrow('visited place context not found for path invalid.path');
        });
    });
});

describe('buttonCancelVisitedPlace widget', () => {
    const widgetConfig = new ButtonsVisitedPlaceConfigFactory(visitedPlacesSectionConfig, widgetFactoryOptions).getWidgetConfigs().buttonCancelVisitedPlace as ButtonWidgetConfig;
    describe('labels', () => {
        test('should return the right label', () => {
            const mockedT = jest.fn();
            utilHelpers.translateString(widgetConfig.label, { t: mockedT } as any, interviewAttributesForTestCases, 'path');
            expect(mockedT).toHaveBeenCalledWith('main:Cancel');
        });
    });

    describe('conditional', () => {
        test.each([
            {
                title: 'true with more than one place and blank activity category',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    const journey = getJourney(interview);
                    delete journey.visitedPlaces!.workPlace1P1.activityCategory;
                },
                expected: [true, undefined]
            },
            {
                title: 'false with more than one place and non-blank activity category',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    const journey = getJourney(interview);
                    journey.visitedPlaces!.workPlace1P1.activityCategory = 'work';
                },
                expected: [false, undefined]
            },
            {
                title: 'false with one place',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    const journey = getJourney(interview);
                    Object.keys(journey.visitedPlaces!).filter((key) => key !== 'workPlace1P1').forEach(key => delete journey.visitedPlaces![key]);
                    journey.visitedPlaces!.workPlace1P1.activityCategory = '' as any;
                },
                expected: [false, undefined]
            }
        ])('$title', ({ setup, expected }) => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            setActiveSurveyObjects(interview, {
                personId: 'personId1',
                journeyId: 'journeyId1',
                visitedPlaceId: 'workPlace1P1'
            });
            setup(interview);

            expect(widgetConfig.conditional?.(interview, visitedPlacePath)).toEqual(expected);
        });

        test('throws when visited place context is not found', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            expect(() => widgetConfig.conditional?.(interview, 'invalid.path')).toThrow(
                'visited place context not found for path invalid.path'
            );
        });
    });

    describe('action', () => {
        test('should call deleteVisitedPlace with the proper callbacks', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            setActiveSurveyObjects(interview, {
                personId: 'personId1',
                journeyId: 'journeyId1',
                visitedPlaceId: 'workPlace1P1'
            });

            const context = odHelpers.getVisitedPlaceContextFromPath({ interview, path: visitedPlacePath });
            expect(context).not.toBeNull();

            const startRemoveGroupedObjects = jest.fn();
            const startUpdateInterview = jest.fn();
            const deleteVisitedPlaceSpy = jest.spyOn(odHelpers, 'deleteVisitedPlace').mockImplementation(jest.fn());

            widgetConfig.action?.(
                { startRemoveGroupedObjects, startUpdateInterview } as any,
                interview,
                visitedPlacePath,
                'visitedPlaces',
                {}
            );

            expect(deleteVisitedPlaceSpy).toHaveBeenCalledTimes(1);
            expect(deleteVisitedPlaceSpy).toHaveBeenCalledWith({
                interview,
                person: context!.person,
                journey: context!.journey,
                visitedPlace: context!.visitedPlace,
                startRemoveGroupedObjects,
                startUpdateInterview
            });
        });

        test('throws when visited place context is not found', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            const startRemoveGroupedObjects = jest.fn();
            const startUpdateInterview = jest.fn();

            expect(() =>
                widgetConfig.action?.(
                    { startRemoveGroupedObjects, startUpdateInterview } as any,
                    interview,
                    'invalid.path',
                    'visitedPlaces',
                    {}
                )
            ).toThrow('visited place context not found for path invalid.path');
        });
    });
});
