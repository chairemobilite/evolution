/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _cloneDeep from 'lodash/cloneDeep';
import _shuffle from 'lodash/shuffle';
import _set from 'lodash/set';
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
            sections: ['visitedPlaces', 'travelBehavior'],
            skipSelectionInNaturalFlow: true
        }
    },
    visitedPlaces: {
        title: 'Visited places',
        previousSection: 'personsTrips',
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

describe('With repeated sections per household members', () => {
    const sectionConfigWithNaturalFlow = _cloneDeep(complexSectionsConfig);
    const sectionConfigWithoutNaturalFlow = _cloneDeep(complexSectionsConfig);
    (sectionConfigWithoutNaturalFlow.personsTrips as any).repeatedBlock.skipSelectionInNaturalFlow = false;

    describe('one iteration', () => {

        let testInterviewOnePerson: UserRuntimeInterviewAttributes;

        beforeEach(() => {
            // Prepare the interview with only one person
            testInterviewOnePerson = _cloneDeep(interview);
            const testOnePersonResponse = _cloneDeep(hhWithPersonsResponse) as any;
            delete testOnePersonResponse.household.persons.personId2;
            delete testOnePersonResponse.household.persons.personId3;
            testInterviewOnePerson.response = testOnePersonResponse;
            // Reset the default return value of the visibility function
            tbIsSectionVisible.mockRestore();
            tbIsSectionVisible.mockReturnValue(true);
        });

        test.each([
            { description: 'natural flow: first section of the block', sectionConfig: sectionConfigWithNaturalFlow, expected: { section: 'visitedPlaces', context: ['personId1'], valuesByPath: { 'response._activePersonId': 'personId1' } } },
            { description: 'no natural flow: land on repeated block', sectionConfig: sectionConfigWithoutNaturalFlow, expected: { section: 'personsTrips' } }
        ])('initNavigation to repeated block with iteration incomplete: $description', ({ sectionConfig, expected }) => {
            const navigationService = createNavigationService(sectionConfig);
            const requestedSection = 'personsTrips';
            const { section: expectedSection, context: expectedContext, valuesByPath } = expected;

            // Prepare the interview with section navigation history
            // FIXME The type of the _sections is not quite right, this should be valid but it is not
            testInterviewOnePerson.response._sections = {
                home: { _startedAt: 1, _isCompleted: true },
                householdMembers: { _startedAt: 2, _isCompleted: true },
                _actions: [
                    { section: 'home', action: 'start' as const, ts: 1 },
                    { section: 'householdMembers', action: 'start' as const, ts: 2 }
                ]
            } as any;

            // Navigate to requested section
            const nextSectionResult = navigationService.initNavigationState({ interview: testInterviewOnePerson, requestedSection });
            expect(nextSectionResult).toEqual({
                targetSection: {
                    sectionShortname: expectedSection,
                    iterationContext: expectedContext
                },
                valuesByPath
            });
        });

        test.each([
            { description: 'natural flow: first section of the block', sectionConfig: sectionConfigWithNaturalFlow, expected: { section: 'visitedPlaces', context: ['personId1'], valuesByPath: { 'response._activePersonId': 'personId1' } } },
            { description: 'no natural flow: land on repeated block', sectionConfig: sectionConfigWithoutNaturalFlow, expected: { section: 'personsTrips' } }
        ])('initNavigation to repeated block with iteration complete: $description', ({ sectionConfig, expected }) => {
            const navigationService = createNavigationService(sectionConfig);
            const requestedSection = 'personsTrips';
            const { section: expectedSection, context: expectedContext, valuesByPath } = expected;

            // Prepare the interview with section navigation history
            // FIXME The type of the _sections is not quite right, this should be valid but it is not
            testInterviewOnePerson.response._sections = {
                home: { _startedAt: 1, _isCompleted: true },
                householdMembers: { _startedAt: 2, _isCompleted: true },
                personsTrips: {
                    _startedAt: 6,
                    _isCompleted: true
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
                end: { _startedAt: 30, _isCompleted: true },
                _actions: [
                    { section: 'home', action: 'start' as const, ts: 1 },
                    { section: 'householdMembers', action: 'start' as const, ts: 2 },
                    { section: 'personsTrips', action: 'start' as const, ts: 6 },
                    { section: 'visitedPlaces', iterationContext: ['personId1'], action: 'start' as const, ts: 12 },
                    { section: 'travelBehavior', iterationContext: ['personId1'], action: 'start' as const, ts: 20 },
                    { section: 'end', action: 'start' as const, ts: 30 }
                ]
            } as any;

            // Navigate to requested section
            const nextSectionResult = navigationService.initNavigationState({ interview: testInterviewOnePerson, requestedSection });
            expect(nextSectionResult).toEqual({
                targetSection: {
                    sectionShortname: expectedSection,
                    iterationContext: expectedContext
                },
                valuesByPath
            });
        });

        test.each([
            { description: 'natural flow: first section of the block', sectionConfig: sectionConfigWithNaturalFlow, expected: { section: 'visitedPlaces', context: ['personId1'], valuesByPath: { 'response._activePersonId': 'personId1' } } },
            { description: 'no natural flow: land on repeated block', sectionConfig: sectionConfigWithoutNaturalFlow, expected: { section: 'personsTrips' } }
        ])('navigate from previous section the first time: $description', ({ sectionConfig, expected }) => {
            const navigationService = createNavigationService(sectionConfig);
            const currentSection = 'householdMembers';
            const { section: expectedSection, context: expectedIteration, valuesByPath } = expected;

            // Prepare the interview with section navigation history
            // FIXME The type of the _sections is not quite right, this should be valid but it is not
            testInterviewOnePerson.response._sections = {
                home: { _startedAt: 1, _isCompleted: true },
                householdMembers: { _startedAt: 2, _isCompleted: true },
                _actions: [
                    { section: 'home', action: 'start' as const, ts: 1 },
                    { section: 'householdMembers', action: 'start' as const, ts: 2 },
                ]
            } as any;

            // Prepare the previous navigation state
            const currentSectionData = {
                sectionShortname: currentSection
            }

            // Navigate to specific section
            const nextSectionResult = navigationService.navigate({
                interview: testInterviewOnePerson,
                currentSection: _cloneDeep(currentSectionData),
                direction: 'forward'
            });
            expect(nextSectionResult).toEqual({
                targetSection: {
                    sectionShortname: expectedSection,
                    iterationContext: expectedIteration
                },
                valuesByPath
            });
        });

        test.each([
            { description: 'natural flow: go to end section', sectionConfig: sectionConfigWithNaturalFlow, expected: { section: 'end', valuesByPath: { 'response._activePersonId': undefined } } },
            { description: 'no natural flow: land on repeated block', sectionConfig: sectionConfigWithoutNaturalFlow, expected: { section: 'personsTrips', valuesByPath: { 'response._activePersonId': undefined } } }
        ])('navigate from last section of iteration: $description', ({ sectionConfig, expected }) => {
            const navigationService = createNavigationService(sectionConfig);
            const currentSection = 'travelBehavior';
            const currentIterationContext = ['personId1'];
            const { section: expectedSection, valuesByPath } = expected;

            // Prepare the interview with section navigation history
            // FIXME The type of the _sections is not quite right, this should be valid but it is not
            testInterviewOnePerson.response._sections = {
                home: { _startedAt: 1, _isCompleted: true },
                householdMembers: { _startedAt: 2, _isCompleted: true },
                personsTrips: {
                    _startedAt: 6,
                    _isCompleted: true
                },
                visitedPlaces: {
                    _startedAt: 12,
                    _isCompleted: true,
                    personId1: { _startedAt: 12, _isCompleted: true }
                },
                travelBehavior: {
                    _startedAt: 20,
                    _isCompleted: true,
                    personId1: { _startedAt: 12, _isCompleted: true }
                },
                _actions: [
                    { section: 'home', action: 'start' as const, ts: 1 },
                    { section: 'householdMembers', action: 'start' as const, ts: 2 },
                    { section: 'personsTrips', iterationContext: ['personId1'], action: 'start' as const, ts: 6 },
                    { section: 'visitedPlaces', iterationContext: ['personId1'], action: 'start' as const, ts: 12 },
                    { section: 'travelBehavior', iterationContext: ['personId1'], action: 'start' as const, ts: 12 }
                ]
            } as any;

            // Prepare the previous navigation state
            const currentSectionData = {
                sectionShortname: currentSection,
                iterationContext: currentIterationContext
            };

            // Navigate to specific section
            const nextSectionResult = navigationService.navigate({
                interview: testInterviewOnePerson,
                currentSection: _cloneDeep(currentSectionData),
                direction: 'forward'
            });
            expect(nextSectionResult).toEqual({
                targetSection: {
                    sectionShortname: expectedSection,
                    iterationContext: undefined
                },
                valuesByPath
            });
        });

        test.each([
            { description: 'natural flow: go to end section', sectionConfig: sectionConfigWithNaturalFlow, expected: { section: 'end', valuesByPath: { 'response._activePersonId': undefined } } },
            { description: 'no natural flow: land on repeated block', sectionConfig: sectionConfigWithoutNaturalFlow, expected: { section: 'personsTrips', valuesByPath: { 'response._activePersonId': undefined } } }
        ])('navigate from first section of iteration, last one skipped: $description', ({ sectionConfig, expected }) => {
            const navigationService = createNavigationService(sectionConfig);
            const currentSection = 'visitedPlaces';
            const currentIterationContext = ['personId1'];
            const { section: expectedSection, valuesByPath } = expected;
            tbIsSectionVisible.mockReturnValue(false);

            // Prepare the interview with section navigation history
            // FIXME The type of the _sections is not quite right, this should be valid but it is not
            testInterviewOnePerson.response._sections = {
                home: { _startedAt: 1, _isCompleted: true },
                householdMembers: { _startedAt: 2, _isCompleted: true },
                personsTrips: {
                    _startedAt: 6,
                    _isCompleted: true,
                    personId1: { _startedAt: 6, _isCompleted: true }
                },
                visitedPlaces: {
                    _startedAt: 12,
                    _isCompleted: true,
                    personId1: { _startedAt: 12 }
                },
                end: { _startedAt: 40, _isCompleted: true },
                _actions: [
                    { section: 'home', action: 'start' as const, ts: 1 },
                    { section: 'householdMembers', action: 'start' as const, ts: 2 },
                    { section: 'personsTrips', iterationContext: ['personId1'], action: 'start' as const, ts: 6 },
                    { section: 'visitedPlaces', iterationContext: ['personId1'], action: 'start' as const, ts: 12 }
                ]
            } as any;

            // Prepare the previous navigation state
            const currentSectionData = {
                sectionShortname: currentSection,
                iterationContext: currentIterationContext
            };

            // Navigate to specific section
            const nextSectionResult = navigationService.navigate({
                interview: testInterviewOnePerson,
                currentSection: _cloneDeep(currentSectionData),
                direction: 'forward'
            });
            expect(nextSectionResult).toEqual({
                targetSection: {
                    sectionShortname: expectedSection,
                    iterationContext: undefined
                },
                valuesByPath
            });
            expect(tbIsSectionVisible).toHaveBeenCalledWith(testInterviewOnePerson, ['personId1']);
        });

        test.each([
            { description: 'natural flow: first section of the block', sectionConfig: sectionConfigWithNaturalFlow, expected: { section: 'visitedPlaces', context: ['personId1'], valuesByPath: { 'response._activePersonId': 'personId1' } } },
            { description: 'no natural flow: land on repeated block', sectionConfig: sectionConfigWithoutNaturalFlow, expected: { section: 'personsTrips' } }
        ])('navigate backward from last section: $description', ({ sectionConfig, expected }) => {
            const navigationService = createNavigationService(sectionConfig);
            const currentSection = 'end';
            const currentIterationContext = undefined;
            const { section: expectedSection, context: expectedIterationContext, valuesByPath } = expected;

            // Prepare the interview with section navigation history
            // FIXME The type of the _sections is not quite right, this should be valid but it is not
            testInterviewOnePerson.response._sections = {
                home: { _startedAt: 1, _isCompleted: true },
                householdMembers: { _startedAt: 2, _isCompleted: true },
                personsTrips: {
                    _startedAt: 6,
                    _isCompleted: true,
                    personId1: { _startedAt: 6, _isCompleted: true }
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
                    { section: 'visitedPlaces', iterationContext: ['personId1'], action: 'start' as const, ts: 12 },
                    { section: 'travelBehavior', iterationContext: ['personId1'], action: 'start' as const, ts: 20 },
                    { section: 'end', action: 'start' as const, ts: 40 }
                ]
            } as any;

            // Prepare the previous navigation state
            const currentSectionData = {
                sectionShortname: currentSection,
                iterationContext: currentIterationContext
            }

            // Navigate to specific section
            const nextSectionResult = navigationService.navigate({
                interview: testInterviewOnePerson,
                currentSection: _cloneDeep(currentSectionData),
                direction: 'backward'
            });
            expect(nextSectionResult).toEqual({
                targetSection: {
                    sectionShortname: expectedSection,
                    iterationContext: expectedIterationContext
                },
                valuesByPath
            });
        });

        test.each([
            { description: 'natural flow: preceding section', sectionConfig: sectionConfigWithNaturalFlow, expected: { section: 'householdMembers', valuesByPath: { 'response._activePersonId': undefined } } },
            { description: 'no natural flow: land on repeated block', sectionConfig: sectionConfigWithoutNaturalFlow, expected: { section: 'personsTrips', valuesByPath: { 'response._activePersonId': undefined } } }
        ])('navigate backward from first block section: $description', ({ sectionConfig, expected }) => {
            const navigationService = createNavigationService(sectionConfig);
            const currentSection = 'visitedPlaces';
            const currentIterationContext = ['personId1'];
            const { section: expectedSection, valuesByPath } = expected;

            // Prepare the interview with section navigation history
            // FIXME The type of the _sections is not quite right, this should be valid but it is not
            testInterviewOnePerson.response._sections = {
                home: { _startedAt: 1, _isCompleted: true },
                householdMembers: { _startedAt: 2, _isCompleted: true },
                personsTrips: {
                    _startedAt: 6,
                    _isCompleted: true,
                    personId1: { _startedAt: 6, _isCompleted: true }
                },
                visitedPlaces: {
                    _startedAt: 12,
                    _isCompleted: true,
                    personId1: { _startedAt: 12 }
                },
                end: { _startedAt: 40, _isCompleted: true },
                _actions: [
                    { section: 'home', action: 'start' as const, ts: 1 },
                    { section: 'householdMembers', action: 'start' as const, ts: 2 },
                    { section: 'personsTrips', iterationContext: ['personId1'], action: 'start' as const, ts: 6 },
                    { section: 'visitedPlaces', iterationContext: ['personId1'], action: 'start' as const, ts: 12 },
                    { section: 'end', action: 'start' as const, ts: 40 }
                ]
            } as any;

            // Prepare the previous navigation state
            const currentSectionData = {
                sectionShortname: currentSection,
                iterationContext: currentIterationContext
            }

            // Navigate to specific section
            const nextSectionResult = navigationService.navigate({
                interview: testInterviewOnePerson,
                currentSection: _cloneDeep(currentSectionData),
                direction: 'backward'
            });
            expect(nextSectionResult).toEqual({
                targetSection: {
                    sectionShortname: expectedSection,
                    iterationContext: undefined
                },
                valuesByPath
            });
        });
    });

    describe('multiple iterations', () => {

        // Interview with 3 persons, but only the first 2 are interviewable
        let testInterviewThreePersons: UserRuntimeInterviewAttributes;

        beforeEach(() => {
            // Prepare the interview with 3 persons
            testInterviewThreePersons = _cloneDeep(interview);
            const testThreePersonResponse = _cloneDeep(hhWithPersonsResponse) as any;
            testInterviewThreePersons.response = testThreePersonResponse;
            // Reset the default return value of the visibility function
            tbIsSectionVisible.mockRestore();
            tbIsSectionVisible.mockReturnValue(true);
        });

        test.each([
            { description: 'natural flow: first section of the block', sectionConfig: sectionConfigWithNaturalFlow, expected: { section: 'visitedPlaces', context: ['personId1'], valuesByPath: { 'response._activePersonId': 'personId1' } } },
            { description: 'no natural flow: land on repeated block', sectionConfig: sectionConfigWithoutNaturalFlow, expected: { section: 'personsTrips' } }
        ])('initNavigation to repeated block with iterations incomplete: $description', ({ sectionConfig, expected }) => {
            const navigationService = createNavigationService(sectionConfig);
            const requestedSection = 'personsTrips';
            const { section: expectedSection, context: expectedContext, valuesByPath } = expected;

            // Prepare the interview with section navigation history
            // FIXME The type of the _sections is not quite right, this should be valid but it is not
            testInterviewThreePersons.response._sections = {
                home: { _startedAt: 1, _isCompleted: true },
                householdMembers: { _startedAt: 2, _isCompleted: true },
                _actions: [
                    { section: 'home', action: 'start' as const, ts: 1 },
                    { section: 'householdMembers', action: 'start' as const, ts: 2 }
                ]
            } as any;

            // Navigate to requested section
            const nextSectionResult = navigationService.initNavigationState({ interview: testInterviewThreePersons, requestedSection });
            expect(nextSectionResult).toEqual({
                targetSection: {
                    sectionShortname: expectedSection,
                    iterationContext: expectedContext
                },
                valuesByPath
            });
        });

        test.each([
            { description: 'natural flow: land on repeated block', sectionConfig: sectionConfigWithNaturalFlow, expected: { section: 'personsTrips' } },
            { description: 'no natural flow: land on repeated block', sectionConfig: sectionConfigWithoutNaturalFlow, expected: { section: 'personsTrips' } }
        ])('initNavigation to repeated block with iteration complete: $description', ({ sectionConfig, expected }) => {
            const navigationService = createNavigationService(sectionConfig);
            const requestedSection = 'personsTrips';
            const { section: expectedSection } = expected;

            // Prepare the interview with section navigation history
            // FIXME The type of the _sections is not quite right, this should be valid but it is not
            testInterviewThreePersons.response._sections = {
                home: { _startedAt: 1, _isCompleted: true },
                householdMembers: { _startedAt: 2, _isCompleted: true },
                personsTrips: {
                    _startedAt: 6,
                    _isCompleted: true
                },
                visitedPlaces: {
                    _startedAt: 12,
                    _isCompleted: true,
                    personId1: { _startedAt: 12, _isCompleted: true },
                    personId2: { _startedAt: 25, _isCompleted: true }
                },
                travelBehavior: {
                    _startedAt: 20,
                    _isCompleted: true,
                    personId1: { _startedAt: 20, _isCompleted: true }
                },
                end: { _startedAt: 30, _isCompleted: true },
                _actions: [
                    { section: 'home', action: 'start' as const, ts: 1 },
                    { section: 'householdMembers', action: 'start' as const, ts: 2 },
                    { section: 'personsTrips', action: 'start' as const, ts: 6 },
                    { section: 'visitedPlaces', iterationContext: ['personId1'], action: 'start' as const, ts: 12 },
                    { section: 'travelBehavior', iterationContext: ['personId1'], action: 'start' as const, ts: 20 },
                    { section: 'visitedPlaces', iterationContext: ['personId2'], action: 'start' as const, ts: 25 },
                    { section: 'end', action: 'start' as const, ts: 30 }
                ]
            } as any;

            // Navigate to requested section
            const nextSectionResult = navigationService.initNavigationState({ interview: testInterviewThreePersons, requestedSection });
            expect(nextSectionResult).toEqual({
                targetSection: {
                    sectionShortname: expectedSection,
                    iterationContext: undefined
                },
                valuesByPath: undefined
            });
        });

        test.each([
            { description: 'natural flow: first section of the block', sectionConfig: sectionConfigWithNaturalFlow, expected: { section: 'visitedPlaces', context: ['personId1'], valuesByPath: { 'response._activePersonId': 'personId1' } } },
            { description: 'no natural flow: land on repeated block', sectionConfig: sectionConfigWithoutNaturalFlow, expected: { section: 'personsTrips' } }
        ])('navigate from previous section the first time: $description', ({ sectionConfig, expected }) => {
            const navigationService = createNavigationService(sectionConfig);
            const currentSection = 'householdMembers';
            const currentIterationContext = undefined;
            const { section: expectedSection, context: expectedIterationContext, valuesByPath } = expected;

            // Prepare the interview with section navigation history
            // FIXME The type of the _sections is not quite right, this should be valid but it is not
            testInterviewThreePersons.response._sections = {
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
                iterationContext: currentIterationContext
            }

            // Navigate to specific section
            const nextSectionResult = navigationService.navigate({
                interview: testInterviewThreePersons,
                currentSection: _cloneDeep(currentSectionData),
                direction: 'forward'
            });
            expect(nextSectionResult).toEqual({
                targetSection: {
                    sectionShortname: expectedSection,
                    iterationContext: expectedIterationContext
                },
                valuesByPath
            });
        });

        test.each([
            { description: 'natural flow: land on repeated block (participant can select the iteration)', sectionConfig: sectionConfigWithNaturalFlow, expected: { section: 'personsTrips' } },
            { description: 'no natural flow: land on repeated block', sectionConfig: sectionConfigWithoutNaturalFlow, expected: { section: 'personsTrips' } }
        ])('navigate from previous section with 2 iterations completed: $description', ({ sectionConfig, expected }) => {
            // Add an iteration complete function
            const sectionConfigWithIterationComplete = _cloneDeep(sectionConfig);
            // Iteration is complete and valid for personId1 and personId2
            const isIterationValid = jest.fn().mockImplementation((interview, iterationContext) => Array.isArray(iterationContext) && (iterationContext.includes('personId1') || iterationContext.includes('personId2')));
            (sectionConfigWithIterationComplete.personsTrips as any).repeatedBlock.isIterationValid = isIterationValid;
            const navigationService = createNavigationService(sectionConfigWithIterationComplete);
            const currentSection = 'householdMembers';
            const currentIterationContext = undefined;
            const { section: expectedSection } = expected;

            testInterviewThreePersons.response._sections = {
                home: { _startedAt: 1, _isCompleted: true },
                householdMembers: { _startedAt: 2, _isCompleted: true },
                personsTrips: {
                    _startedAt: 6,
                    _isCompleted: true,
                    personId1: { _startedAt: 6, _isCompleted: true },
                    personId2: { _startedAt: 22, _isCompleted: true }
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
                    personId2: { _startedAt: 30, _isCompleted: true }
                },
                _actions: [
                    { section: 'home', action: 'start' as const, ts: 1 },
                    { section: 'householdMembers', action: 'start' as const, ts: 2 },
                    { section: 'personsTrips', iterationContext: ['personId1'], action: 'start' as const, ts: 6 },
                    { section: 'visitedPlaces', iterationContext: ['personId1'], action: 'start' as const, ts: 12 },
                    { section: 'travelBehavior', iterationContext: ['personId1'], action: 'start' as const, ts: 20 },
                    { section: 'personsTrips', iterationContext: ['personId2'], action: 'start' as const, ts: 22 },
                    { section: 'visitedPlaces', iterationContext: ['personId2'], action: 'start' as const, ts: 28 },
                    { section: 'travelBehavior', iterationContext: ['personId2'], action: 'start' as const, ts: 30 }
                ]
            } as any;

            // Prepare the previous navigation state
            const currentSectionData = {
                sectionShortname: currentSection,
                iterationContext: currentIterationContext
            }

            // Navigate to specific section
            const nextSectionResult = navigationService.navigate({
                interview: testInterviewThreePersons,
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

        test.each([
            { description: 'natural flow: first section of second iteration', sectionConfig: sectionConfigWithNaturalFlow, expected: { section: 'visitedPlaces', context: ['personId2'], valuesByPath: { 'response._activePersonId': 'personId2' } } },
            { description: 'no natural flow: land on repeated block', sectionConfig: sectionConfigWithoutNaturalFlow, expected: { section: 'personsTrips', valuesByPath: { 'response._activePersonId': undefined } } }
        ])('navigate from last section of first iteration: $description', ({ sectionConfig, expected }) => {
            const navigationService = createNavigationService(sectionConfig);
            const currentSection = 'travelBehavior';
            const currentIterationContext = ['personId1'];
            const { section: expectedSection, context: expectedIterationContext, valuesByPath } = expected;

            testInterviewThreePersons.response._sections = {
                home: { _startedAt: 1, _isCompleted: true },
                householdMembers: { _startedAt: 2, _isCompleted: true },
                personsTrips: {
                    _startedAt: 6,
                    _isCompleted: true,
                    personId1: { _startedAt: 6, _isCompleted: true },
                    personId2: { _startedAt: 22, _isCompleted: true }
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
                    { section: 'visitedPlaces', iterationContext: ['personId1'], action: 'start' as const, ts: 12 },
                    { section: 'travelBehavior', iterationContext: ['personId1'], action: 'start' as const, ts: 20 }
                ]
            } as any;

            // Prepare the previous navigation state
            const currentSectionData = {
                sectionShortname: currentSection,
                iterationContext: currentIterationContext
            }

            // Navigate to specific section
            const nextSectionResult = navigationService.navigate({
                interview: testInterviewThreePersons,
                currentSection: _cloneDeep(currentSectionData),
                direction: 'forward'
            });
            expect(nextSectionResult).toEqual({
                targetSection: {
                    sectionShortname: expectedSection,
                    iterationContext: expectedIterationContext
                },
                valuesByPath
            });
        });

        test.each([
            { description: 'natural flow: go to end section', sectionConfig: sectionConfigWithNaturalFlow, expected: { section: 'end', valuesByPath: { 'response._activePersonId': undefined } } },
            { description: 'no natural flow: land on repeated block', sectionConfig: sectionConfigWithoutNaturalFlow, expected: { section: 'personsTrips', valuesByPath: { 'response._activePersonId': undefined } } }
        ])('navigate from last section of last iteration: $description', ({ sectionConfig, expected }) => {
            const navigationService = createNavigationService(sectionConfig);
            const currentSection = 'travelBehavior';
            const currentIterationContext = ['personId2'];
            const { section: expectedSection, valuesByPath } = expected;

            testInterviewThreePersons.response._sections = {
                home: { _startedAt: 1, _isCompleted: true },
                householdMembers: { _startedAt: 2, _isCompleted: true },
                personsTrips: {
                    _startedAt: 6,
                    _isCompleted: true
                },
                visitedPlaces: {
                    _startedAt: 12,
                    _isCompleted: true,
                    personId1: { _startedAt: 12, _isCompleted: true },
                    personId2: { _startedAt: 30, _isCompleted: true }
                },
                travelBehavior: {
                    _startedAt: 20,
                    _isCompleted: true,
                    personId1: { _startedAt: 20, _isCompleted: true },
                    personId2: { _startedAt: 40, _isCompleted: true }
                },
                _actions: [
                    { section: 'home', action: 'start' as const, ts: 1 },
                    { section: 'householdMembers', action: 'start' as const, ts: 2 },
                    { section: 'personsTrips', iterationContext: ['personId1'], action: 'start' as const, ts: 6 },
                    { section: 'visitedPlaces', iterationContext: ['personId1'], action: 'start' as const, ts: 12 },
                    { section: 'travelBehavior', iterationContext: ['personId1'], action: 'start' as const, ts: 20 },
                    { section: 'visitedPlaces', iterationContext: ['personId2'], action: 'start' as const, ts: 30 },
                    { section: 'travelBehavior', iterationContext: ['personId2'], action: 'start' as const, ts: 40 }
                ]
            } as any;

            // Prepare the previous navigation state
            const currentSectionData = {
                sectionShortname: currentSection,
                iterationContext: currentIterationContext
            }

            // Navigate to specific section
            const nextSectionResult = navigationService.navigate({
                interview: testInterviewThreePersons,
                currentSection: _cloneDeep(currentSectionData),
                direction: 'forward'
            });
            expect(nextSectionResult).toEqual({
                targetSection: {
                    sectionShortname: expectedSection,
                    iterationContext: undefined
                },
                valuesByPath
            });
        });

        test.each([
            { description: 'natural flow: land on repeated block to show invalid iteration', sectionConfig: sectionConfigWithNaturalFlow, expected: { section: 'personsTrips', valuesByPath: { 'response._activePersonId': undefined } } },
            { description: 'no natural flow: land on repeated block', sectionConfig: sectionConfigWithoutNaturalFlow, expected: { section: 'personsTrips', valuesByPath: { 'response._activePersonId': undefined } } }
        ])('navigate from last section of last iteration, first iteration is invalid: $description', ({ sectionConfig, expected }) => {
            // Add an iteration validation function
            const sectionConfigWithIterationComplete = _cloneDeep(sectionConfig);
            // Iteration for personId2 is not valid
            const isIterationValid = jest.fn().mockImplementation((interview, iterationContext) => Array.isArray(iterationContext) && iterationContext.includes('personId3'));
            (sectionConfigWithIterationComplete.personsTrips as any).repeatedBlock.isIterationValid = isIterationValid;

            const navigationService = createNavigationService(sectionConfigWithIterationComplete);
            const currentSection = 'travelBehavior';
            const currentIterationContext = ['personId2'];
            const { section: expectedSection, valuesByPath } = expected;

            testInterviewThreePersons.response._sections = {
                home: { _startedAt: 1, _isCompleted: true },
                householdMembers: { _startedAt: 2, _isCompleted: true },
                personsTrips: {
                    _startedAt: 6,
                    _isCompleted: true
                },
                visitedPlaces: {
                    _startedAt: 12,
                    _isCompleted: true,
                    personId1: { _startedAt: 12, _isCompleted: true },
                    personId2: { _startedAt: 30, _isCompleted: true }
                },
                travelBehavior: {
                    _startedAt: 20,
                    _isCompleted: true,
                    personId1: { _startedAt: 20, _isCompleted: true },
                    personId2: { _startedAt: 40, _isCompleted: true }
                },
                _actions: [
                    { section: 'home', action: 'start' as const, ts: 1 },
                    { section: 'householdMembers', action: 'start' as const, ts: 2 },
                    { section: 'personsTrips', iterationContext: ['personId1'], action: 'start' as const, ts: 6 },
                    { section: 'visitedPlaces', iterationContext: ['personId1'], action: 'start' as const, ts: 12 },
                    { section: 'travelBehavior', iterationContext: ['personId1'], action: 'start' as const, ts: 20 },
                    { section: 'visitedPlaces', iterationContext: ['personId2'], action: 'start' as const, ts: 30 },
                    { section: 'travelBehavior', iterationContext: ['personId2'], action: 'start' as const, ts: 40 }
                ]
            } as any;

            // Prepare the previous navigation state
            const currentSectionData = {
                sectionShortname: currentSection,
                iterationContext: currentIterationContext
            }

            // Navigate to specific section
            const nextSectionResult = navigationService.navigate({
                interview: testInterviewThreePersons,
                currentSection: _cloneDeep(currentSectionData),
                direction: 'forward'
            });
            expect(nextSectionResult).toEqual({
                targetSection: {
                    sectionShortname: expectedSection,
                    iterationContext: undefined
                },
                valuesByPath
            });
        });

        test.each([
            { description: 'natural flow: first section of the block of second iteration', sectionConfig: sectionConfigWithNaturalFlow, expected: { section: 'visitedPlaces', context: ['personId2'], valuesByPath: { 'response._activePersonId': 'personId2' } } },
            { description: 'no natural flow: land on repeated block', sectionConfig: sectionConfigWithoutNaturalFlow, expected: { section: 'personsTrips', valuesByPath: { 'response._activePersonId': undefined } } }
        ])('navigate from first section of first iteration, last one skipped: $description', ({ sectionConfig, expected }) => {
            const navigationService = createNavigationService(sectionConfig);
            const currentSection = 'visitedPlaces';
            const currentIterationContext = ['personId1'];
            const { section: expectedSection, context: expectedIterationContext, valuesByPath } = expected;
            tbIsSectionVisible.mockReturnValue(false);

            testInterviewThreePersons.response._sections = {
                home: { _startedAt: 1, _isCompleted: true },
                householdMembers: { _startedAt: 2, _isCompleted: true },
                personsTrips: {
                    _startedAt: 6,
                    _isCompleted: true
                },
                visitedPlaces: {
                    _startedAt: 12,
                    _isCompleted: true,
                    personId1: { _startedAt: 12, _isCompleted: true }
                },
                _actions: [
                    { section: 'home', action: 'start' as const, ts: 1 },
                    { section: 'householdMembers', action: 'start' as const, ts: 2 },
                    { section: 'personsTrips', iterationContext: ['personId1'], action: 'start' as const, ts: 6 },
                    { section: 'visitedPlaces', iterationContext: ['personId1'], action: 'start' as const, ts: 12 }
                ]
            } as any;

            // Prepare the previous navigation state
            const currentSectionData = {
                sectionShortname: currentSection,
                iterationContext: currentIterationContext
            }

            // Navigate to specific section
            const nextSectionResult = navigationService.navigate({
                interview: testInterviewThreePersons,
                currentSection: _cloneDeep(currentSectionData),
                direction: 'forward'
            });
            expect(nextSectionResult).toEqual({
                targetSection: {
                    sectionShortname: expectedSection,
                    iterationContext: expectedIterationContext
                },
                valuesByPath
            });
            // Visibility function should have been called once to validate section visibility
            expect(tbIsSectionVisible).toHaveBeenCalledTimes(1);
        });

        test.each([
            { description: 'natural flow: go to end', sectionConfig: sectionConfigWithNaturalFlow, expected: { section: 'end', valuesByPath: { 'response._activePersonId': undefined } } },
            { description: 'no natural flow: land on repeated block', sectionConfig: sectionConfigWithoutNaturalFlow, expected: { section: 'personsTrips', valuesByPath: { 'response._activePersonId': undefined } } }
        ])('navigate from first section of last iteration, last one skipped: $description', ({ sectionConfig, expected }) => {
            const navigationService = createNavigationService(sectionConfig);
            const currentSection = 'visitedPlaces';
            const currentIterationContext = ['personId2'];
            const { section: expectedSection, valuesByPath } = expected;
            tbIsSectionVisible.mockReturnValue(false);

            testInterviewThreePersons.response._sections = {
                home: { _startedAt: 1, _isCompleted: true },
                householdMembers: { _startedAt: 2, _isCompleted: true },
                personsTrips: {
                    _startedAt: 6,
                    _isCompleted: true
                },
                visitedPlaces: {
                    _startedAt: 12,
                    _isCompleted: true,
                    personId1: { _startedAt: 12, _isCompleted: true },
                    personId2: { _startedAt: 30, _isCompleted: true }
                },
                travelBehavior: {
                    _startedAt: 20,
                    _isCompleted: true,
                    personId1: { _startedAt: 20, _isCompleted: true },
                    personId2: { _startedAt: 40, _isCompleted: true }
                },
                _actions: [
                    { section: 'home', action: 'start' as const, ts: 1 },
                    { section: 'householdMembers', action: 'start' as const, ts: 2 },
                    { section: 'personsTrips', iterationContext: ['personId1'], action: 'start' as const, ts: 6 },
                    { section: 'visitedPlaces', iterationContext: ['personId1'], action: 'start' as const, ts: 12 },
                    { section: 'travelBehavior', iterationContext: ['personId1'], action: 'start' as const, ts: 20 },
                    { section: 'visitedPlaces', iterationContext: ['personId2'], action: 'start' as const, ts: 30 }
                ]
            } as any;

            // Prepare the previous navigation state
            const currentSectionData = {
                sectionShortname: currentSection,
                iterationContext: currentIterationContext
            }

            // Navigate to specific section
            const nextSectionResult = navigationService.navigate({
                interview: testInterviewThreePersons,
                currentSection: _cloneDeep(currentSectionData),
                direction: 'forward'
            });
            expect(nextSectionResult).toEqual({
                targetSection: {
                    sectionShortname: expectedSection,
                    iterationContext: undefined
                },
                valuesByPath
            });
        });

        test.each([
            { description: 'natural flow: land on repeated block', sectionConfig: sectionConfigWithNaturalFlow, expected: { section: 'personsTrips' } },
            { description: 'no natural flow: land on repeated block', sectionConfig: sectionConfigWithoutNaturalFlow, expected: { section: 'personsTrips' } }
        ])('navigate backward from last section: $description', ({ sectionConfig, expected }) => {
            const navigationService = createNavigationService(sectionConfig);
            const currentSection = 'end';
            const currentIterationContext = undefined;
            const { section: expectedSection } = expected;

            testInterviewThreePersons.response._sections = {
                home: { _startedAt: 1, _isCompleted: true },
                householdMembers: { _startedAt: 2, _isCompleted: true },
                personsTrips: {
                    _startedAt: 6,
                    _isCompleted: true
                },
                visitedPlaces: {
                    _startedAt: 12,
                    _isCompleted: true,
                    personId1: { _startedAt: 12, _isCompleted: true },
                    personId2: { _startedAt: 30, _isCompleted: true }
                },
                travelBehavior: {
                    _startedAt: 20,
                    _isCompleted: true,
                    personId1: { _startedAt: 20, _isCompleted: true },
                    personId2: { _startedAt: 40, _isCompleted: true }
                },
                end: { _startedAt: 70, _isCompleted: true },
                _actions: [
                    { section: 'home', action: 'start' as const, ts: 1 },
                    { section: 'householdMembers', action: 'start' as const, ts: 2 },
                    { section: 'personsTrips', iterationContext: ['personId1'], action: 'start' as const, ts: 6 },
                    { section: 'visitedPlaces', iterationContext: ['personId1'], action: 'start' as const, ts: 12 },
                    { section: 'travelBehavior', iterationContext: ['personId1'], action: 'start' as const, ts: 20 },
                    { section: 'visitedPlaces', iterationContext: ['personId2'], action: 'start' as const, ts: 30 },
                    { section: 'travelBehavior', iterationContext: ['personId2'], action: 'start' as const, ts: 40 },
                    { section: 'end', action: 'start' as const, ts: 70 },
                ]
            } as any;

            // Prepare the previous navigation state
            const currentSectionData = {
                sectionShortname: currentSection,
                iterationContext: currentIterationContext
            }

            // Navigate to specific section
            const nextSectionResult = navigationService.navigate({
                interview: testInterviewThreePersons,
                currentSection: _cloneDeep(currentSectionData),
                direction: 'backward'
            });
            expect(nextSectionResult).toEqual({
                targetSection: {
                    sectionShortname: expectedSection,
                    iterationContext: undefined
                },
                valuesByPath: undefined
            });
        });

        test.each([
            { description: 'natural flow: go to end section', activePersonId: undefined, sectionConfig: sectionConfigWithNaturalFlow, expected: { section: 'end' } },
            { description: 'no natural flow: go to end section', activePersonId: undefined, sectionConfig: sectionConfigWithoutNaturalFlow, expected: { section: 'end' } },
            { description: 'natural flow: enter iteration', activePersonId: 'personId1', sectionConfig: sectionConfigWithNaturalFlow, expected: { section: 'visitedPlaces', context: ['personId1'] } },
            { description: 'no natural flow: enter iteration', activePersonId: 'personId1', sectionConfig: sectionConfigWithoutNaturalFlow, expected: { section: 'visitedPlaces', context: ['personId1'] } }
        ])('navigate forward from block, with _activePersonId $activePersonId: $description', ({ activePersonId, sectionConfig, expected }) => {
            const navigationService = createNavigationService(sectionConfig);
            const currentSection = 'personsTrips';
            const currentIterationContext = undefined;
            // There is no values by path, as no active object to update. It is already set
            const { section: expectedSection, context: expectedIterationContext } = expected;

            testInterviewThreePersons.response._sections = {
                home: { _startedAt: 1, _isCompleted: true },
                householdMembers: { _startedAt: 2, _isCompleted: true },
                personsTrips: {
                    _startedAt: 6,
                    _isCompleted: true
                },
                visitedPlaces: {
                    _startedAt: 12,
                    _isCompleted: true,
                    personId1: { _startedAt: 12, _isCompleted: true },
                    personId2: { _startedAt: 30, _isCompleted: true }
                },
                travelBehavior: {
                    _startedAt: 20,
                    _isCompleted: true,
                    personId1: { _startedAt: 20, _isCompleted: true },
                    personId2: { _startedAt: 40, _isCompleted: true }
                },
                end: { _startedAt: 70, _isCompleted: true },
                _actions: [
                    { section: 'home', action: 'start' as const, ts: 1 },
                    { section: 'householdMembers', action: 'start' as const, ts: 2 },
                    { section: 'personsTrips', iterationContext: ['personId1'], action: 'start' as const, ts: 6 },
                    { section: 'visitedPlaces', iterationContext: ['personId1'], action: 'start' as const, ts: 12 },
                    { section: 'travelBehavior', iterationContext: ['personId1'], action: 'start' as const, ts: 20 },
                    { section: 'visitedPlaces', iterationContext: ['personId2'], action: 'start' as const, ts: 30 },
                    { section: 'travelBehavior', iterationContext: ['personId2'], action: 'start' as const, ts: 40 },
                    { section: 'end', action: 'start' as const, ts: 70 },
                ]
            } as any;
            testInterviewThreePersons.response._activePersonId = activePersonId;

            // Prepare the previous navigation state
            const currentSectionData = {
                sectionShortname: currentSection,
                iterationContext: currentIterationContext
            }

            // Navigate to specific section
            const nextSectionResult = navigationService.navigate({
                interview: testInterviewThreePersons,
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
        });

        test.each([
            { description: 'natural flow: go to previous section', sectionConfig: sectionConfigWithNaturalFlow, expected: { section: 'householdMembers', valuesByPath: { 'response._activePersonId': undefined } } },
            { description: 'no natural flow: land on repeated block', sectionConfig: sectionConfigWithoutNaturalFlow, expected: { section: 'personsTrips', valuesByPath: { 'response._activePersonId': undefined } } }
        ])('navigate backward from first block iteration: $description', ({ sectionConfig, expected }) => {
            const navigationService = createNavigationService(sectionConfig);
            const currentSection = 'visitedPlaces';
            const currentIterationContext = ['personId1'];
            const { section: expectedSection, valuesByPath } = expected;

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
                visitedPlaces: {
                    _startedAt: 12,
                    _isCompleted: true,
                    personId1: { _startedAt: 12 }
                },
                travelBehavior: {
                    _startedAt: 20,
                    _isCompleted: true,
                },
                end: { _startedAt: 40, _isCompleted: true },
                _actions: [
                    { section: 'home', action: 'start' as const, ts: 1 },
                    { section: 'householdMembers', action: 'start' as const, ts: 2 },
                    { section: 'personsTrips', iterationContext: ['personId1'], action: 'start' as const, ts: 6 },
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
                direction: 'backward'
            });
            expect(nextSectionResult).toEqual({
                targetSection: {
                    sectionShortname: expectedSection,
                    iterationContext: undefined
                },
                valuesByPath
            });
        });

        test.each([
            { description: 'natural flow', sectionConfig: sectionConfigWithNaturalFlow },
            { description: 'no natural flow', sectionConfig: sectionConfigWithoutNaturalFlow }
        ])('should navigate to the "end" if repeated block is disabled: $description', ({ sectionConfig }) => {
            const navigationService = createNavigationService(sectionConfig);
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

        test.each([
            {
                description: 'natural flow',
                sectionConfig: sectionConfigWithNaturalFlow,
                expectedSectionSequence: [
                    { sectionShortname: 'home' },
                    { sectionShortname: 'householdMembers' },
                    { sectionShortname: 'visitedPlaces', iterationContext: ['personId1'], setValues: { 'response._activePersonId': 'personId1' }, shouldSetActiveObject: true },
                    { sectionShortname: 'travelBehavior', iterationContext: ['personId1'], shouldSetActiveObject: false },
                    { sectionShortname: 'visitedPlaces', iterationContext: ['personId2'], setValues: { 'response._activePersonId': 'personId2' }, shouldSetActiveObject: true },
                    { sectionShortname: 'end', shouldSetActiveObject: true }
                ]
            },
            {
                description: 'no natural flow',
                sectionConfig: sectionConfigWithoutNaturalFlow,
                expectedSectionSequence: [
                    { sectionShortname: 'home' },
                    { sectionShortname: 'householdMembers' },
                    { sectionShortname: 'personsTrips', setValues: { 'response._activePersonId': 'personId1' } },
                    { sectionShortname: 'visitedPlaces', iterationContext: ['personId1'] },
                    { sectionShortname: 'travelBehavior', iterationContext: ['personId1'] },
                    { sectionShortname: 'personsTrips', setValues: { 'response._activePersonId': 'personId2' }, shouldSetActiveObject: true },
                    { sectionShortname: 'visitedPlaces', iterationContext: ['personId2'] },
                    { sectionShortname: 'personsTrips', shouldSetActiveObject: true },
                    { sectionShortname: 'end' }
                ]
            }
        ])('should always select the correct next section for a completed interview: $description', ({ sectionConfig, expectedSectionSequence }) => {
            const navigationService = createNavigationService(sectionConfig);
            // Skip travelBehavior for personId2
            tbIsSectionVisible.mockImplementation((interview, iterationContext) => iterationContext.includes('personId1'));

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
                (testInterview.response._sections as any)[currentSection.sectionShortname] = (testInterview.response._sections as any)[currentSection.sectionShortname] ?? {
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

                const { setValues, shouldSetActiveObject = false, ...expectedSection } = expectedSectionSequence[i] as any;

                // Navigate to specific section
                const nextSectionResult = navigationService.navigate({
                    interview: testInterview,
                    currentSection: _cloneDeep(currentSection),
                    direction: 'forward'
                });
                expect(nextSectionResult).toEqual({
                    targetSection: expectedSection,
                    valuesByPath: shouldSetActiveObject !== true ? undefined : { 'response._activePersonId': expectedSection.iterationContext ? expectedSection.iterationContext[0] : undefined }
                });
                currentSection = nextSectionResult.targetSection;

                // The next iteration may need some values that should be set by navigation so we set them first.
                if (nextSectionResult.valuesByPath) {
                    Object.keys(nextSectionResult.valuesByPath).forEach((key) => _set(testInterview, key, nextSectionResult.valuesByPath![key] as any))
                }
                // There may be interactions by the user who have triggered value update, so we make those updates
                if (setValues) {
                    Object.keys(setValues).forEach((key) => _set(testInterview, key, setValues[key] as any))
                }
            }
        });
    });

    describe.each([
        { description: 'natural flow', sectionConfig: sectionConfigWithNaturalFlow },
        { description: 'no natural flow', sectionConfig: sectionConfigWithoutNaturalFlow }
    ])('initNavigationState common scenarios with $description', ({ sectionConfig }) => {
        const navigationService = createNavigationService(sectionConfig);

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
                    { section: 'visitedPlaces', iterationContext: ['personId1'], action: 'start' as const, ts: 12 },
                    { section: 'travelBehavior', iterationContext: ['personId1'], action: 'start' as const, ts: 20 },
                    { section: 'personsTrips', iterationContext: ['personId2'], action: 'start' as const, ts: 22 },
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
                    { section: 'visitedPlaces', iterationContext: ['personId1'], action: 'start' as const, ts: 12 },
                    { section: 'travelBehavior', iterationContext: ['personId1'], action: 'start' as const, ts: 20 },
                    { section: 'personsTrips', iterationContext: ['personId2'], action: 'start' as const, ts: 22 },
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
                    { section: 'visitedPlaces', iterationContext: ['personId1'], action: 'start' as const, ts: 12 },
                    { section: 'travelBehavior', iterationContext: ['personId1'], action: 'start' as const, ts: 20 },
                    { section: 'personsTrips', iterationContext: ['personId2'], action: 'start' as const, ts: 22 },
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
                    { section: 'visitedPlaces', iterationContext: ['personId1'], action: 'start' as const, ts: 12 },
                    { section: 'travelBehavior', iterationContext: ['personId1'], action: 'start' as const, ts: 20 },
                    { section: 'personsTrips', iterationContext: ['personId2'], action: 'start' as const, ts: 22 },
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

        test('should navigate to repeated block section if requested section in a repeated block but no active object', () => {
            const requestedSection = 'travelBehavior';
            const expectedSection = 'personsTrips';

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
                    { section: 'visitedPlaces', iterationContext: ['personId1'], action: 'start' as const, ts: 12 },
                    { section: 'travelBehavior', iterationContext: ['personId1'], action: 'start' as const, ts: 20 },
                    { section: 'personsTrips', iterationContext: ['personId2'], action: 'start' as const, ts: 22 },
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

    });

     describe.each([
        { description: 'natural flow', sectionConfig: sectionConfigWithNaturalFlow },
        { description: 'no natural flow', sectionConfig: sectionConfigWithoutNaturalFlow }
    ])('Navigate function common scenarios with $description', ({ sectionConfig }) => {
        const navigationService = createNavigationService(sectionConfig);





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
            // Prepare the interview with section navigation history and a household
            // FIXME The type of the _sections is not quite right, this should be valid but it is not
            testInterviewWithRandomSequence.response._sections = {
                home: { _startedAt: 1, _isCompleted: true },
                householdMembers: { _startedAt: 2, _isCompleted: true },
                personsTrips: {
                    _startedAt: 6,
                    _isCompleted: true
                },
                visitedPlaces: {
                    _startedAt: 12,
                    _isCompleted: true,
                    personId2: { _startedAt: 12, _isCompleted: true },
                    personId1: { _startedAt: 42, _isCompleted: true }
                },
                travelBehavior: {
                    _startedAt: 20,
                    _isCompleted: true,
                    personId2: { _startedAt: 20, _isCompleted: true },
                    personId1: { _startedAt: 52 },
                },
                _actions: [
                    { section: 'home', action: 'start' as const, ts: 1 },
                    { section: 'householdMembers', action: 'start' as const, ts: 2 },
                    { section: 'personsTrips', action: 'start' as const, ts: 6 },
                    { section: 'visitedPlaces', iterationContext: ['personId2'], action: 'start' as const, ts: 12 },
                    { section: 'travelBehavior', iterationContext: ['personId2'], action: 'start' as const, ts: 20 },
                    { section: 'visitedPlaces', iterationContext: ['personId1'], action: 'start' as const, ts: 42 }
                ]
            } as any;
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
            const currentSection = 'personsTrips';
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
                visitedPlaces: {
                    _startedAt: 12,
                    _isCompleted: true,
                },
                _actions: [
                    { section: 'home', action: 'start' as const, ts: 1 },
                    { section: 'householdMembers', action: 'start' as const, ts: 2 },
                    { section: 'personsTrips', iterationContext: ['personId1'], action: 'start' as const, ts: 6 }
                ]
            } as any;
            Object.assign(testInterview.response, hhWithPersonsResponse);
            testInterview.response._activePersonId = 'personId1';

            // Prepare the previous navigation state
            const currentSectionData = {
                sectionShortname: currentSection,
                iterationContext: undefined
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
            // Reset the mock return value
            mockIsIterationValid.mockRestore();
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
                    { section: 'visitedPlaces', iterationContext: ['personId1'], action: 'start' as const, ts: 12 },
                    { section: 'travelBehavior', iterationContext: ['personId1'], action: 'start' as const, ts: 15 },
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

        test('Last iteration, first one is invalid, should land on selection section', () => {
            const currentSection = 'travelBehavior';
            const currentIterationContext = ['personId2'];
            const expectedSection = 'personsTrips';
            const expectedIterationContext = undefined;

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
                    { section: 'visitedPlaces', iterationContext: ['personId1'], action: 'start' as const, ts: 12 },
                    { section: 'travelBehavior', iterationContext: ['personId1'], action: 'start' as const, ts: 15 },
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
        });

        test('first iteration, should navigate to next one if it is not valid', () => {
            const currentSection = 'travelBehavior';
            const currentIterationContext = ['personId1'];
            const expectedSection = 'visitedPlaces';
            const expectedIterationContext = ['personId2'];
            // Valid only for first person
            mockIsIterationValid.mockImplementation((interview, iterationContext) => iterationContext.includes('personId1'))

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
                    { section: 'personsTrips', action: 'start' as const, ts: 6 },
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
            expect(mockIsIterationValid).toHaveBeenCalledWith(testInterview, ['personId2']);
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
                { section: 'visitedPlaces', iterationContext: ['personId1'], action: 'start' as const, ts: 12 },
                { section: 'travelBehavior', iterationContext: ['personId1'], action: 'start' as const, ts: 15 },
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
