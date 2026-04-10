/*
 * Copyright 2026, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Activity, activityValues } from '../../../../odSurvey/types';
import _cloneDeep from 'lodash/cloneDeep';
import { interviewAttributesForTestCases } from '../../../../../tests/surveys';
import { setResponse } from '../../../../../utils/helpers';
import * as helpers from '../helpers';
import { VisitedPlacesSectionConfiguration } from '../../../types';

const defaultVisitedPlaceConfig = {
    type: 'visitedPlaces' as const,
    enabled: true,
    tripDiaryMinTimeOfDay: 4 * 60 * 60, // 4h in seconds
    tripDiaryMaxTimeOfDay: 28 * 60 * 60 // 28h in seconds (i.e. 4h the next day)
}

describe('Visited places helpers - activity/activityCategory filtering', () => {
    test('getFilteredActivities should return no activities when section is disabled', () => {
        const visitedPlacesConfig = { ...defaultVisitedPlaceConfig, enabled: false };
        const filteredActivities = helpers.getFilteredActivities(visitedPlacesConfig);
        expect(filteredActivities).toEqual([]);
    });

    test('getFilteredActivities should return all activities when section is enabled without restrictions', () => {
        const visitedPlacesConfig = { ...defaultVisitedPlaceConfig };
        const filteredActivities = helpers.getFilteredActivities(visitedPlacesConfig);
        expect(filteredActivities).toEqual(activityValues);
    });

    test('getFilteredActivities should filter with activitiesIncludeOnly and keep entered order', () => {
        const visitedPlacesConfig: VisitedPlacesSectionConfiguration = {
            ...defaultVisitedPlaceConfig,
            activitiesIncludeOnly: ['shopping', 'workUsual', 'dontKnow']
        };
        const filteredActivities = helpers.getFilteredActivities(visitedPlacesConfig);

        expect(filteredActivities).toEqual(['shopping', 'workUsual', 'dontKnow']);
    });

    test('getFilteredActivities should filter with activityExclude', () => {
        const visitedPlacesConfig: VisitedPlacesSectionConfiguration = {
            ...defaultVisitedPlaceConfig,
            activityExclude: ['other', 'dontKnow', 'preferNotToAnswer']
        };
        const filteredActivities = helpers.getFilteredActivities(visitedPlacesConfig);

        expect(filteredActivities.length).toBe(activityValues.length - 3);
        expect(filteredActivities).not.toContain('other');
        expect(filteredActivities).not.toContain('dontKnow');
        expect(filteredActivities).not.toContain('preferNotToAnswer');
        expect(filteredActivities).toContain('workUsual');
        expect(filteredActivities).toContain('shopping');
    });

    test('getFilteredActivities should filter with activitiesIncludeOnly and keep entered order and ignore excluded ones', () => {
        const visitedPlacesConfig: VisitedPlacesSectionConfiguration = {
            ...defaultVisitedPlaceConfig,
            activitiesIncludeOnly: ['shopping', 'workUsual', 'dontKnow'],
            activityExclude: ['dontKnow'] // This should be ignored since dontKnow is in the include list
        };
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        const filteredActivities = helpers.getFilteredActivities(visitedPlacesConfig);

        expect(filteredActivities).toEqual(['shopping', 'workUsual', 'dontKnow']);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
            'Warning: visited places section configuration has both activitiesIncludeOnly and activityExclude set. The activityExclude will be ignored. Please check the configuration.'
        );
        consoleWarnSpy.mockRestore();
    });

    test('getFilteredActivities should ignore non-existent activities in activitiesIncludeOnly', () => {
        const visitedPlacesConfig: VisitedPlacesSectionConfiguration = {
            ...defaultVisitedPlaceConfig,
            activitiesIncludeOnly: ['shopping', 'nonExistentActivity' as any, 'workUsual'] as any
        };
        const filteredActivities = helpers.getFilteredActivities(visitedPlacesConfig);

        expect(filteredActivities).toEqual(['shopping', 'workUsual']);
    });

    test('getFilteredActivityCategories should keep only categories tied to available activities', () => {
        const availableActivities: Activity[] = ['workUsual', 'shopping', 'home'];
        const filteredCategories = helpers.getFilteredActivityCategories(availableActivities);

        // Categories linked to available activities
        expect(filteredCategories).toContain('work');
        expect(filteredCategories).toContain('shoppingServiceRestaurant');
        expect(filteredCategories).toContain('home');
        expect(filteredCategories.length).toBe(3);

        // Categories with no matching available activity should be excluded
        expect(filteredCategories).not.toContain('school');
        expect(filteredCategories).not.toContain('dropFetchSomeone');
        expect(filteredCategories).not.toContain('leisure');
        expect(filteredCategories).not.toContain('dontKnow');
        expect(filteredCategories).not.toContain('preferNotToAnswer');
    });

    test('getFilteredActivityCategories should include all categories where activity belong to multiple categories', () => {
        const availableActivities: Activity[] = ['restaurant'];
        const filteredCategories = helpers.getFilteredActivityCategories(availableActivities);

        expect(filteredCategories).toContain('shoppingServiceRestaurant');
        expect(filteredCategories).toContain('leisure');
        expect(filteredCategories).toContain('other');
        expect(filteredCategories.length).toBe(3);
    });
});

describe('Visited places helpers - validatePreviousNextPlaceIsNotActivities', () => {
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

    test('should warn and return true when there is no active journey', () => {
        const interview = _cloneDeep(interviewAttributesForTestCases);
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        const visitedPlace = interview.response.household!.persons!.personId1!.journeys!.journeyId1!.visitedPlaces!
            .workPlace1P1;

        expect(
            helpers.validatePreviousNextPlaceIsCompatibleActivities({
                interview,
                visitedPlace,
                incompatibleConsecutiveActivities: ['home']
            })
        ).toEqual(true);
        expect(consoleWarnSpy).toHaveBeenCalled();

        consoleWarnSpy.mockRestore();
    });

    test.each([
        [
            'previous place activity is incompatible',
            (interview: typeof interviewAttributesForTestCases) => {
                setActiveVisitedPlace(interview, 'personId1', 'journeyId1', 'workPlace1P1');
                return {
                    visitedPlace:
                        interview.response.household!.persons!.personId1!.journeys!.journeyId1!.visitedPlaces!
                            .workPlace1P1,
                    incompatibleConsecutiveActivities: ['home'] as Activity[]
                };
            },
            false
        ],
        [
            'next place activity is incompatible',
            (interview: typeof interviewAttributesForTestCases) => {
                setActiveVisitedPlace(interview, 'personId2', 'journeyId2', 'otherWorkPlace1P2');
                return {
                    visitedPlace:
                        interview.response.household!.persons!.personId2!.journeys!.journeyId2!.visitedPlaces!
                            .otherWorkPlace1P2,
                    incompatibleConsecutiveActivities: ['home'] as Activity[]
                };
            },
            false
        ],
        [
            'previous and next activities are not incompatible',
            (interview: typeof interviewAttributesForTestCases) => {
                setActiveVisitedPlace(interview, 'personId1', 'journeyId1', 'workPlace1P1');
                return {
                    visitedPlace:
                        interview.response.household!.persons!.personId1!.journeys!.journeyId1!.visitedPlaces!
                            .workPlace1P1,
                    incompatibleConsecutiveActivities: ['shopping'] as Activity[]
                };
            },
            true
        ],
        [
            'adjacent places have blank activities',
            (interview: typeof interviewAttributesForTestCases) => {
                setActiveVisitedPlace(interview, 'personId1', 'journeyId1', 'workPlace1P1');
                const journey = interview.response.household!.persons!.personId1!.journeys!.journeyId1!;
                journey.visitedPlaces!.homePlace1P1.activity = undefined;
                journey.visitedPlaces!.homePlace2P1.activity = undefined;
                return {
                    visitedPlace: journey.visitedPlaces!.workPlace1P1,
                    incompatibleConsecutiveActivities: ['home'] as Activity[]
                };
            },
            true
        ]
    ])('should return %s: %s', (_title, setupTest, expected) => {
        const interview = _cloneDeep(interviewAttributesForTestCases);
        const { visitedPlace, incompatibleConsecutiveActivities } = setupTest(interview);

        expect(
            helpers.validatePreviousNextPlaceIsCompatibleActivities({
                interview,
                visitedPlace,
                incompatibleConsecutiveActivities
            })
        ).toEqual(expected);
    });
});
