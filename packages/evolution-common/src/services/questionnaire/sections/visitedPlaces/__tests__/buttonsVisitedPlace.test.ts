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

    test.each(['buttonSaveVisitedPlace', 'buttonDeleteVisitedPlace', 'buttonCancelVisitedPlace'])('should have a widget named %s', (widgetName) => {
        expect(Object.keys(widgetConfigs)).toContain(widgetName);
    });

    test('should not return extra widgets', () => {
        expect(Object.keys(widgetConfigs)).toHaveLength(3);
    });

    test('should return the expected full config shape', () => {
        expect(widgetConfigs).toEqual({
            buttonSaveVisitedPlace: {
                type: 'button',
                color: 'green',
                label: expect.any(Function),
                hideWhenRefreshing: true,
                path: 'saveVisitedPlace',
                icon: 'check-circle',
                align: 'center',
                action: expect.any(Function),
                saveCallback: expect.any(Function)
            },
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

describe('buttonSaveVisitedPlace widget', () => {
    const widgetConfig = new ButtonsVisitedPlaceConfigFactory(
        visitedPlacesSectionConfig,
        widgetFactoryOptions
    ).getWidgetConfigs().buttonSaveVisitedPlace as ButtonWidgetConfig;

    describe('labels', () => {
        test('should return the right label', () => {
            const mockedT = jest.fn();
            utilHelpers.translateString(widgetConfig.label, { t: mockedT } as any, interviewAttributesForTestCases, 'path');
            expect(mockedT).toHaveBeenCalledWith('main:Confirm');
        });
    });

    describe('action', () => {
        test('should use validateButtonAction from widgetFactoryOptions', () => {
            expect(widgetConfig.action).toBe(widgetFactoryOptions.buttonActions.validateButtonAction);
        });
    });

    describe('saveCallback', () => {
        test('throws when visited place context is not found', async () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            const callbacks = {
                startAddGroupedObjects: jest.fn(),
                startUpdateInterview: jest.fn()
            };

            await expect(widgetConfig.saveCallback?.(callbacks as any, interview, 'invalid.path')).rejects.toThrow(
                'visited place context not found for path invalid.path'
            );
        });

        test.each([
            {
                title: 'no insertion and sets next incomplete as active place when saving a place with already correct next place',
                path: 'household.persons.personId1.journeys.journeyId1.visitedPlaces.workPlace1P1',
                activeVisitedPlaceId: 'workPlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    // Nothing to do
                },
                expectedInsertedPlaces: [],
                expectedFirstUpdateValuesByPath: {
                    'response.household.persons.personId1.journeys.journeyId1.visitedPlaces.workPlace1P1._isNew': false
                },
                expectedActiveVisitedPlaceId: 'otherPlaceP1'
            }, {
                title: 'inserts one next place when nextPlaceCategory is wentBackHome',
                path: 'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlace2P1',
                activeVisitedPlaceId: 'otherPlace2P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    const journey = getJourney(interview);
                    journey.visitedPlaces!.otherPlace2P1.activity = 'shopping';
                    journey.visitedPlaces!.otherPlace2P1.activityCategory = 'shoppingServiceRestaurant';
                    journey.visitedPlaces!.otherPlace2P1.nextPlaceCategory = 'wentBackHome';
                },
                expectedInsertedPlaces: [
                    {
                        insertSequence: 6,
                        newVisitedPlace: {
                            activity: 'home',
                            activityCategory: 'home'
                        }
                    }
                ],
                expectedFirstUpdateValuesByPath: {
                    'response.household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlace2P1._isNew': false
                },
                expectedActiveVisitedPlaceId: null
            }, {
                title: 'inserts one next place when nextPlaceCategory is visitedAnotherPlace but next place is home',
                path: 'household.persons.personId1.journeys.journeyId1.visitedPlaces.workPlace1P1',
                activeVisitedPlaceId: 'workPlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    const journey = getJourney(interview);
                    // Set next place category, but next place in array is home, so a place should be inserted after workPlace1P1
                    journey.visitedPlaces!.workPlace1P1.nextPlaceCategory = 'visitedAnotherPlace';
                },
                expectedInsertedPlaces: [
                    {
                        insertSequence: 3,
                        newVisitedPlace: {}
                    }
                ],
                expectedFirstUpdateValuesByPath: {
                    'response.household.persons.personId1.journeys.journeyId1.visitedPlaces.workPlace1P1._isNew': false
                },
                expectedActiveVisitedPlaceId: null
            }, {
                title: 'inserts two places for workOnTheRoad with home departure and home arrival',
                path: 'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlace2P1',
                activeVisitedPlaceId: 'otherPlace2P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    const journey = getJourney(interview);
                    const visitedPlace = journey.visitedPlaces!.otherPlace2P1;
                    visitedPlace.activity = 'workOnTheRoad';
                    visitedPlace.activityCategory = 'work';
                    visitedPlace.onTheRoadPreviousPlaceActivity = 'home';
                    visitedPlace.onTheRoadNextPlaceCategory = 'wentBackHome';
                    visitedPlace.arrivalTime = 9 * 60 * 60;
                    visitedPlace.departureTime = 17 * 60 * 60;
                    visitedPlace._previousArrivalTime = 8 * 60 * 60;
                },
                expectedInsertedPlaces: [
                    {
                        insertSequence: 5,
                        newVisitedPlace: {
                            activity: 'home',
                            activityCategory: 'home',
                            nextPlaceCategory: 'visitedAnotherPlace',
                            arrivalTime: 8 * 60 * 60,
                            departureTime: 9 * 60 * 60
                        }
                    },
                    {
                        insertSequence: 7,
                        newVisitedPlace: {
                            activity: 'home',
                            activityCategory: 'home',
                            arrivalTime: 17 * 60 * 60
                        }
                    }
                ],
                expectedFirstUpdateValuesByPath: {
                    'response.household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlace2P1._isNew': false
                },
                expectedActiveVisitedPlaceId: null
            }, {
                title: 'set previous departure time when editing the second place of the day, and stay until next day',
                path: 'household.persons.personId1.journeys.journeyId1.visitedPlaces.workPlace1P1',
                activeVisitedPlaceId: 'workPlace1P1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    const journey = getJourney(interview);
                    const visitedPlace = journey.visitedPlaces!.workPlace1P1;
                    // Delete visited places of index 2 and more
                    Object.keys(journey.visitedPlaces!).forEach((key, index) => {
                        if (index >= 2) {
                            delete journey.visitedPlaces![key];
                        }
                    });
                    // Set the remaining places as new and unset departureTime
                    Object.keys(journey.visitedPlaces!).forEach((key) => {
                        journey.visitedPlaces![key]._isNew = true;
                        delete journey.visitedPlaces![key].departureTime;
                    });
                    // Set the current place's times
                    visitedPlace._previousDepartureTime = 8 * 60 * 60;
                    visitedPlace.arrivalTime = 9 * 60 * 60;
                    visitedPlace.departureTime = 17 * 60 * 60;
                    visitedPlace.nextPlaceCategory = 'stayedThereUntilTheNextDay';
                },
                expectedInsertedPlaces: [],
                expectedFirstUpdateValuesByPath: {
                    'response.household.persons.personId1.journeys.journeyId1.visitedPlaces.homePlace1P1._isNew': false,
                    'response.household.persons.personId1.journeys.journeyId1.visitedPlaces.homePlace1P1.departureTime': 8 * 60 * 60,
                    'response.household.persons.personId1.journeys.journeyId1.visitedPlaces.workPlace1P1._isNew': false
                },
                expectedActiveVisitedPlaceId: null
            }, {
                title: 'Update departure times of previous places with loop activities',
                path: 'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlaceP1',
                activeVisitedPlaceId: 'otherPlaceP1',
                setup: (interview: typeof interviewAttributesForTestCases) => {
                    const journey = getJourney(interview);
                    const visitedPlace = journey.visitedPlaces!.otherPlaceP1;
                    // Change otherPlaceP1 for a leisureStroll
                    visitedPlace.activityCategory = 'leisure';
                    visitedPlace.activity = 'leisureStroll';
                },
                expectedInsertedPlaces: [],
                expectedFirstUpdateValuesByPath: {
                    'response.household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlaceP1._isNew': false,
                    'response.household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlace2P1.arrivalTime': getJourney(interviewAttributesForTestCases).visitedPlaces!.otherPlaceP1.departureTime,
                },
                expectedActiveVisitedPlaceId: null
            }
        ])('$title', async (testCase) => {
            // Clone interview and set active visited place
            const interview = _cloneDeep(interviewAttributesForTestCases);
            setActiveSurveyObjects(interview, {
                personId: 'personId1',
                journeyId: 'journeyId1',
                visitedPlaceId: testCase.activeVisitedPlaceId
            });
            // Call the setup function of the interview
            testCase.setup(interview);

            // Spy on the helpers used in the save callback to check if they are called with the right parameters
            const journey = getJourney(interview);
            const nextIncompletePlace = testCase.expectedActiveVisitedPlaceId
                ? (journey.visitedPlaces![testCase.expectedActiveVisitedPlaceId] as any)
                : null;

            const insertVisitedPlaceSpy = jest
                .spyOn(odHelpers, 'insertVisitedPlace')
                .mockResolvedValue(interview as any);
            const getFirstIncompleteSpy = jest
                .spyOn(odHelpers, 'getFirstIncompleteVisitedPlace')
                .mockReturnValue(nextIncompletePlace);

            const startAddGroupedObjects = jest.fn();
            const startUpdateInterview = jest.fn((attributes, callback) => {
                if (typeof callback === 'function') {
                    callback(interview);
                }
            });

            await widgetConfig.saveCallback?.(
                {
                    startAddGroupedObjects,
                    startUpdateInterview
                } as any,
                interview,
                testCase.path
            );

            expect(getFirstIncompleteSpy).toHaveBeenCalledTimes(1);
            // Test that the insertvisitedPlace helper has been called with the expected places
            expect(insertVisitedPlaceSpy).toHaveBeenCalledTimes(testCase.expectedInsertedPlaces.length);
            testCase.expectedInsertedPlaces.forEach((expectedInsert, index) => {
                expect(insertVisitedPlaceSpy).toHaveBeenNthCalledWith(
                    index + 1,
                    expect.objectContaining({
                        person: interview.response.household!.persons!.personId1,
                        journey,
                        insertSequence: expectedInsert.insertSequence,
                        startAddGroupedObjects,
                        newVisitedPlace: expect.objectContaining(expectedInsert.newVisitedPlace)
                    })
                );
            });

            // Test the 2 calls to the `startUpdateInterview` callback
            expect(startUpdateInterview).toHaveBeenCalledTimes(2);
            expect(startUpdateInterview).toHaveBeenNthCalledWith(
                1,
                expect.objectContaining({
                    sectionShortname: 'visitedPlaces',
                    valuesByPath: expect.objectContaining(testCase.expectedFirstUpdateValuesByPath)
                }),
                expect.any(Function)
            );
            expect(startUpdateInterview).toHaveBeenNthCalledWith(2, {
                sectionShortname: 'visitedPlaces',
                valuesByPath: {
                    'response._activeVisitedPlaceId': testCase.expectedActiveVisitedPlaceId
                }
            });
        });

        test('saveCallback with change of active person during the update', async () => {
            // Clone interview and set active visited place
            const interview = _cloneDeep(interviewAttributesForTestCases);
            setActiveSurveyObjects(interview, {
                personId: 'personId1',
                journeyId: 'journeyId1',
                visitedPlaceId: 'workPlace1P1'
            });

            // Simple save, no place should be inserted and the active visited place should not be changed because the active person and journey will not be the same after the first update
            const insertVisitedPlaceSpy = jest
                .spyOn(odHelpers, 'insertVisitedPlace');
            const getFirstIncompleteSpy = jest
                .spyOn(odHelpers, 'getFirstIncompleteVisitedPlace');

            const startAddGroupedObjects = jest.fn();
            const startUpdateInterview = jest.fn((attributes, callback) => {
                const updatedInterview = _cloneDeep(interview);
                // Change the active person and journey to simulate user navigation during the update
                updatedInterview.response._activePersonId = 'personId2';
                updatedInterview.response._activeJourneyId = 'journeyId2';
                if (typeof callback === 'function') {
                    callback(updatedInterview);
                }
            });

            // Call the save callback
            await widgetConfig.saveCallback?.(
                {
                    startAddGroupedObjects,
                    startUpdateInterview
                } as any,
                interview,
                'household.persons.personId1.journeys.journeyId1.visitedPlaces.workPlace1P1'
            );

            // Test that the helper functions have not been called
            expect(getFirstIncompleteSpy).not.toHaveBeenCalled();
            expect(insertVisitedPlaceSpy).not.toHaveBeenCalled();

            // Test the 2 calls to the `startUpdateInterview` callback
            expect(startUpdateInterview).toHaveBeenCalledTimes(1);
            expect(startUpdateInterview).toHaveBeenNthCalledWith(
                1,
                expect.objectContaining({
                    sectionShortname: 'visitedPlaces',
                    valuesByPath: { 'response.household.persons.personId1.journeys.journeyId1.visitedPlaces.workPlace1P1._isNew': false }
                }),
                expect.any(Function)
            );
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
