/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _cloneDeep from 'lodash/cloneDeep';
import _shuffle from 'lodash/shuffle';
import {  SectionConfigWithDefaultsBlock, SurveySections, UserRuntimeInterviewAttributes, getAndValidateSurveySections } from '../../types';
import { createNavigationService } from '../NavigationService';

jest.mock('lodash/shuffle', () => ({
    __esModule: true,
    default: jest.fn((array) => array)
}));
const mockShuffle = _shuffle as jest.MockedFunction<typeof _shuffle>;

// TODO Add a basic interview object
const interview: UserRuntimeInterviewAttributes = {
    id: 1,
    uuid: 'uuid',
    participant_id: 1,
    is_completed: false,
    response: { },
    validations: { },
    is_valid: false,
    // These are widgets statuses for the current section, if they are not grouped
    widgets: { },
    // These are the widget status for the groups in the current section
    groups: { },
    // Contains the paths in the responses of the visible widgets... FIXME Rename?
    visibleWidgets: [],
    allWidgetsValid: true,
    // Name of the currently loaded section
    sectionLoaded: undefined
}

beforeEach(() => {
    jest.clearAllMocks();
});

// Define a simple navigation for tests
const hhSectionEnabled = jest.fn().mockReturnValue(true);
const hhSectionCompleted = jest.fn().mockReturnValue(true);
const homeSectionCompleted = jest.fn().mockReturnValue(true);
const hhShouldSectionBeVisible = jest.fn().mockReturnValue(true);
const simpleSectionsConfig: SurveySections = getAndValidateSurveySections({
    home: {
        title: 'Home',
        previousSection: null,
        nextSection: 'householdMembers',
        widgets: ['homeWidget'],
        isSectionCompleted: homeSectionCompleted
    },
    householdMembers: {
        title: 'Household members',
        previousSection: 'home',
        nextSection: 'end',
        widgets: ['hhWidget'],
        isSectionVisible: hhShouldSectionBeVisible,
        isSectionCompleted: hhSectionCompleted,
        enableConditional: hhSectionEnabled
    },
    end: {
        title: 'End',
        previousSection: 'householdMembers',
        nextSection: null,
        widgets: ['endWidget']
    }
});

// Define a navigation with repeated blocks
const tbIsSectionVisible = jest.fn().mockReturnValue(true);
const tbIsSectionEnabled = jest.fn().mockReturnValue(true);
const tripsIsEnabled = jest.fn().mockReturnValue(true);
const complexSectionsConfig: SurveySections = getAndValidateSurveySections({
    home: {
        title: 'Home',
        previousSection: null,
        nextSection: 'householdMembers',
        widgets: ['homeWidget']
    },
    householdMembers: {
        title: 'Household members',
        previousSection: 'home',
        nextSection: 'personsTrips',
        widgets: ['hhWidget']
    },
    personsTrips: {
        title: 'Trips',
        previousSection: 'householdMembers',
        nextSection: 'end',
        widgets: ['hhWidget'],
        enableConditional: tripsIsEnabled,
        repeatedBlock: {
            iterationRule: { type: 'builtin', path: 'interviewablePersons' },
            activeSurveyObjectPath: '_activePersonId',
            sections: ['selectPerson', 'visitedPlaces', 'travelBehavior'],
            selectionSectionId: 'selectPerson',
            skipSelectionInNaturalFlow: true
        }
    },
    selectPerson: {
        title: 'Select person',
        previousSection: 'personsTrips',
        nextSection: 'visitedPlaces',
        widgets: ['hhWidget']
    },
    visitedPlaces: {
        title: 'Visited places',
        previousSection: 'selectPerson',
        nextSection: 'travelBehavior',
        widgets: ['hhWidget']
    },
    travelBehavior: {
        title: 'Travel behavior',
        previousSection: 'visitedPlaces',
        nextSection: 'personsTrips',
        widgets: ['hhWidget'],
        isSectionVisible: tbIsSectionVisible,
        enableConditional: tbIsSectionEnabled
    },
    end: {
        title: 'End',
        previousSection: 'personsTrips',
        nextSection: null,
        widgets: ['endWidget']
    }
});
const hhWithPersonsResponse = {
    household: {
        persons: {
            personId1: {
                _uuid: 'personId1',
                _sequence: 1,
                age: 30
            },
            personId2: {
                _uuid: 'personId2',
                _sequence: 2,
                age: 35
            },
            personId3: {
                _uuid: 'personId3',
                _sequence: 3,
                age: 3
            }
        }
    }
};

describe('Simple direct navigation, each section in nav bar', () => {

    const navigationService = createNavigationService(simpleSectionsConfig);

    describe('initNavigationState',() => {
        test('should navigate to first section when no previous navigation', () => {
            const expectedSection = 'home';

            // Navigate to the first section
            const nextSectionResult = navigationService.initNavigationState({ interview });
            expect(nextSectionResult).toEqual({
                targetSection: {
                    sectionShortname: expectedSection,
                    iterationContext: undefined
                }
            });
        });

        test('should navigate to last visited section if there are previous navigations', () => {
            const expectedSection = 'householdMembers';

            // Prepare the interview with section navigation history
            const testInterview = _cloneDeep(interview);
            // FIXME The type of the _sections is not quite right, this should be valid but it is not
            testInterview.response._sections = {
                home: { _startedAt: 1, _isCompleted: true },
                householdMembers: { _startedAt: 2 },
                _actions: [
                    { section: 'home', action: 'start' as const, ts: 1 },
                    { section: 'householdMembers', action: 'start' as const, ts: 2 },
                ]
            } as any;

            // Navigate to last visited section
            const nextSectionResult = navigationService.initNavigationState({ interview: testInterview });
            expect(nextSectionResult).toEqual({
                targetSection: {
                    sectionShortname: expectedSection,
                    iterationContext: undefined
                }
            });
        });

        test('should navigate to requested section, even with previous navigations that reaches later', () => {
            const requestedSection = 'householdMembers';
            const expectedSection = 'householdMembers';

            // Prepare the interview with section navigation history
            const testInterview = _cloneDeep(interview);
            // FIXME The type of the _sections is not quite right, this should be valid but it is not
            testInterview.response._sections = {
                home: { _startedAt: 1, _isCompleted: true },
                householdMembers: { _startedAt: 2, _isCompleted: true },
                end: { _startedAt: 3 },
                _actions: [
                    { section: 'home', action: 'start' as const, ts: 1 },
                    { section: 'householdMembers', action: 'start' as const, ts: 2 },
                    { section: 'end', action: 'start' as const, ts: 3 },
                ]
            } as any;

            // Navigate to the requested section
            const nextSectionResult = navigationService.initNavigationState({ interview: testInterview, requestedSection});
            expect(nextSectionResult).toEqual({
                targetSection: {
                    sectionShortname: expectedSection,
                    iterationContext: undefined
                }
            });
        });

        test('should navigate to last possible section if requested section is not enabled yet, using default enable', () => {
            const requestedSection = 'end';
            const expectedSection = 'householdMembers';

            // Let the previous section completion conditional return `false` so end section cannot be reached
            hhSectionCompleted.mockReturnValueOnce(false);

            // Prepare the interview with section navigation history
            const testInterview = _cloneDeep(interview);
            // FIXME The type of the _sections is not quite right, this should be valid but it is not
            testInterview.response._sections = {
                home: { _startedAt: 1, _isCompleted: true },
                householdMembers: { _startedAt: 2 },
                _actions: [
                    { section: 'home', action: 'start' as const, ts: 1 },
                    { section: 'householdMembers', action: 'start' as const, ts: 2 },
                ]
            } as any;

            // Navigate to a specific section
            const nextSectionResult = navigationService.initNavigationState({ interview: testInterview, requestedSection });
            expect(nextSectionResult).toEqual({
                targetSection: {
                    sectionShortname: expectedSection,
                    iterationContext: undefined
                }
            });
            // The completion conditional of the previous section should have been called
            expect(hhSectionCompleted).toHaveBeenCalledWith(testInterview, undefined);
        });

        test('should navigate to last possible section if requested section is not enabled yet, using enableConditional', () => {
            const requestedSection = 'householdMembers';
            const expectedSection = 'home';

            // Let the enable conditional return `false` so the section cannot be started
            hhSectionEnabled.mockReturnValueOnce(false);

            // Prepare the interview with section navigation history
            const testInterview = _cloneDeep(interview);
            // FIXME The type of the _sections is not quite right, this should be valid but it is not
            testInterview.response._sections = {
                home: { _startedAt: 1, _isCompleted: true },
                householdMembers: { _startedAt: 2 },
                _actions: [
                    { section: 'home', action: 'start' as const, ts: 1 },
                    { section: 'householdMembers', action: 'start' as const, ts: 2 },
                ]
            } as any;

            // Navigate to a specific section
            const nextSectionResult = navigationService.initNavigationState({ interview: testInterview, requestedSection });
            expect(nextSectionResult).toEqual({
                targetSection: {
                    sectionShortname: expectedSection,
                    iterationContext: undefined
                }
            });
            // The completion conditional of the previous section should have been called
            expect(hhSectionEnabled).toHaveBeenCalledWith(testInterview, 'householdMembers', undefined);
        });

        test('should recursively navigate to last possible section if previous sections not enabled yet, using default enable', () => {
            const requestedSection = 'end';
            const expectedSection = 'home';

            // Let the householdMembers section return false for both enabled and completed, to recursively go back to home section
            hhSectionCompleted.mockReturnValueOnce(false);
            hhSectionEnabled.mockReturnValueOnce(false);

            // Prepare the interview with section navigation history
            const testInterview = _cloneDeep(interview);
            // FIXME The type of the _sections is not quite right, this should be valid but it is not
            testInterview.response._sections = {
                home: { _startedAt: 1, _isCompleted: true },
                householdMembers: { _startedAt: 2 },
                _actions: [
                    { section: 'home', action: 'start' as const, ts: 1 },
                    { section: 'householdMembers', action: 'start' as const, ts: 2 },
                ]
            } as any;

            // Navigate to requested section
            const nextSectionResult = navigationService.initNavigationState({ interview: testInterview, requestedSection });
            expect(nextSectionResult).toEqual({
                targetSection: {
                    sectionShortname: expectedSection,
                    iterationContext: undefined
                }
            });
            // The completion conditional of the previous section should have been called
            expect(hhSectionCompleted).toHaveBeenCalledWith(testInterview, undefined);
        });

    });

    describe('Navigate function', () => {
        
        test('should navigate to the next section forward', () => {
            const currentSection = 'home';
            const expectedSection = 'householdMembers';

            // Prepare the interview with section navigation history
            const testInterview = _cloneDeep(interview);
            // FIXME The type of the _sections is not quite right, this should be valid but it is not
            testInterview.response._sections = {
                home: { _startedAt: 1, _isCompleted: true },
                _actions: [
                    { section: 'home', action: 'start' as const, ts: 1 },
                ]
            } as any;

            // Prepare the previous navigation state
            const currentSectionData = {
                sectionShortname: currentSection,
                iterationContext: undefined
            }

            // Navigate to specific section
            const nextSectionResult = navigationService.navigate({
                interview: testInterview,
                currentSection: _cloneDeep(currentSectionData),
                direction: 'forward'
            });
            expect(nextSectionResult).toEqual({
                targetSection: {
                    sectionShortname: expectedSection,
                    iterationContext: undefined
                }
            });
        });

        test('should stay on page if navigating forward but section incomplete', () => {
            const currentSection = 'home';
            const expectedSection = 'home';
            homeSectionCompleted.mockReturnValueOnce(false);

            // Prepare the interview with section navigation history
            const testInterview = _cloneDeep(interview);
            // FIXME The type of the _sections is not quite right, this should be valid but it is not
            testInterview.response._sections = {
                home: { _startedAt: 1, _isCompleted: true },
                _actions: [
                    { section: 'home', action: 'start' as const, ts: 1 },
                ]
            } as any;

            // Prepare the previous navigation state
            const currentSectionData = {
                sectionShortname: currentSection,
                iterationContext: undefined
            }

            // Navigate to specific section
            const nextSectionResult = navigationService.navigate({
                interview: testInterview,
                currentSection: _cloneDeep(currentSectionData),
                direction: 'forward'
            });
            expect(nextSectionResult).toEqual({
                targetSection: {
                    sectionShortname: expectedSection,
                    iterationContext: undefined
                }
            });
        });

        test('should navigate to the next section backward', () => {
            const currentSection = 'householdMembers';
            const expectedSection = 'home';

            // Prepare the interview with section navigation history
            const testInterview = _cloneDeep(interview);
            // FIXME The type of the _sections is not quite right, this should be valid but it is not
            testInterview.response._sections = {
                home: { _startedAt: 1, _isCompleted: true },
                householdMembers: { _startedAt: 2 },
                _actions: [
                    { section: 'home', action: 'start' as const, ts: 1 },
                    { section: 'householdMembers', action: 'start' as const, ts: 2 },
                ]
            } as any;

            // Prepare the previous navigation state
            const currentSectionData = {
                sectionShortname: currentSection,
                iterationContext: undefined
            }

            // Navigate to specific section
            const nextSectionResult = navigationService.navigate({
                interview: testInterview,
                currentSection: _cloneDeep(currentSectionData),
                direction: 'backward'
            });
            expect(nextSectionResult).toEqual({
                targetSection: {
                    sectionShortname: expectedSection,
                    iterationContext: undefined
                }
            });
        });

        test('should navigate to the next section backward, even if current section is incomplete', () => {
            const currentSection = 'householdMembers';
            const expectedSection = 'home';

            // Prepare the interview with section navigation history
            const testInterview = _cloneDeep(interview);
            // FIXME The type of the _sections is not quite right, this should be valid but it is not
            testInterview.response._sections = {
                home: { _startedAt: 1, _isCompleted: true },
                householdMembers: { _startedAt: 2 },
                _actions: [
                    { section: 'home', action: 'start' as const, ts: 1 },
                    { section: 'householdMembers', action: 'start' as const, ts: 2 },
                ]
            } as any;

            // Prepare the previous navigation state
            const currentSectionData = {
                sectionShortname: currentSection,
                iterationContext: undefined
            }

            // Navigate to specific section
            const nextSectionResult = navigationService.navigate({
                interview: testInterview,
                currentSection: _cloneDeep(currentSectionData),
                direction: 'backward'
            });
            expect(nextSectionResult).toEqual({
                targetSection: {
                    sectionShortname: expectedSection,
                    iterationContext: undefined
                }
            });
            // Should not verify completion is going to previous section
            expect(hhSectionCompleted).not.toHaveBeenCalled();
        });

        test('should remain in last section when navigating forward in last section', () => {
            const currentSection = 'end';
            const expectedSection = 'end';

            // Prepare the interview with section navigation history
            const testInterview = _cloneDeep(interview);
            // FIXME The type of the _sections is not quite right, this should be valid but it is not
            testInterview.response._sections = {
                home: { _startedAt: 1, _isCompleted: true },
                householdMembers: { _startedAt: 2, _isCompleted: true },
                end: { _startedAt: 4 },
                _actions: [
                    { section: 'home', action: 'start' as const, ts: 1 },
                    { section: 'householdMembers', action: 'start' as const, ts: 2 },
                    { section: 'end', action: 'start' as const, ts: 4 },
                ]
            } as any;

            // Prepare the previous navigation state
            const currentSectionData = {
                sectionShortname: currentSection,
                iterationContext: undefined
            }

            // Navigate to specific section
            const nextSectionResult = navigationService.navigate({
                interview: testInterview,
                currentSection: _cloneDeep(currentSectionData),
                direction: 'forward'
            });
            expect(nextSectionResult).toEqual({
                targetSection: {
                    sectionShortname: expectedSection,
                    iterationContext: undefined
                }
            });
        });

        test('should skip section if section is marked as such', () => {
            const currentSection = 'home';
            const expectedSection = 'end';
            // HouseholdMembers section should be skipped
            hhShouldSectionBeVisible.mockReturnValueOnce(false);

             // Prepare the interview with section navigation history
            const testInterview = _cloneDeep(interview);
            // FIXME The type of the _sections is not quite right, this should be valid but it is not
            testInterview.response._sections = {
                home: { _startedAt: 1, _isCompleted: true },
                householdMembers: { _startedAt: 2, _isCompleted: true },
                end: { _startedAt: 4 },
                _actions: [
                    { section: 'home', action: 'start' as const, ts: 1 },
                    { section: 'householdMembers', action: 'start' as const, ts: 2 },
                    { section: 'end', action: 'start' as const, ts: 4 },
                    { section: 'home', action: 'start' as const, ts: 8 },
                ]
            } as any;

            // Prepare the previous navigation state
            const currentSectionData = {
                sectionShortname: currentSection,
                iterationContext: undefined
            }

            // Navigate to specific section
            const nextSectionResult = navigationService.navigate({
                interview: testInterview,
                currentSection: _cloneDeep(currentSectionData),
                direction: 'forward'
            });
            expect(hhShouldSectionBeVisible).toHaveBeenCalledWith(testInterview, undefined);
            expect(hhSectionCompleted).toHaveBeenCalledWith(testInterview, undefined);
            expect(nextSectionResult).toEqual({
                targetSection: {
                    sectionShortname: expectedSection,
                    iterationContext: undefined
                }
            });
        });
    })

});

describe('With repeated sections per household members, skipping select in natural flow', () => {

    const navigationService = createNavigationService(complexSectionsConfig);

    describe('initNavigationState',() => {
        test('should navigate to first section when no previous navigation', () => {
            const expectedSection = 'home';

            // Navigate to the first section
            const nextSectionResult = navigationService.initNavigationState({ interview });
            expect(nextSectionResult).toEqual({
                targetSection: {
                    sectionShortname: expectedSection,
                    iterationContext: undefined
                }
            });
        });

        test('should navigate to last visited section if there are previous navigations, section not repeated', () => {
            const expectedSection = 'end';
            
            // Prepare the interview with section navigation history
            const testInterview = _cloneDeep(interview);
            // FIXME The type of the _sections is not quite right, this should be valid but it is not
            testInterview.response._sections = {
                home: { _startedAt: 1, _isCompleted: true },
                householdMembers: { _startedAt: 2, _isCompleted: true },
                personsTrips: {
                    _startedAt: 6,
                    _isCompleted: true,
                    personId1: { _startedAt: 6, _isCompleted: true },
                    personId2: { _startedAt: 22, _isCompleted: true }
                },
                selectPerson: {
                    _startedAt: 9,
                    _isCompleted: true,
                    personId1: { _startedAt: 9, _isCompleted: true },
                    personId2: { _startedAt: 24, _isCompleted: true }
                },
                visitedPlaces: {
                    _startedAt: 12,
                    _isCompleted: true,
                    personId1: { _startedAt: 12, _isCompleted: true },
                    personId2: { _startedAt: 28, _isCompleted: true }
                },
                travelBehavior: {
                    _startedAt: 20,
                    _isCompleted: true,
                    personId1: { _startedAt: 20, _isCompleted: true },
                    personId2: { _startedAt: 32, _isCompleted: true }
                },
                end: { startedAt: 50 },
                _actions: [
                    { section: 'home', action: 'start' as const, ts: 1 },
                    { section: 'householdMembers', action: 'start' as const, ts: 2 },
                    { section: 'personsTrips', iterationContext: ['personId1'], action: 'start' as const, ts: 6 },
                    { section: 'selectPerson', iterationContext: ['personId1'], action: 'start' as const, ts: 9 },
                    { section: 'visitedPlaces', iterationContext: ['personId1'], action: 'start' as const, ts: 12 },
                    { section: 'travelBehavior', iterationContext: ['personId1'], action: 'start' as const, ts: 20 },
                    { section: 'personsTrips', iterationContext: ['personId2'], action: 'start' as const, ts: 22 },
                    { section: 'selectPerson', iterationContext: ['personId2'], action: 'start' as const, ts: 24 },
                    { section: 'visitedPlaces', iterationContext: ['personId2'], action: 'start' as const, ts: 28 },
                    { section: 'travelBehavior', iterationContext: ['personId2'], action: 'start' as const, ts: 32 },
                    { section: 'end', action: 'start' as const, ts: 50 },
                ]
            } as any;
            Object.assign(testInterview.response, hhWithPersonsResponse);

            // Navigate to last visited section
            const nextSectionResult = navigationService.initNavigationState({ interview: testInterview });
            expect(nextSectionResult).toEqual({
                targetSection: {
                    sectionShortname: expectedSection,
                    iterationContext: undefined
                }
            });
        });

        test('should navigate to last visited section with correctly activated object if there are previous navigations', () => {
            const expectedSection = 'visitedPlaces';
            
            // Prepare the interview with section navigation history
            const testInterview = _cloneDeep(interview);
            // FIXME The type of the _sections is not quite right, this should be valid but it is not
            testInterview.response._sections = {
                home: { _startedAt: 1, _isCompleted: true },
                householdMembers: { _startedAt: 2, _isCompleted: true },
                personsTrips: {
                    _startedAt: 6,
                    _isCompleted: true,
                    personId1: { _startedAt: 6, _isCompleted: true },
                    personId2: { _startedAt: 22, _isCompleted: true }
                },
                selectPerson: {
                    _startedAt: 9,
                    _isCompleted: true,
                    personId1: { _startedAt: 9, _isCompleted: true },
                    personId2: { _startedAt: 24, _isCompleted: true }
                },
                visitedPlaces: {
                    _startedAt: 12,
                    _isCompleted: true,
                    personId1: { _startedAt: 12, _isCompleted: true },
                    personId2: { _startedAt: 28 }
                },
                travelBehavior: {
                    _startedAt: 20,
                    _isCompleted: true,
                    personId1: { _startedAt: 20, _isCompleted: true }
                },
                _actions: [
                    { section: 'home', action: 'start' as const, ts: 1 },
                    { section: 'householdMembers', action: 'start' as const, ts: 2 },
                    { section: 'personsTrips', iterationContext: ['personId1'], action: 'start' as const, ts: 6 },
                    { section: 'selectPerson', iterationContext: ['personId1'], action: 'start' as const, ts: 9 },
                    { section: 'visitedPlaces', iterationContext: ['personId1'], action: 'start' as const, ts: 12 },
                    { section: 'travelBehavior', iterationContext: ['personId1'], action: 'start' as const, ts: 20 },
                    { section: 'personsTrips', iterationContext: ['personId2'], action: 'start' as const, ts: 22 },
                    { section: 'selectPerson', iterationContext: ['personId2'], action: 'start' as const, ts: 24 },
                    { section: 'visitedPlaces', iterationContext: ['personId2'], action: 'start' as const, ts: 28 }
                ]
            } as any;
            Object.assign(testInterview.response, hhWithPersonsResponse);

            // Navigate to last visited section
            const nextSectionResult = navigationService.initNavigationState({ interview: testInterview });
            expect(nextSectionResult).toEqual({
                targetSection: {
                    sectionShortname: expectedSection,
                    iterationContext: ['personId2']
                },
                valuesByPath: { 'response._activePersonId': 'personId2' }
            });
        });

        test('should navigate to last incomplete section for activated object if requested section in a repeated block but not enabled', () => {
            const requestedSection = 'travelBehavior';
            const expectedSection = 'visitedPlaces';
            
            // Prepare the interview with section navigation history and a household
            const testInterview = _cloneDeep(interview);
            // FIXME The type of the _sections is not quite right, this should be valid but it is not
            testInterview.response._sections = {
                home: { _startedAt: 1, _isCompleted: true },
                householdMembers: { _startedAt: 2, _isCompleted: true },
                personsTrips: {
                    _startedAt: 6,
                    _isCompleted: true,
                    personId1: { _startedAt: 6, _isCompleted: true },
                    personId2: { _startedAt: 22, _isCompleted: true }
                },
                selectPerson: {
                    _startedAt: 9,
                    _isCompleted: true,
                    personId1: { _startedAt: 9, _isCompleted: true },
                    personId2: { _startedAt: 24, _isCompleted: true }
                },
                visitedPlaces: {
                    _startedAt: 12,
                    _isCompleted: true,
                    personId1: { _startedAt: 12, _isCompleted: true },
                    personId2: { _startedAt: 28 }
                },
                travelBehavior: {
                    _startedAt: 20,
                    _isCompleted: true,
                    personId1: { _startedAt: 20, _isCompleted: true }
                },
                _actions: [
                    { section: 'home', action: 'start' as const, ts: 1 },
                    { section: 'householdMembers', action: 'start' as const, ts: 2 },
                    { section: 'personsTrips', iterationContext: ['personId1'], action: 'start' as const, ts: 6 },
                    { section: 'selectPerson', iterationContext: ['personId1'], action: 'start' as const, ts: 9 },
                    { section: 'visitedPlaces', iterationContext: ['personId1'], action: 'start' as const, ts: 12 },
                    { section: 'travelBehavior', iterationContext: ['personId1'], action: 'start' as const, ts: 20 },
                    { section: 'personsTrips', iterationContext: ['personId2'], action: 'start' as const, ts: 22 },
                    { section: 'selectPerson', iterationContext: ['personId2'], action: 'start' as const, ts: 24 },
                    { section: 'visitedPlaces', iterationContext: ['personId2'], action: 'start' as const, ts: 28 }
                ]
            } as any;
            Object.assign(testInterview.response, hhWithPersonsResponse);
            testInterview.response._activePersonId = 'personId2';
            tbIsSectionEnabled.mockReturnValueOnce(false); // Simulate that the section is not visible

            // Navigate to requested section
            const nextSectionResult = navigationService.initNavigationState({ interview: testInterview, requestedSection });
            expect(nextSectionResult).toEqual({
                targetSection: {
                    sectionShortname: expectedSection,
                    iterationContext: ['personId2']
                }
            });
        });

        test('should navigate to last section for activated object if requested section in a repeated block but not visible', () => {
            const requestedSection = 'travelBehavior';
            const expectedSection = 'visitedPlaces';
            
            // Prepare the interview with section navigation history and a household
            const testInterview = _cloneDeep(interview);
            // FIXME The type of the _sections is not quite right, this should be valid but it is not
            testInterview.response._sections = {
                home: { _startedAt: 1, _isCompleted: true },
                householdMembers: { _startedAt: 2, _isCompleted: true },
                personsTrips: {
                    _startedAt: 6,
                    _isCompleted: true,
                    personId1: { _startedAt: 6, _isCompleted: true },
                    personId2: { _startedAt: 22, _isCompleted: true }
                },
                selectPerson: {
                    _startedAt: 9,
                    _isCompleted: true,
                    personId1: { _startedAt: 9, _isCompleted: true },
                    personId2: { _startedAt: 24, _isCompleted: true }
                },
                visitedPlaces: {
                    _startedAt: 12,
                    _isCompleted: true,
                    personId1: { _startedAt: 12, _isCompleted: true },
                    personId2: { _startedAt: 28 }
                },
                travelBehavior: {
                    _startedAt: 20,
                    _isCompleted: true,
                    personId1: { _startedAt: 20, _isCompleted: true }
                },
                _actions: [
                    { section: 'home', action: 'start' as const, ts: 1 },
                    { section: 'householdMembers', action: 'start' as const, ts: 2 },
                    { section: 'personsTrips', iterationContext: ['personId1'], action: 'start' as const, ts: 6 },
                    { section: 'selectPerson', iterationContext: ['personId1'], action: 'start' as const, ts: 9 },
                    { section: 'visitedPlaces', iterationContext: ['personId1'], action: 'start' as const, ts: 12 },
                    { section: 'travelBehavior', iterationContext: ['personId1'], action: 'start' as const, ts: 20 },
                    { section: 'personsTrips', iterationContext: ['personId2'], action: 'start' as const, ts: 22 },
                    { section: 'selectPerson', iterationContext: ['personId2'], action: 'start' as const, ts: 24 },
                    { section: 'visitedPlaces', iterationContext: ['personId2'], action: 'start' as const, ts: 28 }
                ]
            } as any;
            Object.assign(testInterview.response, hhWithPersonsResponse);
            testInterview.response._activePersonId = 'personId2';
            tbIsSectionVisible.mockReturnValueOnce(false); // Simulate that the section is not visible

            // Navigate to requested section
            const nextSectionResult = navigationService.initNavigationState({ interview: testInterview, requestedSection });
            expect(nextSectionResult).toEqual({
                targetSection: {
                    sectionShortname: expectedSection,
                    iterationContext: ['personId2']
                }
            });
        });

        test('should navigate to object selection section if requested section in a repeated block but no active object', () => {
            const requestedSection = 'travelBehavior';
            const expectedSection = 'selectPerson';
            
            // Prepare the interview with section navigation history and a household
            const testInterview = _cloneDeep(interview);
            // FIXME The type of the _sections is not quite right, this should be valid but it is not
            testInterview.response._sections = {
                home: { _startedAt: 1, _isCompleted: true },
                householdMembers: { _startedAt: 2, _isCompleted: true },
                personsTrips: {
                    _startedAt: 6,
                    _isCompleted: true,
                    personId1: { _startedAt: 6, _isCompleted: true },
                    personId2: { _startedAt: 22, _isCompleted: true }
                },
                selectPerson: {
                    _startedAt: 9,
                    _isCompleted: true,
                    personId1: { _startedAt: 9, _isCompleted: true },
                    personId2: { _startedAt: 24, _isCompleted: true }
                },
                visitedPlaces: {
                    _startedAt: 12,
                    _isCompleted: true,
                    personId1: { _startedAt: 12, _isCompleted: true },
                    personId2: { _startedAt: 28,  _isCompleted: true }
                },
                travelBehavior: {
                    _startedAt: 20,
                    _isCompleted: true,
                    personId1: { _startedAt: 20, _isCompleted: true },
                    personId2: { _startedAt: 30 }
                },
                _actions: [
                    { section: 'home', action: 'start' as const, ts: 1 },
                    { section: 'householdMembers', action: 'start' as const, ts: 2 },
                    { section: 'personsTrips', iterationContext: ['personId1'], action: 'start' as const, ts: 6 },
                    { section: 'selectPerson', iterationContext: ['personId1'], action: 'start' as const, ts: 9 },
                    { section: 'visitedPlaces', iterationContext: ['personId1'], action: 'start' as const, ts: 12 },
                    { section: 'travelBehavior', iterationContext: ['personId1'], action: 'start' as const, ts: 20 },
                    { section: 'personsTrips', iterationContext: ['personId2'], action: 'start' as const, ts: 22 },
                    { section: 'selectPerson', iterationContext: ['personId2'], action: 'start' as const, ts: 24 },
                    { section: 'visitedPlaces', iterationContext: ['personId2'], action: 'start' as const, ts: 28 },
                    { section: 'travelBehavior', iterationContext: ['personId2'], action: 'start' as const, ts: 30 }
                ]
            } as any;
            Object.assign(testInterview.response, hhWithPersonsResponse);

            // Navigate to requested section
            const nextSectionResult = navigationService.initNavigationState({ interview: testInterview, requestedSection });
            expect(nextSectionResult).toEqual({
                targetSection: {
                    sectionShortname: expectedSection,
                    iterationContext: undefined
                }
            });
        });

        test('should navigate to first section of repeated block with first iteration if the main repeated block section is requested', () => {
            const requestedSection = 'personsTrips';
            const expectedSection = 'selectPerson';
            const expectedContext = ['personId1'];
            
            // Prepare the interview with section navigation history and a household
            const testInterview = _cloneDeep(interview);
            // FIXME The type of the _sections is not quite right, this should be valid but it is not
            testInterview.response._sections = {
                home: { _startedAt: 1, _isCompleted: true },
                householdMembers: { _startedAt: 2, _isCompleted: true },
                personsTrips: {
                    _startedAt: 6,
                    _isCompleted: true,
                    personId1: { _startedAt: 6, _isCompleted: true },
                    personId2: { _startedAt: 22, _isCompleted: true }
                },
                selectPerson: {
                    _startedAt: 9,
                    _isCompleted: true,
                    personId1: { _startedAt: 9, _isCompleted: true },
                    personId2: { _startedAt: 24, _isCompleted: true }
                },
                visitedPlaces: {
                    _startedAt: 12,
                    _isCompleted: true,
                    personId1: { _startedAt: 12, _isCompleted: true },
                    personId2: { _startedAt: 28 }
                },
                travelBehavior: {
                    _startedAt: 20,
                    _isCompleted: true,
                    personId1: { _startedAt: 20, _isCompleted: true }
                },
                _actions: [
                    { section: 'home', action: 'start' as const, ts: 1 },
                    { section: 'householdMembers', action: 'start' as const, ts: 2 },
                    { section: 'personsTrips', iterationContext: ['personId1'], action: 'start' as const, ts: 6 },
                    { section: 'selectPerson', iterationContext: ['personId1'], action: 'start' as const, ts: 9 },
                    { section: 'visitedPlaces', iterationContext: ['personId1'], action: 'start' as const, ts: 12 },
                    { section: 'travelBehavior', iterationContext: ['personId1'], action: 'start' as const, ts: 20 },
                    { section: 'personsTrips', iterationContext: ['personId2'], action: 'start' as const, ts: 22 },
                    { section: 'selectPerson', iterationContext: ['personId2'], action: 'start' as const, ts: 24 },
                    { section: 'visitedPlaces', iterationContext: ['personId2'], action: 'start' as const, ts: 28 }
                ]
            } as any;
            Object.assign(testInterview.response, hhWithPersonsResponse);
            testInterview.response._activePersonId = 'personId2';

            // Navigate to requested section
            const nextSectionResult = navigationService.initNavigationState({ interview: testInterview, requestedSection });
            expect(nextSectionResult).toEqual({
                targetSection: {
                    sectionShortname: expectedSection,
                    iterationContext: expectedContext
                },
                valuesByPath: { 'response._activePersonId': 'personId1' }
            });
        });

        test('should skip selection section if only one iteration', () => {
            const requestedSection = 'personsTrips';
            const expectedSection = 'visitedPlaces';
            const expectedContext = ['personId1'];
            
            // Prepare the interview with section navigation history and a household with only one person
            const testInterview = _cloneDeep(interview);
            const testHhWithPersons = _cloneDeep(hhWithPersonsResponse) as any;
            delete testHhWithPersons.household.persons.personId2;
            delete testHhWithPersons.household.persons.personId3;
            // FIXME The type of the _sections is not quite right, this should be valid but it is not
            testInterview.response._sections = {
                home: { _startedAt: 1, _isCompleted: true },
                householdMembers: { _startedAt: 2, _isCompleted: true },
                personsTrips: {
                    _startedAt: 6,
                    _isCompleted: true,
                    personId1: { _startedAt: 6, _isCompleted: true },
                },
                visitedPlaces: {
                    _startedAt: 12,
                    _isCompleted: true,
                    personId1: { _startedAt: 12, _isCompleted: true },
                },
                travelBehavior: {
                    _startedAt: 20,
                    _isCompleted: true,
                    personId1: { _startedAt: 20, _isCompleted: true }
                },
                _actions: [
                    { section: 'home', action: 'start' as const, ts: 1 },
                    { section: 'householdMembers', action: 'start' as const, ts: 2 },
                    { section: 'personsTrips', iterationContext: ['personId1'], action: 'start' as const, ts: 6 },
                    { section: 'visitedPlaces', iterationContext: ['personId1'], action: 'start' as const, ts: 12 },
                    { section: 'travelBehavior', iterationContext: ['personId1'], action: 'start' as const, ts: 20 }
                ]
            } as any;
            Object.assign(testInterview.response, testHhWithPersons);

            // Navigate to requested section
            const nextSectionResult = navigationService.initNavigationState({ interview: testInterview, requestedSection });
            expect(nextSectionResult).toEqual({
                targetSection: {
                    sectionShortname: expectedSection,
                    iterationContext: expectedContext
                },
                valuesByPath: { 'response._activePersonId': 'personId1' }
            });
        });
    });

    describe('Navigate function', () => {

        test('should skip selection section when coming from previous section the first time', () => {
            const currentSection = 'householdMembers';
            const expectedSection = 'visitedPlaces';

            // Prepare the interview with section navigation history and a household
            const testInterview = _cloneDeep(interview);
            // FIXME The type of the _sections is not quite right, this should be valid but it is not
            testInterview.response._sections = {
                home: { _startedAt: 1, _isCompleted: true },
                householdMembers: { _startedAt: 2, _isCompleted: true },
                _actions: [
                    { section: 'home', action: 'start' as const, ts: 1 },
                    { section: 'householdMembers', action: 'start' as const, ts: 2 }
                ]
            } as any;
            Object.assign(testInterview.response, hhWithPersonsResponse);

            // Prepare the previous navigation state
            const currentSectionData = {
                sectionShortname: currentSection,
                iterationContext: undefined
            }

            // Navigate to specific section
            const nextSectionResult = navigationService.navigate({
                interview: testInterview,
                currentSection: _cloneDeep(currentSectionData),
                direction: 'forward'
            });
            expect(nextSectionResult).toEqual({
                targetSection: {
                    sectionShortname: expectedSection,
                    iterationContext: ['personId1']
                },
                valuesByPath: { 'response._activePersonId': 'personId1' }
            });
        });

        test('should skip selection section when coming from end of first iteration', () => {
            const currentSection = 'travelBehavior';
            const expectedSection = 'visitedPlaces';

            // Prepare the interview with section navigation history and a household
            const testInterview = _cloneDeep(interview);
            // FIXME The type of the _sections is not quite right, this should be valid but it is not
            testInterview.response._sections = {
                home: { _startedAt: 1, _isCompleted: true },
                householdMembers: { _startedAt: 2, _isCompleted: true },
                personsTrips: {
                    _startedAt: 6,
                    _isCompleted: true,
                    personId1: { _startedAt: 6, _isCompleted: true }
                },
                selectPerson: {
                    _startedAt: 9,
                    _isCompleted: true,
                    personId1: { _startedAt: 9, _isCompleted: true }
                },
                visitedPlaces: {
                    _startedAt: 12,
                    _isCompleted: true,
                    personId1: { _startedAt: 12, _isCompleted: true }
                },
                travelBehavior: {
                    _startedAt: 20,
                    _isCompleted: true,
                    personId1: { _startedAt: 20, _isCompleted: true }
                },
                _actions: [
                    { section: 'home', action: 'start' as const, ts: 1 },
                    { section: 'householdMembers', action: 'start' as const, ts: 2 },
                    { section: 'personsTrips', iterationContext: ['personId1'], action: 'start' as const, ts: 6 },
                    { section: 'selectPerson', iterationContext: ['personId1'], action: 'start' as const, ts: 9 },
                    { section: 'visitedPlaces', iterationContext: ['personId1'], action: 'start' as const, ts: 12 },
                    { section: 'travelBehavior', iterationContext: ['personId1'], action: 'start' as const, ts: 20 }
                ]
            } as any;
            Object.assign(testInterview.response, hhWithPersonsResponse);

            // Prepare the previous navigation state
            const currentSectionData = {
                sectionShortname: currentSection,
                iterationContext: ['personId1']
            }

            // Navigate to specific section
            const nextSectionResult = navigationService.navigate({
                interview: testInterview,
                currentSection: _cloneDeep(currentSectionData),
                direction: 'forward'
            });
            expect(nextSectionResult).toEqual({
                targetSection: {
                    sectionShortname: expectedSection,
                    iterationContext: ['personId2']
                },
                valuesByPath: { 'response._activePersonId': 'personId2' }
            });
        });

        test('should show selection section when coming from previous, but sections already visited', () => {          
            const currentSection = 'householdMembers';
            const expectedSection = 'selectPerson';

            // Prepare the interview with section navigation history and a household
            const testInterview = _cloneDeep(interview);
            // FIXME The type of the _sections is not quite right, this should be valid but it is not
            testInterview.response._sections = {
                home: { _startedAt: 1, _isCompleted: true },
                householdMembers: { _startedAt: 2, _isCompleted: true },
                personsTrips: {
                    _startedAt: 6,
                    _isCompleted: true,
                    personId1: { _startedAt: 6, _isCompleted: true }
                },
                selectPerson: {
                    _startedAt: 9,
                    _isCompleted: true,
                    personId1: { _startedAt: 9, _isCompleted: true }
                },
                visitedPlaces: {
                    _startedAt: 12,
                    _isCompleted: true,
                    personId1: { _startedAt: 12, _isCompleted: true }
                },
                travelBehavior: {
                    _startedAt: 20,
                    _isCompleted: true
                },
                _actions: [
                    { section: 'home', action: 'start' as const, ts: 1 },
                    { section: 'householdMembers', action: 'start' as const, ts: 2 },
                    { section: 'personsTrips', iterationContext: ['personId1'], action: 'start' as const, ts: 6 },
                    { section: 'selectPerson', iterationContext: ['personId1'], action: 'start' as const, ts: 9 },
                    { section: 'visitedPlaces', iterationContext: ['personId1'], action: 'start' as const, ts: 12 },
                    { section: 'householdMembers', action: 'start' as const, ts: 20 }
                ]
            } as any;
            Object.assign(testInterview.response, hhWithPersonsResponse);

            // Prepare the previous navigation state
            const currentSectionData = {
                sectionShortname: currentSection,
                iterationContext: undefined
            }

            // Navigate to specific section
            const nextSectionResult = navigationService.navigate({
                interview: testInterview,
                currentSection: _cloneDeep(currentSectionData),
                direction: 'forward'
            });
            expect(nextSectionResult).toEqual({
                targetSection: {
                    sectionShortname: expectedSection,
                    iterationContext: ['personId1']
                },
                valuesByPath: { 'response._activePersonId': 'personId1' }
            });
        });

        test('should navigate to the "end" section when all repeated blocks completed', () => {
            const currentSection = 'travelBehavior';
            const expectedSection = 'end';
            
            // Prepare the interview with section navigation history and a household
            const testInterview = _cloneDeep(interview);
            // FIXME The type of the _sections is not quite right, this should be valid but it is not
            testInterview.response._sections = {
                home: { _startedAt: 1, _isCompleted: true },
                householdMembers: { _startedAt: 2, _isCompleted: true },
                personsTrips: {
                    _startedAt: 6,
                    _isCompleted: true,
                    personId1: { _startedAt: 6, _isCompleted: true },
                    personId2: { _startedAt: 22, _isCompleted: true }
                },
                selectPerson: {
                    _startedAt: 9,
                    _isCompleted: true,
                    personId1: { _startedAt: 9, _isCompleted: true },
                    personId2: { _startedAt: 24, _isCompleted: true }
                },
                visitedPlaces: {
                    _startedAt: 12,
                    _isCompleted: true,
                    personId1: { _startedAt: 12, _isCompleted: true },
                    personId2: { _startedAt: 28,  _isCompleted: true }
                },
                travelBehavior: {
                    _startedAt: 20,
                    _isCompleted: true,
                    personId1: { _startedAt: 20, _isCompleted: true },
                    personId2: { _startedAt: 30, _isCompleted: true }
                },
                _actions: [
                    { section: 'home', action: 'start' as const, ts: 1 },
                    { section: 'householdMembers', action: 'start' as const, ts: 2 },
                    { section: 'personsTrips', iterationContext: ['personId1'], action: 'start' as const, ts: 6 },
                    { section: 'selectPerson', iterationContext: ['personId1'], action: 'start' as const, ts: 9 },
                    { section: 'visitedPlaces', iterationContext: ['personId1'], action: 'start' as const, ts: 12 },
                    { section: 'travelBehavior', iterationContext: ['personId1'], action: 'start' as const, ts: 20 },
                    { section: 'personsTrips', iterationContext: ['personId2'], action: 'start' as const, ts: 22 },
                    { section: 'selectPerson', iterationContext: ['personId2'], action: 'start' as const, ts: 24 },
                    { section: 'visitedPlaces', iterationContext: ['personId2'], action: 'start' as const, ts: 28 },
                    { section: 'travelBehavior', iterationContext: ['personId2'], action: 'start' as const, ts: 30 }
                ]
            } as any;
            Object.assign(testInterview.response, hhWithPersonsResponse);

            // Prepare the previous navigation state
            const currentSectionData = {
                sectionShortname: currentSection,
                iterationContext: ['personId2']
            }

            // Navigate to specific section
            const nextSectionResult = navigationService.navigate({
                interview: testInterview,
                currentSection: _cloneDeep(currentSectionData),
                direction: 'forward'
            });
            expect(nextSectionResult).toEqual({
                targetSection: {
                    sectionShortname: expectedSection,
                    iterationContext: undefined
                },
                valuesByPath: { 'response._activePersonId': undefined }
            });
        });

        test('should show selection section when entering repeated block, even if interview is completed', () => {
            const currentSection = 'householdMembers';
            const expectedSection = 'selectPerson';
            
            // Prepare the interview with section navigation history and a household
            const testInterview = _cloneDeep(interview);
            // FIXME The type of the _sections is not quite right, this should be valid but it is not
            testInterview.response._sections = {
                home: { _startedAt: 1, _isCompleted: true },
                householdMembers: { _startedAt: 2, _isCompleted: true },
                personsTrips: {
                    _startedAt: 6,
                    _isCompleted: true,
                    personId1: { _startedAt: 6, _isCompleted: true },
                    personId2: { _startedAt: 22, _isCompleted: true }
                },
                selectPerson: {
                    _startedAt: 9,
                    _isCompleted: true,
                    personId1: { _startedAt: 9, _isCompleted: true },
                    personId2: { _startedAt: 24, _isCompleted: true }
                },
                visitedPlaces: {
                    _startedAt: 12,
                    _isCompleted: true,
                    personId1: { _startedAt: 12, _isCompleted: true },
                    personId2: { _startedAt: 28,  _isCompleted: true }
                },
                travelBehavior: {
                    _startedAt: 20,
                    _isCompleted: true,
                    personId1: { _startedAt: 20, _isCompleted: true },
                    personId2: { _startedAt: 30, _isCompleted: true }
                },
                end: { _startedAt: 40, _isCompleted: true },
                _actions: [
                    { section: 'home', action: 'start' as const, ts: 1 },
                    { section: 'householdMembers', action: 'start' as const, ts: 2 },
                    { section: 'personsTrips', iterationContext: ['personId1'], action: 'start' as const, ts: 6 },
                    { section: 'selectPerson', iterationContext: ['personId1'], action: 'start' as const, ts: 9 },
                    { section: 'visitedPlaces', iterationContext: ['personId1'], action: 'start' as const, ts: 12 },
                    { section: 'travelBehavior', iterationContext: ['personId1'], action: 'start' as const, ts: 20 },
                    { section: 'personsTrips', iterationContext: ['personId2'], action: 'start' as const, ts: 22 },
                    { section: 'selectPerson', iterationContext: ['personId2'], action: 'start' as const, ts: 24 },
                    { section: 'visitedPlaces', iterationContext: ['personId2'], action: 'start' as const, ts: 28 },
                    { section: 'travelBehavior', iterationContext: ['personId2'], action: 'start' as const, ts: 30 },
                    { section: 'end', action: 'start' as const, ts: 40 }
                ]
            } as any;
            Object.assign(testInterview.response, hhWithPersonsResponse);

            // Prepare the previous navigation state
            const currentSectionData = {
                sectionShortname: currentSection,
                iterationContext: undefined
            }

            // Navigate to specific section
            const nextSectionResult = navigationService.navigate({
                interview: testInterview,
                currentSection: _cloneDeep(currentSectionData),
                direction: 'forward'
            });
            expect(nextSectionResult).toEqual({
                targetSection: {
                    sectionShortname: expectedSection,
                    iterationContext: ['personId1']
                },
                valuesByPath: { 'response._activePersonId': 'personId1' }
            });
        });

        test('should go to previous iteration if navigating backward from an iteration that is not the first', () => {
            const currentSection = 'selectPerson';
            const currentIterationContext = ['personId2'];
            const expectedSection = 'selectPerson';
            const expectedIterationContext = ['personId1'];
            
            // Prepare the interview with section navigation history and a household
            const testInterview = _cloneDeep(interview);
            // FIXME The type of the _sections is not quite right, this should be valid but it is not
            testInterview.response._sections = {
                home: { _startedAt: 1, _isCompleted: true },
                householdMembers: { _startedAt: 2, _isCompleted: true },
                personsTrips: {
                    _startedAt: 6,
                    _isCompleted: true,
                    personId1: { _startedAt: 6, _isCompleted: true },
                    personId2: { _startedAt: 22, _isCompleted: true }
                },
                selectPerson: {
                    _startedAt: 9,
                    _isCompleted: true,
                    personId1: { _startedAt: 9, _isCompleted: true },
                    personId2: { _startedAt: 24, _isCompleted: true }
                },
                visitedPlaces: {
                    _startedAt: 12,
                    _isCompleted: true,
                    personId1: { _startedAt: 12, _isCompleted: true },
                    personId2: { _startedAt: 28,  _isCompleted: true }
                },
                travelBehavior: {
                    _startedAt: 20,
                    _isCompleted: true,
                    personId1: { _startedAt: 20, _isCompleted: true },
                    personId2: { _startedAt: 30, _isCompleted: true }
                },
                end: { _startedAt: 40, _isCompleted: true },
                _actions: [
                    { section: 'home', action: 'start' as const, ts: 1 },
                    { section: 'householdMembers', action: 'start' as const, ts: 2 },
                    { section: 'personsTrips', iterationContext: ['personId1'], action: 'start' as const, ts: 6 },
                    { section: 'selectPerson', iterationContext: ['personId1'], action: 'start' as const, ts: 9 },
                    { section: 'visitedPlaces', iterationContext: ['personId1'], action: 'start' as const, ts: 12 },
                    { section: 'travelBehavior', iterationContext: ['personId1'], action: 'start' as const, ts: 20 },
                    { section: 'personsTrips', iterationContext: ['personId2'], action: 'start' as const, ts: 22 },
                    { section: 'selectPerson', iterationContext: ['personId2'], action: 'start' as const, ts: 24 },
                    { section: 'visitedPlaces', iterationContext: ['personId2'], action: 'start' as const, ts: 28 },
                    { section: 'travelBehavior', iterationContext: ['personId2'], action: 'start' as const, ts: 30 },
                    { section: 'end', action: 'start' as const, ts: 40 }
                ]
            } as any;
            Object.assign(testInterview.response, hhWithPersonsResponse);

            // Prepare the previous navigation state
            const currentSectionData = {
                sectionShortname: currentSection,
                iterationContext: currentIterationContext
            }

            // Navigate to specific section
            const nextSectionResult = navigationService.navigate({
                interview: testInterview,
                currentSection: _cloneDeep(currentSectionData),
                direction: 'backward'
            });
            expect(nextSectionResult).toEqual({
                targetSection: {
                    sectionShortname: expectedSection,
                    iterationContext: expectedIterationContext
                },
                valuesByPath: { 'response._activePersonId': 'personId1' }
            });
        });

        test('should go to previous section, without iteration, if navigating backward from first block iteration', () => {
            const currentSection = 'selectPerson';
            const currentIterationContext = ['personId1'];
            const expectedSection = 'householdMembers';
            
            // Prepare the interview with section navigation history and a household
            const testInterview = _cloneDeep(interview);
            // FIXME The type of the _sections is not quite right, this should be valid but it is not
            testInterview.response._sections = {
                home: { _startedAt: 1, _isCompleted: true },
                householdMembers: { _startedAt: 2, _isCompleted: true },
                personsTrips: {
                    _startedAt: 6,
                    _isCompleted: true,
                    personId1: { _startedAt: 6, _isCompleted: true },
                    personId2: { _startedAt: 22, _isCompleted: true }
                },
                selectPerson: {
                    _startedAt: 9,
                    _isCompleted: true,
                    personId1: { _startedAt: 9, _isCompleted: true },
                    personId2: { _startedAt: 24, _isCompleted: true }
                },
                visitedPlaces: {
                    _startedAt: 12,
                    _isCompleted: true,
                    personId1: { _startedAt: 12, _isCompleted: true },
                    personId2: { _startedAt: 28,  _isCompleted: true }
                },
                travelBehavior: {
                    _startedAt: 20,
                    _isCompleted: true,
                    personId1: { _startedAt: 20, _isCompleted: true },
                    personId2: { _startedAt: 30, _isCompleted: true }
                },
                end: { _startedAt: 40, _isCompleted: true },
                _actions: [
                    { section: 'home', action: 'start' as const, ts: 1 },
                    { section: 'householdMembers', action: 'start' as const, ts: 2 },
                    { section: 'personsTrips', iterationContext: ['personId1'], action: 'start' as const, ts: 6 },
                    { section: 'selectPerson', iterationContext: ['personId1'], action: 'start' as const, ts: 9 },
                    { section: 'visitedPlaces', iterationContext: ['personId1'], action: 'start' as const, ts: 12 },
                    { section: 'travelBehavior', iterationContext: ['personId1'], action: 'start' as const, ts: 20 },
                    { section: 'personsTrips', iterationContext: ['personId2'], action: 'start' as const, ts: 22 },
                    { section: 'selectPerson', iterationContext: ['personId2'], action: 'start' as const, ts: 24 },
                    { section: 'visitedPlaces', iterationContext: ['personId2'], action: 'start' as const, ts: 28 },
                    { section: 'travelBehavior', iterationContext: ['personId2'], action: 'start' as const, ts: 30 },
                    { section: 'end', action: 'start' as const, ts: 40 }
                ]
            } as any;
            Object.assign(testInterview.response, hhWithPersonsResponse);

            // Prepare the previous navigation state
            const currentSectionData = {
                sectionShortname: currentSection,
                iterationContext: currentIterationContext
            }

            // Navigate to specific section
            const nextSectionResult = navigationService.navigate({
                interview: testInterview,
                currentSection: _cloneDeep(currentSectionData),
                direction: 'backward'
            });
            expect(nextSectionResult).toEqual({
                targetSection: {
                    sectionShortname: expectedSection,
                    iterationContext: undefined
                },
                valuesByPath: { 'response._activePersonId': undefined }
            });
        });

        test('should go to next section in block with same iteration if not skipped', () => {           
            const currentSection = 'visitedPlaces';
            const currentIterationContext = ['personId1'];
            const expectedSection = 'travelBehavior';
            const expectedIterationContext = ['personId1'];
            
            // Prepare the interview with section navigation history and a household
            const testInterview = _cloneDeep(interview);
            // FIXME The type of the _sections is not quite right, this should be valid but it is not
            testInterview.response._sections = {
                home: { _startedAt: 1, _isCompleted: true },
                householdMembers: { _startedAt: 2, _isCompleted: true },
                personsTrips: {
                    _startedAt: 6,
                    _isCompleted: true,
                    personId1: { _startedAt: 6, _isCompleted: true }
                },
                selectPerson: {
                    _startedAt: 9,
                    _isCompleted: true,
                    personId1: { _startedAt: 9, _isCompleted: true }
                },
                visitedPlaces: {
                    _startedAt: 12,
                    _isCompleted: true,
                    personId1: { _startedAt: 12, _isCompleted: true }
                },
                travelBehavior: {
                    _startedAt: 20,
                    _isCompleted: true
                },
                end: { _startedAt: 40, _isCompleted: true },
                _actions: [
                    { section: 'home', action: 'start' as const, ts: 1 },
                    { section: 'householdMembers', action: 'start' as const, ts: 2 },
                    { section: 'personsTrips', iterationContext: ['personId1'], action: 'start' as const, ts: 6 },
                    { section: 'selectPerson', iterationContext: ['personId1'], action: 'start' as const, ts: 9 },
                    { section: 'visitedPlaces', iterationContext: ['personId1'], action: 'start' as const, ts: 12 }
                ]
            } as any;
            Object.assign(testInterview.response, hhWithPersonsResponse);
            testInterview.response._activePersonId = 'personId1';

            // Prepare the previous navigation state
            const currentSectionData = {
                sectionShortname: currentSection,
                iterationContext: currentIterationContext
            }

            // Navigate to specific section
            const nextSectionResult = navigationService.navigate({
                interview: testInterview,
                currentSection: _cloneDeep(currentSectionData),
                direction: 'forward'
            });
            expect(nextSectionResult).toEqual({
                targetSection: {
                    sectionShortname: expectedSection,
                    iterationContext: expectedIterationContext
                },
                valuesByPath: undefined
            });
            expect(tbIsSectionVisible).toHaveBeenCalledWith(testInterview, ['personId1']);
        });

        test('should go to next iteration if last section of block is skipped in natural flow', () => {           
            const currentSection = 'visitedPlaces';
            const currentIterationContext = ['personId1'];
            const expectedSection = 'visitedPlaces';
            const expectedIterationContext = ['personId2'];
            tbIsSectionVisible.mockReturnValueOnce(false);
            
            // Prepare the interview with section navigation history and a household
            const testInterview = _cloneDeep(interview);
            // FIXME The type of the _sections is not quite right, this should be valid but it is not
            testInterview.response._sections = {
                home: { _startedAt: 1, _isCompleted: true },
                householdMembers: { _startedAt: 2, _isCompleted: true },
                personsTrips: {
                    _startedAt: 6,
                    _isCompleted: true,
                    personId1: { _startedAt: 6, _isCompleted: true }
                },
                selectPerson: {
                    _startedAt: 9,
                    _isCompleted: true,
                    personId1: { _startedAt: 9, _isCompleted: true }
                },
                visitedPlaces: {
                    _startedAt: 12,
                    _isCompleted: true,
                    personId1: { _startedAt: 12, _isCompleted: true }
                },
                travelBehavior: {
                    _startedAt: 20,
                    _isCompleted: true
                },
                end: { _startedAt: 40, _isCompleted: true },
                _actions: [
                    { section: 'home', action: 'start' as const, ts: 1 },
                    { section: 'householdMembers', action: 'start' as const, ts: 2 },
                    { section: 'personsTrips', iterationContext: ['personId1'], action: 'start' as const, ts: 6 },
                    { section: 'selectPerson', iterationContext: ['personId1'], action: 'start' as const, ts: 9 },
                    { section: 'visitedPlaces', iterationContext: ['personId1'], action: 'start' as const, ts: 12 }
                ]
            } as any;
            Object.assign(testInterview.response, hhWithPersonsResponse);

            // Prepare the previous navigation state
            const currentSectionData = {
                sectionShortname: currentSection,
                iterationContext: currentIterationContext
            }

            // Navigate to specific section
            const nextSectionResult = navigationService.navigate({
                interview: testInterview,
                currentSection: _cloneDeep(currentSectionData),
                direction: 'forward'
            });
            expect(nextSectionResult).toEqual({
                targetSection: {
                    sectionShortname: expectedSection,
                    iterationContext: expectedIterationContext
                },
                valuesByPath: { 'response._activePersonId': expectedIterationContext[0] }
            });
            expect(tbIsSectionVisible).toHaveBeenCalledWith(testInterview, ['personId1']);
        });

        test('should always select the correct next section for a completed interview', () => {
            // This is the expected sequence of sections
            const expectedSectionSequence = [
                { sectionShortname: 'home' },
                { sectionShortname: 'householdMembers' },
                { sectionShortname: 'visitedPlaces', iterationContext: ['personId1'] },
                { sectionShortname: 'travelBehavior', iterationContext: ['personId1']},
                { sectionShortname: 'visitedPlaces', iterationContext: ['personId2']},
                { sectionShortname: 'end' }
            ];
            // Skip travelBehavior at second call
            tbIsSectionVisible.mockReturnValueOnce(true);
            tbIsSectionVisible.mockReturnValueOnce(false);

            // Prepare the interview with section navigation history and a household
            const testInterview = _cloneDeep(interview);
            // Initialize sections, they will be filled as needed, prefill responses
            testInterview.response._sections = {
                _actions: []
            } as any;
            Object.assign(testInterview.response, hhWithPersonsResponse);

            const initialNavigation = navigationService.initNavigationState({ interview: testInterview });
            expect(initialNavigation).toEqual({
                targetSection: expectedSectionSequence[0]
            });

            // Prepare the previous navigation state
            let currentSection = initialNavigation.targetSection;

            for (let i = 1; i < expectedSectionSequence.length; i++) {
                // Add section completion data to the interview
                (testInterview.response._sections as any)[currentSection.sectionShortname] = {
                    _startedAt: i * 10,
                    _isCompleted: true,
                };
                if (currentSection.iterationContext) { 
                    (testInterview.response._sections as any)[currentSection.sectionShortname][currentSection.iterationContext[0]] = {
                        _startedAt: i * 10,
                        _isCompleted: true,
                    };
                }
                (testInterview.response._sections as any)._actions.push({
                    section: currentSection.sectionShortname,
                    iterationContext: currentSection.iterationContext,
                    action: 'start' as const,
                    ts: 6
                });

                const expectedSection = expectedSectionSequence[i];

                // Navigate to specific section
                const nextSectionResult = navigationService.navigate({
                    interview: testInterview,
                    currentSection: _cloneDeep(currentSection),
                    direction: 'forward'
                });
                expect(nextSectionResult).toEqual({
                    targetSection: expectedSection,
                    valuesByPath: expectedSection.iterationContext === undefined && currentSection.iterationContext === undefined ? undefined : { 'response._activePersonId': expectedSection.iterationContext ? expectedSection.iterationContext[0] : undefined }
                });
                currentSection = nextSectionResult.targetSection;
            }
        });

        test('should navigate to the "end" if repeated block is disabled', () => {
            const currentSection = 'householdMembers';
            const expectedSection = 'end';
            tripsIsEnabled.mockReturnValueOnce(false);
            
            // Prepare the interview with section navigation history and a household
            const testInterview = _cloneDeep(interview);
            // FIXME The type of the _sections is not quite right, this should be valid but it is not
            testInterview.response._sections = {
                home: { _startedAt: 1, _isCompleted: true },
                householdMembers: { _startedAt: 2, _isCompleted: true },
                _actions: [
                    { section: 'home', action: 'start' as const, ts: 1 },
                    { section: 'householdMembers', action: 'start' as const, ts: 2 }
                ]
            } as any;
            Object.assign(testInterview.response, hhWithPersonsResponse);

            // Prepare the previous navigation state
            const currentSectionData = {
                sectionShortname: currentSection
            }

            // Navigate to specific section
            const nextSectionResult = navigationService.navigate({
                interview: testInterview,
                currentSection: _cloneDeep(currentSectionData),
                direction: 'forward'
            });
            expect(nextSectionResult).toEqual({
                targetSection: {
                    sectionShortname: expectedSection,
                    iterationContext: undefined
                },
                valuesByPath: undefined
            });
        });

        test('should select iteration with active survey object ID of interview if current section is selection section', () => {
            const currentSection = 'selectPerson';
            const currentIterationContext = ['personId2'];
            const expectedSection = 'visitedPlaces';
            const expectedIterationContext = ['personId1'];

            // Prepare the interview with section navigation history and a household
            const testInterview = _cloneDeep(interview);
            // FIXME The type of the _sections is not quite right, this should be valid but it is not
            testInterview.response._activePersonId = 'personId1';
            testInterview.response._sections = {
                home: { _startedAt: 1, _isCompleted: true },
                householdMembers: { _startedAt: 2, _isCompleted: true },
                personsTrips: {
                    _startedAt: 6,
                    _isCompleted: true,
                    personId1: { _startedAt: 6, _isCompleted: true },
                    personId2: { _startedAt: 22, _isCompleted: true }
                },
                selectPerson: {
                    _startedAt: 9,
                    _isCompleted: true,
                    personId1: { _startedAt: 9, _isCompleted: true },
                    personId2: { _startedAt: 24, _isCompleted: true }
                },
                visitedPlaces: {
                    _startedAt: 12,
                    _isCompleted: true,
                    personId1: { _startedAt: 12, _isCompleted: true },
                    personId2: { _startedAt: 28,  _isCompleted: true }
                },
                travelBehavior: {
                    _startedAt: 20,
                    _isCompleted: true,
                    personId1: { _startedAt: 20, _isCompleted: true },
                    personId2: { _startedAt: 30, _isCompleted: true }
                },
                end: { _startedAt: 40, _isCompleted: true },
                _actions: [
                    { section: 'home', action: 'start' as const, ts: 1 },
                    { section: 'householdMembers', action: 'start' as const, ts: 2 },
                    { section: 'personsTrips', iterationContext: ['personId1'], action: 'start' as const, ts: 6 },
                    { section: 'selectPerson', iterationContext: ['personId1'], action: 'start' as const, ts: 9 },
                    { section: 'visitedPlaces', iterationContext: ['personId1'], action: 'start' as const, ts: 12 },
                    { section: 'travelBehavior', iterationContext: ['personId1'], action: 'start' as const, ts: 20 },
                    { section: 'personsTrips', iterationContext: ['personId2'], action: 'start' as const, ts: 22 },
                    { section: 'selectPerson', iterationContext: ['personId2'], action: 'start' as const, ts: 24 },
                    { section: 'visitedPlaces', iterationContext: ['personId2'], action: 'start' as const, ts: 28 },
                    { section: 'travelBehavior', iterationContext: ['personId2'], action: 'start' as const, ts: 30 },
                    { section: 'end', action: 'start' as const, ts: 40 }
                ]
            } as any;
            Object.assign(testInterview.response, hhWithPersonsResponse);

            // Prepare the previous navigation state
            const currentSectionData = {
                sectionShortname: currentSection,
                iterationContext: currentIterationContext
            }

            // Navigate to specific section
            const nextSectionResult = navigationService.navigate({ interview: testInterview, currentSection: _cloneDeep(currentSectionData), direction: 'forward' });
            expect(nextSectionResult).toEqual({
                targetSection: {
                    sectionShortname: expectedSection,
                    iterationContext: expectedIterationContext
                }
            });
        });

    });

});

describe('navigate function, further use cases', () => {

    describe('test iteration context order', () => {
        // Prepare the interview with section navigation history and a household
        const testInterview = _cloneDeep(interview);
        // FIXME The type of the _sections is not quite right, this should be valid but it is not
        testInterview.response._sections = {
            home: { _startedAt: 1, _isCompleted: true },
            householdMembers: { _startedAt: 2, _isCompleted: true },
            _actions: [
                { section: 'home', action: 'start' as const, ts: 1 },
                { section: 'householdMembers', action: 'start' as const, ts: 2 }
            ]
        } as any;
        Object.assign(testInterview.response, hhWithPersonsResponse);

        test('random', () => {
            const currentSection = 'householdMembers';
            const expectedSection = 'visitedPlaces';
            const expectedIterationContext = ['personId2'];

            // Set the order of the iteration contexts to randomize and mock the result
            const sectionConfig = _cloneDeep(complexSectionsConfig);
            (sectionConfig['personsTrips'] as SectionConfigWithDefaultsBlock).repeatedBlock.order = 'random';
            mockShuffle.mockReturnValueOnce(['personId2', 'personId1']);
            const navigationService = createNavigationService(sectionConfig);

            // Prepare the previous navigation state
            const currentSectionData = {
                sectionShortname: currentSection,
                iterationContext: undefined
            }

            // Navigate to specific section
            const nextSectionResult = navigationService.navigate({ interview: testInterview, currentSection: _cloneDeep(currentSectionData), direction: 'forward'});
            expect(mockShuffle).toHaveBeenCalledWith(['personId1', 'personId2']);
            expect(nextSectionResult).toEqual({
                targetSection: {
                    sectionShortname: expectedSection,
                    iterationContext: expectedIterationContext
                },
                valuesByPath: { 'response._activePersonId': expectedIterationContext[0], 'response._RandomSequence': ['personId2', 'personId1'] }
            });
        });

        test('random with path prefix', () => {
            const currentSection = 'householdMembers';
            const expectedSection = 'visitedPlaces';
            const expectedIterationContext = ['person', 'personId2'];

            // Set the order of the iteration contexts to randomize and mock shuffle order
            const sectionConfig = _cloneDeep(complexSectionsConfig);
            const pathPrefix = 'person';
            (sectionConfig['personsTrips'] as SectionConfigWithDefaultsBlock).repeatedBlock.order = 'random';
            (sectionConfig['personsTrips'] as SectionConfigWithDefaultsBlock).repeatedBlock.pathPrefix = pathPrefix;
            mockShuffle.mockReturnValueOnce(['personId2', 'personId1']);
            
            const navigationService = createNavigationService(sectionConfig);

            // Prepare the previous navigation state
            const currentSectionData = {
                sectionShortname: currentSection,
                iterationContext: undefined
            }

            // Navigate to specific section
            const nextSectionResult = navigationService.navigate({ interview: testInterview, currentSection: _cloneDeep(currentSectionData), direction: 'forward' });
            expect(nextSectionResult).toEqual({
                targetSection: {
                    sectionShortname: expectedSection,
                    iterationContext: expectedIterationContext
                },
                valuesByPath: { 'response._activePersonId': expectedIterationContext[1], 'response._personRandomSequence': ['personId2', 'personId1'] }
            });
            expect(mockShuffle).toHaveBeenCalledWith(['personId1', 'personId2']);
        });

        test('random, with random sequence already set', () => {
            const currentSection = 'householdMembers';
            const expectedSection = 'visitedPlaces';
            const expectedIterationContext = ['personId2'];

            // Set the order of the iteration contexts to randomize and mock the result
            const sectionConfig = _cloneDeep(complexSectionsConfig);
            (sectionConfig['personsTrips'] as SectionConfigWithDefaultsBlock).repeatedBlock.order = 'random';
            const navigationService = createNavigationService(sectionConfig);

            const testInterviewWithRandomSequence = _cloneDeep(testInterview);
            testInterviewWithRandomSequence.response._RandomSequence = ['personId2', 'personId1'];

            // Prepare the previous navigation state
            const currentSectionData = {
                sectionShortname: currentSection,
                iterationContext: undefined
            }

            // Navigate to specific section
            const nextSectionResult = navigationService.navigate({ interview: testInterviewWithRandomSequence, currentSection: _cloneDeep(currentSectionData), direction: 'forward' });
            expect(mockShuffle).not.toHaveBeenCalled();
            expect(nextSectionResult).toEqual({
                targetSection: {
                    sectionShortname: expectedSection,
                    iterationContext: expectedIterationContext
                },
                valuesByPath: { 'response._activePersonId': expectedIterationContext[0] }
            });
        });

        test('random, with random sequence already set, but now invalid (same length)', () => {
            const currentSection = 'householdMembers';
            const expectedSection = 'visitedPlaces';
            const expectedIterationContext = ['personId2'];

            // Set the order of the iteration contexts to randomize and mock the result
            const sectionConfig = _cloneDeep(complexSectionsConfig);
            (sectionConfig['personsTrips'] as SectionConfigWithDefaultsBlock).repeatedBlock.order = 'random';
            const navigationService = createNavigationService(sectionConfig);
            mockShuffle.mockReturnValueOnce(['personId2', 'personId1']);

            const testInterviewWithRandomSequence = _cloneDeep(testInterview);
            // Current random sequence has a not interviewable person (personId3)
            testInterviewWithRandomSequence.response._RandomSequence = ['personId2', 'personId3'];

            // Prepare the previous navigation state
            const currentSectionData = {
                sectionShortname: currentSection,
                iterationContext: undefined
            }

            // Navigate to specific section
            const nextSectionResult = navigationService.navigate({ interview: testInterviewWithRandomSequence, currentSection: _cloneDeep(currentSectionData), direction: 'forward'});
            expect(mockShuffle).toHaveBeenCalledWith(['personId1', 'personId2']);
            expect(nextSectionResult).toEqual({
                targetSection: {
                    sectionShortname: expectedSection,
                    iterationContext: expectedIterationContext
                },
                valuesByPath: { 'response._activePersonId': expectedIterationContext[0], 'response._RandomSequence': ['personId2', 'personId1'] }
            });
        });

        test('random, with random sequence already set, but now invalid (different length)', () => {
            const currentSection = 'householdMembers';
            const expectedSection = 'visitedPlaces';
            const expectedIterationContext = ['personId2'];

            // Set the order of the iteration contexts to randomize and mock the result
            const sectionConfig = _cloneDeep(complexSectionsConfig);
            (sectionConfig['personsTrips'] as SectionConfigWithDefaultsBlock).repeatedBlock.order = 'random';
            const navigationService = createNavigationService(sectionConfig);
            mockShuffle.mockReturnValueOnce(['personId2', 'personId1']);

            const testInterviewWithRandomSequence = _cloneDeep(testInterview);
            testInterviewWithRandomSequence.response._RandomSequence = ['personId2', 'personId3', 'personId1'];

            // Prepare the previous navigation state
            const currentSectionData = {
                sectionShortname: currentSection,
                iterationContext: undefined
            }

            // Navigate to specific section
            const nextSectionResult = navigationService.navigate({ interview: testInterviewWithRandomSequence, currentSection: _cloneDeep(currentSectionData), direction: 'forward' });
            expect(mockShuffle).toHaveBeenCalledWith(['personId1', 'personId2']);
            expect(nextSectionResult).toEqual({
                targetSection: {
                    sectionShortname: expectedSection,
                    iterationContext: expectedIterationContext
                },
                valuesByPath: { 'response._activePersonId': expectedIterationContext[0], 'response._RandomSequence': ['personId2', 'personId1'] }
            });
        });

        test('random with path prefix, with random sequence already set', () => {
            const currentSection = 'householdMembers';
            const expectedSection = 'visitedPlaces';
            const expectedIterationContext = ['person', 'personId2'];

            // Set the order of the iteration contexts to randomize
            const sectionConfig = _cloneDeep(complexSectionsConfig);
            const pathPrefix = 'person';
            (sectionConfig['personsTrips'] as SectionConfigWithDefaultsBlock).repeatedBlock.order = 'random';
            (sectionConfig['personsTrips'] as SectionConfigWithDefaultsBlock).repeatedBlock.pathPrefix = pathPrefix;
            // Set random order
            const testInterviewWithRandomSequence = _cloneDeep(testInterview);
            testInterviewWithRandomSequence.response._personRandomSequence = ['personId2', 'personId1'];
            
            const navigationService = createNavigationService(sectionConfig);

            // Prepare the previous navigation state
            const currentSectionData = {
                sectionShortname: currentSection,
                iterationContext: undefined
            }

            // Navigate to specific section
            const nextSectionResult = navigationService.navigate({ interview: testInterviewWithRandomSequence, currentSection: _cloneDeep(currentSectionData), direction: 'forward' });
            expect(mockShuffle).not.toHaveBeenCalled();
            expect(nextSectionResult).toEqual({
                targetSection: {
                    sectionShortname: expectedSection,
                    iterationContext: expectedIterationContext
                },
                valuesByPath: { 'response._activePersonId': expectedIterationContext[1] }
            });
        });

        test('random, last section of last iteration', () => {
            const currentSection = 'travelBehavior';
            const currentIterationContext = ['personId1'];
            const expectedSection = 'end';
            const expectedIterationContext = undefined;

            // Set the order of the iteration contexts to randomize and mock the result
            const sectionConfig = _cloneDeep(complexSectionsConfig);
            (sectionConfig['personsTrips'] as SectionConfigWithDefaultsBlock).repeatedBlock.order = 'random';
            const navigationService = createNavigationService(sectionConfig);

            // Set random order
            const testInterviewWithRandomSequence = _cloneDeep(testInterview);
            testInterviewWithRandomSequence.response._RandomSequence = ['personId2', 'personId1'];

            // Prepare the previous navigation state
            const currentSectionData = {
                sectionShortname: currentSection,
                iterationContext: currentIterationContext
            };

            // Navigate to specific section
            const nextSectionResult = navigationService.navigate({ interview: testInterviewWithRandomSequence, currentSection: _cloneDeep(currentSectionData), direction: 'forward'});
            expect(mockShuffle).not.toHaveBeenCalled();
            expect(nextSectionResult).toEqual({
                targetSection: {
                    sectionShortname: expectedSection,
                    iterationContext: expectedIterationContext
                },
                valuesByPath: { 'response._activePersonId': undefined }
            });
        });

        test('sequential', () => {
            const currentSection = 'householdMembers';
            const expectedSection = 'visitedPlaces';
            const expectedIterationContext = ['personId1'];

            // Set the order of the iteration contexts to sequential and make sure mockShuffle is not called
            const sectionConfig = _cloneDeep(complexSectionsConfig);
            (sectionConfig['personsTrips'] as SectionConfigWithDefaultsBlock).repeatedBlock.order = 'sequential';
            
            const navigationService = createNavigationService(sectionConfig);

            // Prepare the previous navigation state
            const currentSectionData = {
                sectionShortname: currentSection,
                iterationContext: undefined
            }

            // Navigate to specific section
            const nextSectionResult = navigationService.navigate({ interview: testInterview, currentSection: _cloneDeep(currentSectionData), direction: 'forward' });
            expect(nextSectionResult).toEqual({
                targetSection: {
                    sectionShortname: expectedSection,
                    iterationContext: expectedIterationContext
                },
                valuesByPath: { 'response._activePersonId': expectedIterationContext[0] }
            });
            expect(mockShuffle).not.toHaveBeenCalled();
        });
    });

    describe('with path prefix', () => {
        test('iteration with path prefix', () => {
            const currentSection = 'visitedPlaces';
            const currentIterationContext = ['person', 'personId1'];
            const expectedSection = 'travelBehavior';
            const expectedIterationContext = ['person', 'personId1'];

            // Prepare the interview with section navigation history and a household
            const testInterview = _cloneDeep(interview);
            // FIXME The type of the _sections is not quite right, this should be valid but it is not
            testInterview.response._sections = {
                home: { _startedAt: 1, _isCompleted: true },
                householdMembers: { _startedAt: 2, _isCompleted: true },
                personsTrips: {
                    _startedAt: 6,
                    _isCompleted: true,
                    personId1: { _startedAt: 6, _isCompleted: true }
                },
                selectPerson: {
                    _startedAt: 9,
                    _isCompleted: true,
                    personId1: { _startedAt: 9, _isCompleted: true }
                },
                visitedPlaces: {
                    _startedAt: 12,
                    _isCompleted: true,
                    personId1: { _startedAt: 12, _isCompleted: true }
                },
                travelBehavior: {
                    _startedAt: 20,
                    _isCompleted: true
                },
                end: { _startedAt: 40, _isCompleted: true },
                _actions: [
                    { section: 'home', action: 'start' as const, ts: 1 },
                    { section: 'householdMembers', action: 'start' as const, ts: 2 },
                    { section: 'personsTrips', iterationContext: ['personId1'], action: 'start' as const, ts: 6 },
                    { section: 'selectPerson', iterationContext: ['personId1'], action: 'start' as const, ts: 9 },
                    { section: 'visitedPlaces', iterationContext: ['personId1'], action: 'start' as const, ts: 12 }
                ]
            } as any;
            Object.assign(testInterview.response, hhWithPersonsResponse);
            testInterview.response._activePersonId = 'personId1';

            // Prepare the previous navigation state
            const currentSectionData = {
                sectionShortname: currentSection,
                iterationContext: currentIterationContext
            }

            // Prepare section configuration with a path prefix and create navigation service
            const sectionConfig = _cloneDeep(complexSectionsConfig);
            const pathPrefix = 'person';
            (sectionConfig['personsTrips'] as SectionConfigWithDefaultsBlock).repeatedBlock.pathPrefix = pathPrefix;
            const navigationService = createNavigationService(sectionConfig);

            // Navigate to specific section
            const nextSectionResult = navigationService.navigate({ interview: testInterview, currentSection: _cloneDeep(currentSectionData), direction: 'forward' });
            expect(nextSectionResult).toEqual({
                targetSection: {
                    sectionShortname: expectedSection,
                    iterationContext: expectedIterationContext
                },
                valuesByPath: undefined
            });
            expect(tbIsSectionVisible).toHaveBeenCalledWith(testInterview, ['person', 'personId1']);
        });

        test('iteration with path prefix on selection section', () => {
            const currentSection = 'selectPerson';
            const currentIterationContext = ['person', 'personId1'];
            const expectedSection = 'visitedPlaces';
            const expectedIterationContext = ['person', 'personId1'];

            // Prepare the interview with section navigation history and a household
            const testInterview = _cloneDeep(interview);
            // FIXME The type of the _sections is not quite right, this should be valid but it is not
            testInterview.response._sections = {
                home: { _startedAt: 1, _isCompleted: true },
                householdMembers: { _startedAt: 2, _isCompleted: true },
                personsTrips: {
                    _startedAt: 6,
                    _isCompleted: true,
                    personId1: { _startedAt: 6, _isCompleted: true }
                },
                selectPerson: {
                    _startedAt: 9,
                    _isCompleted: true,
                    personId1: { _startedAt: 9, _isCompleted: true }
                },
                visitedPlaces: {
                    _startedAt: 12,
                    _isCompleted: true,
                },
                _actions: [
                    { section: 'home', action: 'start' as const, ts: 1 },
                    { section: 'householdMembers', action: 'start' as const, ts: 2 },
                    { section: 'personsTrips', iterationContext: ['personId1'], action: 'start' as const, ts: 6 },
                    { section: 'selectPerson', iterationContext: ['personId1'], action: 'start' as const, ts: 9 },
                ]
            } as any;
            Object.assign(testInterview.response, hhWithPersonsResponse);
            testInterview.response._activePersonId = 'personId1';

            // Prepare the previous navigation state
            const currentSectionData = {
                sectionShortname: currentSection,
                iterationContext: currentIterationContext
            }

            // Prepare section configuration with a path prefix and create navigation service
            const sectionConfig = _cloneDeep(complexSectionsConfig);
            const pathPrefix = 'person';
            (sectionConfig['personsTrips'] as SectionConfigWithDefaultsBlock).repeatedBlock.pathPrefix = pathPrefix;
            const navigationService = createNavigationService(sectionConfig);

            // Navigate to specific section
            const nextSectionResult = navigationService.navigate({ interview: testInterview, currentSection: _cloneDeep(currentSectionData), direction: 'forward' });
            expect(nextSectionResult).toEqual({
                targetSection: {
                    sectionShortname: expectedSection,
                    iterationContext: expectedIterationContext
                },
                valuesByPath: undefined
            });
        });
    });

    describe('isIterationValid', () => {
        // Set the `isIterationValid` function of the block
        const sectionConfig = _cloneDeep(complexSectionsConfig);
        const mockIsIterationValid = jest.fn().mockReturnValue(true);
        (sectionConfig['personsTrips'] as SectionConfigWithDefaultsBlock).repeatedBlock.isIterationValid = mockIsIterationValid;

        const navigationService = createNavigationService(sectionConfig);

        beforeEach(() => {
            mockIsIterationValid.mockReset();
            mockIsIterationValid.mockReturnValue(true);
        })

        test('Last iteration, all iterations valid', () => {
            const currentSection = 'travelBehavior';
            const currentIterationContext = ['personId2'];
            const expectedSection = 'end';
            const expectedIterationContext = undefined;

            // Prepare the interview with section navigation history and a household
            const testInterview = _cloneDeep(interview);
            // FIXME The type of the _sections is not quite right, this should be valid but it is not
            testInterview.response._sections = {
                home: { _startedAt: 1, _isCompleted: true },
                householdMembers: { _startedAt: 2, _isCompleted: true },
                personsTrips: {
                    _startedAt: 6,
                    _isCompleted: true,
                    personId1: { _startedAt: 6, _isCompleted: true },
                    personId2: { _startedAt: 18, _isCompleted: true }
                },
                selectPerson: {
                    _startedAt: 9,
                    _isCompleted: true,
                    personId1: { _startedAt: 9, _isCompleted: true },
                    personId2: { _startedAt: 20, _isCompleted: true }
                },
                visitedPlaces: {
                    _startedAt: 12,
                    _isCompleted: true,
                    personId1: { _startedAt: 12, _isCompleted: true },
                    personId2: { _startedAt: 22, _isCompleted: true }
                },
                travelBehavior: {
                    _startedAt: 20,
                    _isCompleted: true,
                    personId1: { _startedAt: 15, _isCompleted: true },
                    personId2: { _startedAt: 24, _isCompleted: true }
                },
                end: { _startedAt: 40, _isCompleted: true },
                _actions: [
                    { section: 'home', action: 'start' as const, ts: 1 },
                    { section: 'householdMembers', action: 'start' as const, ts: 2 },
                    { section: 'personsTrips', iterationContext: ['personId1'], action: 'start' as const, ts: 6 },
                    { section: 'selectPerson', iterationContext: ['personId1'], action: 'start' as const, ts: 9 },
                    { section: 'visitedPlaces', iterationContext: ['personId1'], action: 'start' as const, ts: 12 },
                    { section: 'travelBehavior', iterationContext: ['personId1'], action: 'start' as const, ts: 15 },
                    { section: 'selectPerson', iterationContext: ['personId2'], action: 'start' as const, ts: 20 },
                    { section: 'visitedPlaces', iterationContext: ['personId2'], action: 'start' as const, ts: 22 },
                    { section: 'travelBehavior', iterationContext: ['personId2'], action: 'start' as const, ts: 24 }
                ]
            } as any;
            Object.assign(testInterview.response, hhWithPersonsResponse);
            testInterview.response._activePersonId = 'personId2';

            // Prepare the previous navigation state
            const currentSectionData = {
                sectionShortname: currentSection,
                iterationContext: currentIterationContext
            }

            // Navigate to specific section
            const nextSectionResult = navigationService.navigate({ interview: testInterview, currentSection: _cloneDeep(currentSectionData), direction: 'forward' });
            expect(nextSectionResult).toEqual({
                targetSection: {
                    sectionShortname: expectedSection,
                    iterationContext: expectedIterationContext
                },
                valuesByPath: { 'response._activePersonId': undefined }
            });
            expect(mockIsIterationValid).toHaveBeenCalledWith(testInterview, ['personId1']);
            expect(mockIsIterationValid).toHaveBeenCalledWith(testInterview, ['personId2']);
        });

        test('Last iteration, first one is invalid, should navigate to it', () => {
            const currentSection = 'travelBehavior';
            const currentIterationContext = ['personId2'];
            const expectedSection = 'visitedPlaces';
            const expectedIterationContext = ['personId1'];

            mockIsIterationValid.mockReturnValueOnce(false);

            // Prepare the interview with section navigation history and a household
            const testInterview = _cloneDeep(interview);
            // FIXME The type of the _sections is not quite right, this should be valid but it is not
            testInterview.response._sections = {
                home: { _startedAt: 1, _isCompleted: true },
                householdMembers: { _startedAt: 2, _isCompleted: true },
                personsTrips: {
                    _startedAt: 6,
                    _isCompleted: true,
                    personId1: { _startedAt: 6, _isCompleted: true },
                    personId2: { _startedAt: 18, _isCompleted: true }
                },
                selectPerson: {
                    _startedAt: 9,
                    _isCompleted: true,
                    personId1: { _startedAt: 9, _isCompleted: true },
                    personId2: { _startedAt: 20, _isCompleted: true }
                },
                visitedPlaces: {
                    _startedAt: 12,
                    _isCompleted: true,
                    personId1: { _startedAt: 12, _isCompleted: true },
                    personId2: { _startedAt: 22, _isCompleted: true }
                },
                travelBehavior: {
                    _startedAt: 20,
                    _isCompleted: true,
                    personId1: { _startedAt: 15, _isCompleted: true },
                    personId2: { _startedAt: 24, _isCompleted: true }
                },
                end: { _startedAt: 40, _isCompleted: true },
                _actions: [
                    { section: 'home', action: 'start' as const, ts: 1 },
                    { section: 'householdMembers', action: 'start' as const, ts: 2 },
                    { section: 'personsTrips', iterationContext: ['personId1'], action: 'start' as const, ts: 6 },
                    { section: 'selectPerson', iterationContext: ['personId1'], action: 'start' as const, ts: 9 },
                    { section: 'visitedPlaces', iterationContext: ['personId1'], action: 'start' as const, ts: 12 },
                    { section: 'travelBehavior', iterationContext: ['personId1'], action: 'start' as const, ts: 15 },
                    { section: 'selectPerson', iterationContext: ['personId2'], action: 'start' as const, ts: 20 },
                    { section: 'visitedPlaces', iterationContext: ['personId2'], action: 'start' as const, ts: 22 },
                    { section: 'travelBehavior', iterationContext: ['personId2'], action: 'start' as const, ts: 24 }
                ]
            } as any;
            Object.assign(testInterview.response, hhWithPersonsResponse);
            testInterview.response._activePersonId = 'personId2';

            // Prepare the previous navigation state
            const currentSectionData = {
                sectionShortname: currentSection,
                iterationContext: currentIterationContext
            }

            // Navigate to specific section
            const nextSectionResult = navigationService.navigate({ interview: testInterview, currentSection: _cloneDeep(currentSectionData), direction: 'forward' });
            expect(nextSectionResult).toEqual({
                targetSection: {
                    sectionShortname: expectedSection,
                    iterationContext: expectedIterationContext
                },
                valuesByPath: { 'response._activePersonId': expectedIterationContext[0] }
            });
            expect(mockIsIterationValid).toHaveBeenCalledWith(testInterview, ['personId1']);
        });

        test('first iteration, should navigate to next one without calling isIterationValid', () => {
            const currentSection = 'travelBehavior';
            const currentIterationContext = ['personId1'];
            const expectedSection = 'visitedPlaces';
            const expectedIterationContext = ['personId2'];

            // Prepare the interview with section navigation history and a household
            const testInterview = _cloneDeep(interview);
            // FIXME The type of the _sections is not quite right, this should be valid but it is not
            testInterview.response._sections = {
                home: { _startedAt: 1, _isCompleted: true },
                householdMembers: { _startedAt: 2, _isCompleted: true },
                personsTrips: {
                    _startedAt: 6,
                    _isCompleted: true,
                    personId1: { _startedAt: 6, _isCompleted: true }
                },
                selectPerson: {
                    _startedAt: 9,
                    _isCompleted: true,
                    personId1: { _startedAt: 9, _isCompleted: true }
                },
                visitedPlaces: {
                    _startedAt: 12,
                    _isCompleted: true,
                    personId1: { _startedAt: 12, _isCompleted: true }
                },
                travelBehavior: {
                    _startedAt: 20,
                    _isCompleted: true,
                    personId1: { _startedAt: 15, _isCompleted: true }
                },
                end: { _startedAt: 40, _isCompleted: true },
                _actions: [
                    { section: 'home', action: 'start' as const, ts: 1 },
                    { section: 'householdMembers', action: 'start' as const, ts: 2 },
                    { section: 'personsTrips', iterationContext: ['personId1'], action: 'start' as const, ts: 6 },
                    { section: 'selectPerson', iterationContext: ['personId1'], action: 'start' as const, ts: 9 },
                    { section: 'visitedPlaces', iterationContext: ['personId1'], action: 'start' as const, ts: 12 },
                    { section: 'travelBehavior', iterationContext: ['personId1'], action: 'start' as const, ts: 15 }
                ]
            } as any;
            Object.assign(testInterview.response, hhWithPersonsResponse);
            testInterview.response._activePersonId = 'personId1';

            // Prepare the previous navigation state
            const currentSectionData = {
                sectionShortname: currentSection,
                iterationContext: currentIterationContext
            }

            // Navigate to specific section
            const nextSectionResult = navigationService.navigate({ interview: testInterview, currentSection: _cloneDeep(currentSectionData), direction: 'forward' });
            expect(nextSectionResult).toEqual({
                targetSection: {
                    sectionShortname: expectedSection,
                    iterationContext: expectedIterationContext
                },
                valuesByPath: { 'response._activePersonId': expectedIterationContext[0] }
            });
            expect(mockIsIterationValid).not.toHaveBeenCalled();
        });
    });

    describe('onSectionEntry/Exit', () => {
        // Set the `onSectionEntry` and `onSectionExit` to the household and home sections respectively
        const sectionConfig = _cloneDeep(simpleSectionsConfig);
        const mockOnEnterHh = jest.fn();
        const mockOnExitHome = jest.fn();
        sectionConfig.householdMembers.onSectionEntry = mockOnEnterHh;
        sectionConfig.home.onSectionExit = mockOnExitHome;

        const navigationService = createNavigationService(sectionConfig);

        beforeEach(() => {
            jest.clearAllMocks();
        })

        test('Entering household section through navigation from nowhere', () => {
            // Prepare expected sections and on enter values by path
            const expectedSection = 'householdMembers';
            const onEnterValues = { 'response.onEnterHh': 'Section was entered' };
            mockOnEnterHh.mockReturnValueOnce(onEnterValues);

            // Prepare the interview with section navigation history
            const testInterview = _cloneDeep(interview);
            // FIXME The type of the _sections is not quite right, this should be valid but it is not
            testInterview.response._sections = {
                home: { _startedAt: 1, _isCompleted: true },
                householdMembers: { _startedAt: 2 },
                _actions: [
                    { section: 'home', action: 'start' as const, ts: 1 },
                    { section: 'householdMembers', action: 'start' as const, ts: 2 }
                ]
            } as any;

            // Navigate to last visited section
            const nextSectionResult = navigationService.initNavigationState({ interview: testInterview });
            expect(nextSectionResult).toEqual({
                targetSection: {
                    sectionShortname: expectedSection,
                    iterationContext: undefined
                },
                valuesByPath: onEnterValues
            });
            expect(mockOnEnterHh).toHaveBeenCalledWith(testInterview, undefined);
            expect(mockOnExitHome).not.toHaveBeenCalled();
        });

        test('Navigating from home to household', () => {
            // Prepare expected sections and on enter values by path
            const currentSection = 'home';
            const expectedSection = 'householdMembers';
            const onEnterValues = { 'response.onEnterHh': 'Section was entered' };
            const onExitValues = { 'response.onExitHome': 'Section was exited' };
            mockOnEnterHh.mockReturnValueOnce(onEnterValues);
            mockOnExitHome.mockReturnValueOnce(onExitValues);

            // Prepare the interview with section navigation history
            const testInterview = _cloneDeep(interview);
            // FIXME The type of the _sections is not quite right, this should be valid but it is not
            testInterview.response._sections = {
                home: { _startedAt: 1, _isCompleted: true },
                householdMembers: { _startedAt: 2 },
                _actions: [
                    { section: 'home', action: 'start' as const, ts: 1 }
                ]
            } as any;

            // Prepare the previous navigation state
            const currentSectionData = {
                sectionShortname: currentSection,
                iterationContext: undefined
            }

            // Navigate to next section
            const nextSectionResult = navigationService.navigate({ interview: testInterview, currentSection: currentSectionData });
            expect(nextSectionResult).toEqual({
                targetSection: {
                    sectionShortname: expectedSection,
                    iterationContext: undefined
                },
                valuesByPath: Object.assign({}, onEnterValues, onExitValues)
            });
            expect(mockOnEnterHh).toHaveBeenCalledWith(testInterview, undefined);
            expect(mockOnExitHome).toHaveBeenCalledWith(testInterview, undefined);
        });

        test('Entering end section with home as previous', () => {
            // Prepare expected sections and on enter values by path
            const currentSection = 'home';
            const expectedSection = 'end';
            const onExitValues = { 'response.onExitHome': 'Section was exited' };
            mockOnExitHome.mockReturnValueOnce(onExitValues);

            // Prepare the interview with section navigation history
            const testInterview = _cloneDeep(interview);
            // FIXME The type of the _sections is not quite right, this should be valid but it is not
            testInterview.response._sections = {
                home: { _startedAt: 1, _isCompleted: true },
                householdMembers: { _startedAt: 2, _isCompleted: true },
                _actions: [
                    { section: 'home', action: 'start' as const, ts: 1 },
                    { section: 'householdMembers', action: 'start' as const, ts: 2 }
                ]
            } as any;

            // Prepare the previous navigation state
            const currentSectionData = {
                sectionShortname: currentSection,
                iterationContext: undefined
            }

            // Navigate to next section
            const nextSectionResult = navigationService.initNavigationState({ interview: testInterview, requestedSection: 'end', currentSection: currentSectionData });
            expect(nextSectionResult).toEqual({
                targetSection: {
                    sectionShortname: expectedSection,
                    iterationContext: undefined
                },
                valuesByPath: Object.assign({}, onExitValues)
            });
            expect(mockOnEnterHh).not.toHaveBeenCalled();
            expect(mockOnExitHome).toHaveBeenCalledWith(testInterview, undefined);
        });

        test('Navigating from household to end, should not call any function', () => {
            // Prepare expected sections and on enter values by path
            const currentSection = 'householdMembers';
            const expectedSection = 'end';
            const onExitValues = { 'response.onExitHome': 'Section was exited' };
            mockOnExitHome.mockReturnValueOnce(onExitValues);

            // Prepare the interview with section navigation history
            const testInterview = _cloneDeep(interview);
            // FIXME The type of the _sections is not quite right, this should be valid but it is not
            testInterview.response._sections = {
                home: { _startedAt: 1, _isCompleted: true },
                householdMembers: { _startedAt: 2, _isCompleted: true },
                _actions: [
                    { section: 'home', action: 'start' as const, ts: 1 },
                    { section: 'householdMembers', action: 'start' as const, ts: 2 }
                ]
            } as any;

            // Prepare the previous navigation state
            const currentSectionData = {
                sectionShortname: currentSection,
                iterationContext: undefined
            }

            // Navigate to next section
            const nextSectionResult = navigationService.navigate({ interview: testInterview, currentSection: currentSectionData });
            expect(nextSectionResult).toEqual({
                targetSection: {
                    sectionShortname: expectedSection,
                    iterationContext: undefined
                },
                valuesByPath: undefined
            });
            expect(mockOnEnterHh).not.toHaveBeenCalled();
            expect(mockOnExitHome).not.toHaveBeenCalled();
        });
    });
    
});

describe('Exceptions in sectionConfig\'s functions', () => {
    test('onSectionEntry throws an error', () => {
        // Prepare the interview with section navigation history
        const testInterview = _cloneDeep(interview);
        // FIXME The type of the _sections is not quite right, this should be valid but it is not
        testInterview.response._sections = {
            home: { _startedAt: 1, _isCompleted: true },
            householdMembers: { _startedAt: 2 },
            _actions: [
                { section: 'home', action: 'start' as const, ts: 1 },
                { section: 'householdMembers', action: 'start' as const, ts: 2 }
            ]
        } as any;

        // Set the `onSectionEntry` to throw an error
        const sectionConfig = _cloneDeep(simpleSectionsConfig);
        sectionConfig.householdMembers.onSectionEntry = () => { throw new Error('Test error'); }
        const navigationService = createNavigationService(sectionConfig);

        // Navigate to last visited section
        expect(() => navigationService.initNavigationState({ interview: testInterview })).toThrow('NavigationService: Error evaluating onSectionEntry for section householdMembers: Error: Test error');
    });

    test('onSectionExit throws an error', () => {
        // Prepare the interview with section navigation history
        const testInterview = _cloneDeep(interview);
        // FIXME The type of the _sections is not quite right, this should be valid but it is not
        testInterview.response._sections = {
            home: { _startedAt: 1, _isCompleted: true },
            householdMembers: { _startedAt: 2 },
            _actions: [
                { section: 'home', action: 'start' as const, ts: 1 },
                { section: 'householdMembers', action: 'start' as const, ts: 2 }
            ]
        } as any;

        // Set the `onSectionExit` to throw an error
        const sectionConfig = _cloneDeep(simpleSectionsConfig);
        sectionConfig.home.onSectionExit = () => { throw new Error('Test error'); }
        const navigationService = createNavigationService(sectionConfig);

        // Prepare the previous navigation state
        const currentSectionData = {
            sectionShortname: 'home',
            iterationContext: undefined
        }

        // Navigate to next section
        expect(() => navigationService.navigate({ interview: testInterview, currentSection: currentSectionData })).toThrow('NavigationService: Error evaluating onSectionExit for section home: Error: Test error');
    });

    test('isSectionVisible throws an error', () => {
        // Prepare the interview with section navigation history
        const testInterview = _cloneDeep(interview);
        // FIXME The type of the _sections is not quite right, this should be valid but it is not
        testInterview.response._sections = {
            home: { _startedAt: 1, _isCompleted: true },
            householdMembers: { _startedAt: 2 },
            _actions: [
                { section: 'home', action: 'start' as const, ts: 1 },
                { section: 'householdMembers', action: 'start' as const, ts: 2 }
            ]
        } as any;

        // Set the `isSectionVisible` to throw an error
        const sectionConfig = _cloneDeep(simpleSectionsConfig);
        sectionConfig.householdMembers.isSectionVisible = () => { throw new Error('Test error'); }
        const navigationService = createNavigationService(sectionConfig);

        // Navigate to last visited section
        expect(() => navigationService.initNavigationState({ interview: testInterview })).toThrow('NavigationService: Error evaluating isSectionVisible for section householdMembers: Error: Test error');
    });

    test('isSectionCompleted throws an error', () => {
        // Prepare the interview with section navigation history
        const testInterview = _cloneDeep(interview);
        // FIXME The type of the _sections is not quite right, this should be valid but it is not
        testInterview.response._sections = {
            home: { _startedAt: 1, _isCompleted: true },
            householdMembers: { _startedAt: 2 },
            _actions: [
                { section: 'home', action: 'start' as const, ts: 1 },
                { section: 'householdMembers', action: 'start' as const, ts: 2 }
            ]
        } as any;

        // Set the `isSectionCompleted` to throw an error
        const sectionConfig = _cloneDeep(simpleSectionsConfig);
        sectionConfig.home.isSectionCompleted = () => { throw new Error('Test error'); }
        const navigationService = createNavigationService(sectionConfig);

        // Navigate to last visited section
        expect(() => navigationService.navigate({ interview: testInterview, currentSection: { sectionShortname: 'home' } })).toThrow('NavigationService: Error evaluating isSectionCompleted for section home: Error: Test error');
    });

    test('enableConditional throws an error', () => {
        // Prepare the interview with section navigation history
        const testInterview = _cloneDeep(interview);
        // FIXME The type of the _sections is not quite right, this should be valid but it is not
        testInterview.response._sections = {
            home: { _startedAt: 1, _isCompleted: true },
            householdMembers: { _startedAt: 2 },
            _actions: [
                { section: 'home', action: 'start' as const, ts: 1 },
                { section: 'householdMembers', action: 'start' as const, ts: 2 }
            ]
        } as any;

        // Set the `enableConditional` to throw an error
        const sectionConfig = _cloneDeep(simpleSectionsConfig);
        sectionConfig.householdMembers.enableConditional = () => { throw new Error('Test error'); }
        const navigationService = createNavigationService(sectionConfig);

        // Navigate to last visited section
        expect(() => navigationService.initNavigationState({ interview: testInterview })).toThrow('NavigationService: Error evaluating enableConditional for section householdMembers: Error: Test error');
    });

    test('isIterationValid throws an error', () => {
        // Prepare the interview with section navigation history and a household
        const testInterview = _cloneDeep(interview);
        // FIXME The type of the _sections is not quite right, this should be valid but it is not
        testInterview.response._sections = {
            home: { _startedAt: 1, _isCompleted: true },
            householdMembers: { _startedAt: 2, _isCompleted: true },
            personsTrips: {
                _startedAt: 6,
                _isCompleted: true,
                personId1: { _startedAt: 6, _isCompleted: true },
                personId2: { _startedAt: 18, _isCompleted: true }
            },
            selectPerson: {
                _startedAt: 9,
                _isCompleted: true,
                personId1: { _startedAt: 9, _isCompleted: true },
                personId2: { _startedAt: 20, _isCompleted: true }
            },
            visitedPlaces: {
                _startedAt: 12,
                _isCompleted: true,
                personId1: { _startedAt: 12, _isCompleted: true },
                personId2: { _startedAt: 22, _isCompleted: true }
            },
            travelBehavior: {
                _startedAt: 20,
                _isCompleted: true,
                personId1: { _startedAt: 15, _isCompleted: true },
                personId2: { _startedAt: 24, _isCompleted: true }
            },
            end: { _startedAt: 40, _isCompleted: true },
            _actions: [
                { section: 'home', action: 'start' as const, ts: 1 },
                { section: 'householdMembers', action: 'start' as const, ts: 2 },
                { section: 'personsTrips', iterationContext: ['personId1'], action: 'start' as const, ts: 6 },
                { section: 'selectPerson', iterationContext: ['personId1'], action: 'start' as const, ts: 9 },
                { section: 'visitedPlaces', iterationContext: ['personId1'], action: 'start' as const, ts: 12 },
                { section: 'travelBehavior', iterationContext: ['personId1'], action: 'start' as const, ts: 15 },
                { section: 'selectPerson', iterationContext: ['personId2'], action: 'start' as const, ts: 20 },
                { section: 'visitedPlaces', iterationContext: ['personId2'], action: 'start' as const, ts: 22 },
                { section: 'travelBehavior', iterationContext: ['personId2'], action: 'start' as const, ts: 24 }
            ]
        } as any;
        Object.assign(testInterview.response, hhWithPersonsResponse);
        testInterview.response._activePersonId = 'personId2';

        // Set the `isIterationValid` function to throw an error
        const sectionConfig = _cloneDeep(complexSectionsConfig);
        (sectionConfig['personsTrips'] as SectionConfigWithDefaultsBlock).repeatedBlock.isIterationValid = () => { throw new Error('Test error'); }
        
        const navigationService = createNavigationService(sectionConfig);

        // Prepare the previous navigation state
        const currentSection = 'travelBehavior';
        const currentIterationContext = ['personId2'];
        const currentSectionData = {
            sectionShortname: currentSection,
            iterationContext: currentIterationContext
        }

        // Navigate to specific section
        expect(() => navigationService.navigate({ interview: testInterview, currentSection: _cloneDeep(currentSectionData), direction: 'forward' })).toThrow('NavigationService: Error evaluating isIterationValid for section personsTrips with iteration personId1: Error: Test error');
    });
});
