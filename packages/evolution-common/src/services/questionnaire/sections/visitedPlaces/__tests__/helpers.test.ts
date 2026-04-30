/*
 * Copyright 2026, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Activity, activityValues } from '../../../../odSurvey/types';
import _cloneDeep from 'lodash/cloneDeep';
import { interviewAttributesForTestCases, setActiveSurveyObjects } from '../../../../../tests/surveys';
import { homeGeographyCoordinates, workPlace1P1Coordinates } from '../../../../../tests/surveys/testCasesInterview';
import * as helpers from '../helpers';
import * as odSurveyHelpers from '../../../../odSurvey/helpers';
import { UserRuntimeInterviewAttributes, VisitedPlacesSectionConfiguration } from '../../../types';

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

describe('Visited places helpers - getShortcutVisitedPlaces', () => {
    // Helper to get person, journey and currentVisitedPlace from a cloned interview
    const getTestObjects = (
        interview: UserRuntimeInterviewAttributes,
        personId: string,
        journeyId: string,
        currentVisitedPlaceId: string
    ) => {
        const person = odSurveyHelpers.getPerson({ interview, personId })!;
        const journey = odSurveyHelpers.getJourneys({ person })[journeyId];
        const currentVisitedPlace = odSurveyHelpers.getVisitedPlaces({ journey })[currentVisitedPlaceId];
        return { person, journey, currentVisitedPlace };
    };

    /**
     * Test data overview (base interview, no usualWorkPlace/usualSchoolPlace
     * set):
     *
     * - personId1 / journeyId1:
     *   - homePlace1P1 (home, not a shortcut)
     *   - workPlace1P1 (workUsual, possible shortcut)
     *   - homePlace2P1 (home, not a shortcut) 
     *   - otherPlaceP1 (shopping, possible shortcut)
     *   - otherPlace2P1 (shopping, possible shortcut)
     *
     * - personId2 / journeyId2:
     *   - homePlace1P2 (home, not a shortcut) 
     *   - shoppingPlace1P2 (shopping, already a shortcut from personId1)
     *   - otherWorkPlace1P2 (other, possible shortcut)
     *   - homePlace2P2 (home, not a shortcut)
     *
     * - personId3 / journeyId3:
     *   - homePlace1P3 (home, not a shortcut) 
     *   - schoolPlace1P3 (schoolUsual, possible shortcut)
     *   - homePlace2P3 (home, not a shortcut)
     *
     * home activity always resolves to homeGeographyCoordinates
     * [-73.5932,45.5016] via getVisitedPlaceGeography, but home is not used as
     * a shortcut
     *
     * Base case shortcuts for homePlace1P1 as current (prev=null,
     *   next=workPlace1P1[-73,45]): workPlace1P1 excluded (coords =
     *   nextCoords); shoppingPlace1P2 excluded (shortcut set); all home places
     *   excluded; 4 shortcuts remain: otherPlaceP1(p1), otherPlace2P1(p1),
     *   otherWorkPlace1P2(p2), schoolPlace1P3(p3)
     */
    test.each([
        {
            title: 'base case: returns eligible visited places from all household members',
            setupTest: (_interview: UserRuntimeInterviewAttributes) => ({
                personId: 'personId1',
                journeyId: 'journeyId1',
                currentVisitedPlaceId: 'homePlace1P1'
            }),
            // prev=null, next=workPlace1P1([-73,45])
            // workPlace1P1 excluded (coords=nextCoords); all home/shortcut places excluded
            expectedVisitedPlaceIds: [
                'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlaceP1',
                'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlace2P1',
                'household.persons.personId2.journeys.journeyId2.visitedPlaces.otherWorkPlace1P2',
                'household.persons.personId3.journeys.journeyId3.visitedPlaces.schoolPlace1P3'
            ]
        },
        {
            title: 'includes the usual work places of a person when it has a geography',
            setupTest: (interview: UserRuntimeInterviewAttributes) => {
                interview.response.household!.persons!.personId1!.usualWorkPlace = {
                    geography: {
                        type: 'Feature',
                        geometry: { type: 'Point', coordinates: [-74, 46] },
                        properties: { lastAction: 'findPlace' }
                    }
                };
                return { personId: 'personId1', journeyId: 'journeyId1', currentVisitedPlaceId: 'homePlace1P1' };
            },
            // Usual places appear before visited places in result; workPlace1P1 excluded from visited
            // (workUsual + usualWorkPlace.geography now set for personId1)
            expectedVisitedPlaceIds: [
                'household.persons.personId1.usualWorkPlace',
                'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlaceP1',
                'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlace2P1',
                'household.persons.personId2.journeys.journeyId2.visitedPlaces.otherWorkPlace1P2',
                'household.persons.personId3.journeys.journeyId3.visitedPlaces.schoolPlace1P3'
            ]
        },
        {
            title: 'includes the usual school place of a person when it has a geography',
            setupTest: (interview: UserRuntimeInterviewAttributes) => {
                interview.response.household!.persons!.personId1!.usualSchoolPlace = {
                    geography: {
                        type: 'Feature',
                        geometry: { type: 'Point', coordinates: [-74, 46] },
                        properties: { lastAction: 'findPlace' }
                    }
                };
                return { personId: 'personId1', journeyId: 'journeyId1', currentVisitedPlaceId: 'homePlace1P1' };
            },
            // workPlace1P1 still excluded (coords=nextCoords; personId1 has no usualWorkPlace)
            expectedVisitedPlaceIds: [
                'household.persons.personId1.usualSchoolPlace',
                'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlaceP1',
                'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlace2P1',
                'household.persons.personId2.journeys.journeyId2.visitedPlaces.otherWorkPlace1P2',
                'household.persons.personId3.journeys.journeyId3.visitedPlaces.schoolPlace1P3'
            ]
        },
        {
            title: 'includes usual places from other household members',
            setupTest: (interview: UserRuntimeInterviewAttributes) => {
                interview.response.household!.persons!.personId2!.usualSchoolPlace = {
                    geography: {
                        type: 'Feature',
                        geometry: { type: 'Point', coordinates: [-74, 46] },
                        properties: { lastAction: 'findPlace' }
                    }
                };
                interview.response.household!.persons!.personId2!.usualWorkPlace = {
                    geography: {
                        type: 'Feature',
                        geometry: { type: 'Point', coordinates: [-74.1, 46.2] },
                        properties: { lastAction: 'findPlace' }
                    }
                };
                interview.response.household!.persons!.personId3!.usualWorkPlace = {
                    geography: {
                        type: 'Feature',
                        geometry: { type: 'Point', coordinates: [-74.2, 46.3] },
                        properties: { lastAction: 'findPlace' }
                    }
                };
                return { personId: 'personId1', journeyId: 'journeyId1', currentVisitedPlaceId: 'homePlace1P1' };
            },
            // Usual places loop runs over persons in sequence order (p1, p2, p3);
            // personId1 has no usual places; personId2 usual place is added first
            expectedVisitedPlaceIds: [
                'household.persons.personId2.usualWorkPlace',
                'household.persons.personId2.usualSchoolPlace',
                'household.persons.personId3.usualWorkPlace',
                'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlaceP1',
                'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlace2P1',
                'household.persons.personId2.journeys.journeyId2.visitedPlaces.otherWorkPlace1P2',
                'household.persons.personId3.journeys.journeyId3.visitedPlaces.schoolPlace1P3'
            ]
        },
        {
            title: 'excludes a schoolUsual visited place when the person has a usualSchoolPlace with geography',
            setupTest: (interview: UserRuntimeInterviewAttributes) => {
                interview.response.household!.persons!.personId3!.usualSchoolPlace = {
                    geography: {
                        type: 'Feature',
                        geometry: { type: 'Point', coordinates: [-74, 46] },
                        properties: { lastAction: 'findPlace' }
                    }
                };
                return { personId: 'personId1', journeyId: 'journeyId1', currentVisitedPlaceId: 'homePlace1P1' };
            },
            // schoolPlace1P3 (schoolUsual) excluded from visited because personId3 now has usualSchoolPlace.geography;
            // personId3 usual place replaces it in the result
            expectedVisitedPlaceIds: [
                'household.persons.personId3.usualSchoolPlace',
                'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlaceP1',
                'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlace2P1',
                'household.persons.personId2.journeys.journeyId2.visitedPlaces.otherWorkPlace1P2'
            ]
        },
        {
            title: 'includes both usual work and school places for a person when both have geographies',
            setupTest: (interview: UserRuntimeInterviewAttributes) => {
                interview.response.household!.persons!.personId1!.usualWorkPlace = {
                    geography: {
                        type: 'Feature',
                        geometry: { type: 'Point', coordinates: [-73.5, 45.5] },
                        properties: { lastAction: 'findPlace' }
                    }
                };
                interview.response.household!.persons!.personId1!.usualSchoolPlace = {
                    geography: {
                        type: 'Feature',
                        geometry: { type: 'Point', coordinates: [-73.6, 45.6] },
                        properties: { lastAction: 'findPlace' }
                    }
                };
                return { personId: 'personId1', journeyId: 'journeyId1', currentVisitedPlaceId: 'homePlace1P1' };
            },
            // workUsual added first, then schoolUsual (order in getHouseholdUsualPlacesByPersonId);
            // workPlace1P1 excluded from visited (usualWorkPlace.geography set)
            expectedVisitedPlaceIds: [
                'household.persons.personId1.usualWorkPlace',
                'household.persons.personId1.usualSchoolPlace',
                'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlaceP1',
                'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlace2P1',
                'household.persons.personId2.journeys.journeyId2.visitedPlaces.otherWorkPlace1P2',
                'household.persons.personId3.journeys.journeyId3.visitedPlaces.schoolPlace1P3'
            ]
        },
        {
            title: 'excludes usual place when its coordinates match the previous visited place',
            setupTest: (interview: UserRuntimeInterviewAttributes) => {
                // current=workPlace1P1: prev=homePlace1P1(home), next=homePlace2P1(home)
                // Both home places resolve to homeGeographyCoordinates via getVisitedPlaceGeography
                // Setting usualWorkPlace to homeGeographyCoordinates makes coords equal prevCoords → excluded
                interview.response.household!.persons!.personId1!.usualWorkPlace = {
                    geography: {
                        type: 'Feature',
                        geometry: { type: 'Point', coordinates: homeGeographyCoordinates },
                        properties: { lastAction: 'findPlace' }
                    }
                };
                return { personId: 'personId1', journeyId: 'journeyId1', currentVisitedPlaceId: 'workPlace1P1' };
            },
            // usualWorkPlace excluded (coords=prevCoords=homeGeographyCoordinates)
            // workPlace1P1 excluded (current + usualWorkPlace.geography set)
            // All non-home visited places have coords ≠ homeGeographyCoordinates → all included
            expectedVisitedPlaceIds: [
                'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlaceP1',
                'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlace2P1',
                'household.persons.personId2.journeys.journeyId2.visitedPlaces.otherWorkPlace1P2',
                'household.persons.personId3.journeys.journeyId3.visitedPlaces.schoolPlace1P3'
            ]
        },
        {
            title: 'exclude usual place when coords match next visited place',
            setupTest: (interview: UserRuntimeInterviewAttributes) => {
                // usualWorkPlace at workPlace1P1Coordinates = nextCoords for homePlace1P1
                // Excluded because same coords as next place
                interview.response.household!.persons!.personId1!.usualWorkPlace = {
                    geography: {
                        type: 'Feature',
                        geometry: { type: 'Point', coordinates: workPlace1P1Coordinates },
                        properties: { lastAction: 'findPlace' }
                    }
                };
                return { personId: 'personId1', journeyId: 'journeyId1', currentVisitedPlaceId: 'homePlace1P1' };
            },
            // usualWorkPlace excluded (coords=nextCoords=workPlace1P1Coordinates)
            // workPlace1P1 excluded (current + usualWorkPlace.geography set)
            // All non-home visited places have coords ≠ workPlace1P1Coordinates → all included
            expectedVisitedPlaceIds: [
                'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlaceP1',
                'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlace2P1',
                'household.persons.personId2.journeys.journeyId2.visitedPlaces.otherWorkPlace1P2',
                'household.persons.personId3.journeys.journeyId3.visitedPlaces.schoolPlace1P3'
            ]
        },
        {
            title: 'excludes usual place without geography',
            setupTest: (interview: UserRuntimeInterviewAttributes) => {
                interview.response.household!.persons!.personId1!.usualWorkPlace = { name: 'Workplace 1' }; // No geography
                return { personId: 'personId1', journeyId: 'journeyId1', currentVisitedPlaceId: 'homePlace1P1' };
            },
            // usualWorkPlace has no .geography → not added to usual places
            // workPlace1P1 (workUsual): person.usualWorkPlace.geography is falsy → not excluded by usual check;
            // coords=nextCoords → still excluded by coord check
            expectedVisitedPlaceIds: [
                'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlaceP1',
                'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlace2P1',
                'household.persons.personId2.journeys.journeyId2.visitedPlaces.otherWorkPlace1P2',
                'household.persons.personId3.journeys.journeyId3.visitedPlaces.schoolPlace1P3'
            ]
        },
        {
            title: 'excludes visited place already marked as a shortcut',
            setupTest: (interview: UserRuntimeInterviewAttributes) => {
                // Mark otherWorkPlace1P2 (personId2) as already a shortcut
                interview.response.household!.persons!.personId2!.journeys!.journeyId2!.visitedPlaces!.otherWorkPlace1P2.shortcut =
                    'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlaceP1';
                return { personId: 'personId1', journeyId: 'journeyId1', currentVisitedPlaceId: 'homePlace1P1' };
            },
            expectedVisitedPlaceIds: [
                'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlaceP1',
                'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlace2P1',
                'household.persons.personId3.journeys.journeyId3.visitedPlaces.schoolPlace1P3'
            ]
        },
        {
            title: 'excludes the current visited place and visited places sharing coordinates with the previous place',
            setupTest: (_interview: UserRuntimeInterviewAttributes) => ({
                personId: 'personId1',
                journeyId: 'journeyId1',
                currentVisitedPlaceId: 'otherPlace2P1'
            }),
            // current=otherPlace2P1; prev=otherPlaceP1(should be exlucded); next=null
            // otherPlaceP1: coords=prevCoords → excluded
            expectedVisitedPlaceIds: [
                'household.persons.personId1.journeys.journeyId1.visitedPlaces.workPlace1P1',
                'household.persons.personId2.journeys.journeyId2.visitedPlaces.otherWorkPlace1P2',
                'household.persons.personId3.journeys.journeyId3.visitedPlaces.schoolPlace1P3'
            ]
        },
        {
            title: 'excludes visited places sharing coordinates with the next place',
            setupTest: (_interview: UserRuntimeInterviewAttributes) => ({
                personId: 'personId1',
                journeyId: 'journeyId1',
                currentVisitedPlaceId: 'homePlace2P1'
            }),
            // current=homePlace2P1; prev=workPlace1P1; next=otherPlaceP1
            // workPlace1P1: coords=prevCoords
            // otherPlaceP1: coords=nextCoords
            expectedVisitedPlaceIds: [
                'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlace2P1',
                'household.persons.personId2.journeys.journeyId2.visitedPlaces.otherWorkPlace1P2',
                'household.persons.personId3.journeys.journeyId3.visitedPlaces.schoolPlace1P3'
            ]
        }
    ])(
        'getShortcutVisitedPlaces: $title',
        ({ setupTest, expectedVisitedPlaceIds }) => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            const { personId, journeyId, currentVisitedPlaceId } = setupTest(interview);
            const { person, journey, currentVisitedPlace } = getTestObjects(
                interview, personId, journeyId, currentVisitedPlaceId
            );

            const shortcuts = helpers.getShortcutVisitedPlaces({
                interview,
                journey,
                person,
                currentVisitedPlace
            });

            expect(shortcuts.map(s => s.visitedPlacePath)).toEqual(expectedVisitedPlaceIds);
        }
    );

    test('getShortcutVisitedPlaces returns the correct person reference for each shortcut', () => {
        const interview = _cloneDeep(interviewAttributesForTestCases);
        const { person, journey, currentVisitedPlace } = getTestObjects(
            interview, 'personId1', 'journeyId1', 'homePlace1P1'
        );

        const shortcuts = helpers.getShortcutVisitedPlaces({
            interview, journey, person, currentVisitedPlace
        });

        // Base case: otherPlaceP1(p1), otherPlace2P1(p1), otherWorkPlace1P2(p2), schoolPlace1P3(p3)
        expect(shortcuts).toHaveLength(4);
        expect(shortcuts[0].person._uuid).toBe('personId1'); // otherPlaceP1
        expect(shortcuts[1].person._uuid).toBe('personId1'); // otherPlace2P1
        expect(shortcuts[2].person._uuid).toBe('personId2'); // otherWorkPlace1P2
        expect(shortcuts[3].person._uuid).toBe('personId3'); // schoolPlace1P3
    });

    test('getShortcutVisitedPlaces correctly constructs visitedPlaceId path for usual places', () => {
        // Add a workplace for personId1 and a school place for personId2
        const interview = _cloneDeep(interviewAttributesForTestCases);
        interview.response.household!.persons!.personId1!.usualWorkPlace = {
            geography: {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [-73.5, 45.5] },
                properties: { lastAction: 'findPlace' }
            }
        };
        interview.response.household!.persons!.personId2!.usualSchoolPlace = {
            geography: {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [-73.5, 45.5] },
                properties: { lastAction: 'findPlace' }
            }
        };
        const { person, journey, currentVisitedPlace } = getTestObjects(
            interview, 'personId1', 'journeyId1', 'homePlace1P1'
        );

        const shortcuts = helpers.getShortcutVisitedPlaces({
            interview, journey, person, currentVisitedPlace
        });

        // Usual places are added before visited places; personId1 usual work place is index 0 and personId2 usual school place is index 1
        expect(shortcuts[0].visitedPlacePath).toBe('household.persons.personId1.usualWorkPlace');
        expect(shortcuts[0].visitedPlace.activity).toBe('workUsual');
        expect(shortcuts[1].visitedPlacePath).toBe('household.persons.personId2.usualSchoolPlace');
        expect(shortcuts[1].visitedPlace.activity).toBe('schoolUsual');
    });

    test('getShortcutVisitedPlaces correctly constructs visitedPlaceId paths for visited places', () => {
        const interview = _cloneDeep(interviewAttributesForTestCases);
        const { person, journey, currentVisitedPlace } = getTestObjects(
            interview, 'personId1', 'journeyId1', 'homePlace1P1'
        );

        const shortcuts = helpers.getShortcutVisitedPlaces({
            interview, journey, person, currentVisitedPlace
        });

        const otherPlace2P1Shortcut = shortcuts.find(s => s.visitedPlace._uuid === 'otherPlace2P1');
        expect(otherPlace2P1Shortcut).toBeDefined();
        expect(otherPlace2P1Shortcut!.visitedPlacePath).toBe(
            'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlace2P1'
        );

        const schoolPlace1P3Shortcut = shortcuts.find(s => s.visitedPlace._uuid === 'schoolPlace1P3');
        expect(schoolPlace1P3Shortcut).toBeDefined();
        expect(schoolPlace1P3Shortcut!.visitedPlacePath).toBe(
            'household.persons.personId3.journeys.journeyId3.visitedPlaces.schoolPlace1P3'
        );
    });

    test('getShortcutVisitedPlaces returns empty array when there are no household members', () => {
        const interview = _cloneDeep(interviewAttributesForTestCases);
        // Collect references before clearing household so we can still call the function
        const { person, journey, currentVisitedPlace } = getTestObjects(
            interview, 'personId1', 'journeyId1', 'homePlace1P1'
        );
        interview.response.household!.persons = {};

        const shortcuts = helpers.getShortcutVisitedPlaces({
            interview, journey, person, currentVisitedPlace
        });

        expect(shortcuts).toHaveLength(0);
    });

    test('getShortcutVisitedPlaces returns empty array when persons have no visited places', () => {
        const interview = _cloneDeep(interviewAttributesForTestCases);
        // Collect references before clearing household so we can still call the function
        const { person, journey, currentVisitedPlace } = getTestObjects(
            interview, 'personId1', 'journeyId1', 'homePlace1P1'
        );
        Object.keys(interview.response.household!.persons!).forEach(personId => {
            const person = interview.response.household!.persons![personId]!;
            Object.keys(person.journeys!).forEach(journeyId => {
                const journey = person.journeys![journeyId]!;
                journey.visitedPlaces = {};
            });
        });

        const shortcuts = helpers.getShortcutVisitedPlaces({
            interview, journey, person, currentVisitedPlace
        });

        expect(shortcuts).toHaveLength(0);
    });

    test('getShortcutVisitedPlaces should include places from other journeys of the same person', () => {
        const interview = _cloneDeep(interviewAttributesForTestCases);

        // Setup new journeys for personId1 and personId2 with various visited places
        const journeyId2P1 = {
            _uuid: 'journeyId2P1',
            _sequence: 2,
            visitedPlaces: {
                journey2P1Place1: {
                    _uuid: 'journey2P1Place1',
                    _sequence: 1,
                    activity: 'shopping' as const,
                    geography: {
                        type: 'Feature' as const,
                        geometry: { type: 'Point' as const, coordinates: [-73.5, 45.5] },
                        properties: { lastAction: 'findPlace' as const }
                    }
                },
                journey2P1Place2: {
                    _uuid: 'journey2P1Place2',
                    _sequence: 2,
                    activity: 'workNotUsual' as const,
                    geography: {
                        type: 'Feature' as const,
                        geometry: { type: 'Point' as const, coordinates: [-73.6, 45.5] },
                        properties: { lastAction: 'findPlace' as const }
                    }
                },
                journey2P1Place3: {
                    _uuid: 'journey2P1Place3',
                    _sequence: 3,
                    activity: 'workOnTheRoad' as const,
                }
            }
        };
        const journeyId2P2 = {
            _uuid: 'journeyId2P2',
            _sequence: 2,
            visitedPlaces: {
                journey2P2Place1: {
                    _uuid: 'journey2P2Place1',
                    _sequence: 1,
                    activity: 'home' as const
                },
                journey2P2Place2: {
                    _uuid: 'journey2P2Place2',
                    _sequence: 2,
                    activity: 'restaurant' as const,
                    geography: {
                        type: 'Feature' as const,
                        geometry: { type: 'Point' as const, coordinates: [-73.4, 45.5] },
                        properties: { lastAction: 'findPlace' as const }
                    }
                },
                journey2P2Place3: {
                    _uuid: 'journey2P2Place3',
                    _sequence: 3,
                    activity: 'worship' as const,
                    geography: {
                        type: 'Feature' as const,
                        geometry: { type: 'Point' as const, coordinates: [-73.3, 45.5] },
                        properties: { lastAction: 'findPlace' as const }
                    }
                }
            }
        }
        interview.response.household!.persons!.personId1!.journeys! = {
            ...interview.response.household!.persons!.personId1!.journeys!,
            journeyId2P1: journeyId2P1
        };
        interview.response.household!.persons!.personId2!.journeys! = {
            ...interview.response.household!.persons!.personId2!.journeys!,
            journeyId2P2: journeyId2P2
        };
        const { person, journey, currentVisitedPlace } = getTestObjects(
            interview, 'personId1', 'journeyId1', 'homePlace1P1'
        );

        const shortcuts = helpers.getShortcutVisitedPlaces({
            interview, journey, person, currentVisitedPlace
        });

        // Expected shortcuts:
        const expectedVisitedPlaceIds = [
            'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlaceP1',
            'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlace2P1',
            'household.persons.personId1.journeys.journeyId2P1.visitedPlaces.journey2P1Place1',
            'household.persons.personId1.journeys.journeyId2P1.visitedPlaces.journey2P1Place2',
            'household.persons.personId2.journeys.journeyId2.visitedPlaces.otherWorkPlace1P2',
            'household.persons.personId2.journeys.journeyId2P2.visitedPlaces.journey2P2Place2',
            'household.persons.personId2.journeys.journeyId2P2.visitedPlaces.journey2P2Place3',
            'household.persons.personId3.journeys.journeyId3.visitedPlaces.schoolPlace1P3'
        ]
        expect(shortcuts.map(s => s.visitedPlacePath)).toEqual(expectedVisitedPlaceIds);
    });
});

describe('Visited places helpers - validatePreviousNextPlaceIsNotActivities', () => {

    test('should warn and return true when there is no active journey', () => {
        const interview = _cloneDeep(interviewAttributesForTestCases);
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        // use a path that won't resolve to existing context
        const path = 'household.persons.personId1.journeys.journeyId2.visitedPlaces.workPlace1P1';

        expect(
            helpers.validatePreviousNextPlaceIsCompatibleActivities({
                interview,
                path,
                incompatibleConsecutiveActivities: ['home']
            })
        ).toEqual(true);
        expect(consoleWarnSpy).toHaveBeenCalled();

        consoleWarnSpy.mockRestore();
    });

    test.each([
        {
            title: 'previous place activity is incompatible',
            setupTest: (interview: UserRuntimeInterviewAttributes) => {
                setActiveSurveyObjects(interview, { personId: 'personId1', journeyId: 'journeyId1', visitedPlaceId: 'workPlace1P1' });
                return {
                    path: 'household.persons.personId1.journeys.journeyId1.visitedPlaces.workPlace1P1.someField',
                    incompatibleConsecutiveActivities: ['home'] as Activity[]
                };
            },
            expected: false
        },
        {
            title: 'next place activity is incompatible',
            setupTest: (interview: UserRuntimeInterviewAttributes) => {
                setActiveSurveyObjects(interview, { personId: 'personId2', journeyId: 'journeyId2', visitedPlaceId: 'otherWorkPlace1P2' });
                return {
                    path: 'household.persons.personId2.journeys.journeyId2.visitedPlaces.otherWorkPlace1P2.someField',
                    incompatibleConsecutiveActivities: ['home'] as Activity[]
                };
            },
            expected: false
        },
        {
            title: 'previous and next activities are not incompatible',
            setupTest: (interview: UserRuntimeInterviewAttributes) => {
                setActiveSurveyObjects(interview, { personId: 'personId1', journeyId: 'journeyId1', visitedPlaceId: 'workPlace1P1' });
                return {
                    path: 'household.persons.personId1.journeys.journeyId1.visitedPlaces.workPlace1P1.someField',
                    incompatibleConsecutiveActivities: ['shopping'] as Activity[]
                };
            },
            expected: true
        },
        {
            title: 'adjacent places have blank activities',
            setupTest: (interview: UserRuntimeInterviewAttributes) => {
                setActiveSurveyObjects(interview, { personId: 'personId1', journeyId: 'journeyId1', visitedPlaceId: 'workPlace1P1' });
                const journey = interview.response.household!.persons!.personId1!.journeys!.journeyId1!;
                journey.visitedPlaces!.homePlace1P1.activity = undefined;
                journey.visitedPlaces!.homePlace2P1.activity = undefined;
                return {
                    path: 'household.persons.personId1.journeys.journeyId1.visitedPlaces.workPlace1P1.someField',
                    incompatibleConsecutiveActivities: ['home'] as Activity[]
                };
            },
            expected: true
        }
    ])('should return $title: $expected', ({ setupTest, expected}) => {
        const interview = _cloneDeep(interviewAttributesForTestCases);
        const { path, incompatibleConsecutiveActivities } = setupTest(interview);

        expect(
            helpers.validatePreviousNextPlaceIsCompatibleActivities({
                interview,
                path,
                incompatibleConsecutiveActivities
            })
        ).toEqual(expected);
    });
});
