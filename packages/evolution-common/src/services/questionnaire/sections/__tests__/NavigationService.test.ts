/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import {  SurveySectionsConfig } from '../../types';

// TODO Add a basic interview object

describe('Simple direct navigation, each section in nav bar', () => {

    const simpleSectionsConfig: SurveySectionsConfig = {
        home: {
            title: 'Home',
            previousSection: null,
            nextSection: 'householdMembers',
            widgets: ['homeWidget'],
        },
        householdMembers: {
            title: 'Household members',
            previousSection: 'home',
            nextSection: 'end',
            widgets: ['hhWidget']
        },
        end: {
            title: 'End',
            previousSection: 'householdMembers',
            nextSection: null,
            widgets: ['endWidget']
        }
    };

    describe('Navigate function', () => {
        test('should navigate to the first section at the beginning', () => {
            const currentSection = null;
            const currentNavigation = [];
            const expectedSection = 'home';
            // TODO Implement the test
        });

        test('should navigate to the next section', () => {
            const currentSection = 'home';
            const currentNavigation = []; // FIXME TDB
            const expectedSection = 'householdMembers';
            // TODO Implement the test
        });

        test('should remain in end section', () => {
            const currentSection = 'end';
            const currentNavigation = []; // FIXME TDB
            const expectedSection = 'end';
            // TODO Implement the test
        });

        test('should skip section if no widget are visible and configured so', () => {
            const currentSection = 'home';
            const currentNavigation = []; // FIXME TDB
            // TODO Configure interview such that there is no visible widget on the page
            // TODO May need to define widgets
            const expectedSection = 'end';
            // TODO Implement the test
        });
    })

    describe('initNavigationState',() => {
        test('should navigate to first section when no previous navigation', () => {
            // TODO Implement the test
        });

        test('should navigate to last visited section if there are previous navigations', () => {
            // TODO Implement the test
        });

        test('should navigate to requested section, even with previous navigations that reaches later', () => {
            // TODO Implement the test
        });

        test('should navigate to last possible section if requested section is not enabled yet', () => {
            // TODO Implement the test
        });
    });

});

describe('With repeated sections per household members, skipping select in natural flow', () => {

    const tbIsSectionSkipped = jest.fn().mockReturnValue(false);
    const complexSectionsConfig: SurveySectionsConfig = {
        home: {
            title: 'Home',
            previousSection: null,
            nextSection: 'householdMembers',
            widgets: ['homeWidget']
        },
        householdMembers: {
            title: 'Household members',
            previousSection: 'home',
            nextSection: 'selectPerson',
            widgets: ['hhWidget']
        },
        personsTrips: {
            title: 'Trips',
            previousSection: 'householdMembers',
            nextSection: 'end',
            widgets: ['hhWidget'],
            repeatedBlock: {
                repeatForObjects: { type: 'builtin', path: 'interviewablePersons' },
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
            isSectionSkipped: tbIsSectionSkipped
        },
        end: {
            title: 'End',
            previousSection: 'personsTrips',
            nextSection: null,
            widgets: ['endWidget']
        }
    };

    describe('Navigate function', () => {
        test('should navigate to the first section at the beginning', () => {
            const currentSection = null;
            const currentNavigation = [];
            const expectedSection = 'home';
            // TODO Implement the test
        });

        test('should skip selection section when coming from previous section the first time', () => {
            const currentSection = 'householdMembers';
            const currentNavigation = []; // FIXME TDB
            // TODO Configure interview such that it is the first time we reach the repeated block
            const expectedSection = 'visitedPlaces';
            // TODO Implement the test
        });

        test('should skip selection section when coming from end of first iteration', () => {
            const currentSection = 'travelBehavior';
            const currentNavigation = []; // FIXME TDB
            // TODO Configure interview such that it is the end of the first iteration
            const expectedSection = 'visitedPlaces';
            // TODO Implement the test
        });

        test('should show selection section when coming from previous, but sections already visited', () => {
            const currentSection = 'householdMembers';
            const currentNavigation = []; // FIXME TDB
            // TODO Configure interview such that some persons section have been visited already
            const expectedSection = 'selectPerson';
            // TODO Implement the test
        });

        test('should navigate to the "end" section when all repeated blocks completed', () => {
            const currentSection = 'travelBehavior';
            const currentNavigation = []; // FIXME TDB
            // TODO Configure interview such that all sections are completed
            const expectedSection = 'end';
            // TODO Implement the test
        });

        test('should show selection section when entering repeated block, even if interview is completed', () => {
            const currentSection = 'householdMembers';
            const currentNavigation = []; // FIXME TDB
            // TODO Configure interview such that all sections are completed
            const expectedSection = 'selectPerson';
            // TODO Implement the test
        });

        test('should always select the correct next section for a completed interview', () => {
            // TODO Configure an interview with 3 persons such that there are 2
            // persons for which to get a repeated block, one should skip the
            // 'travelBehavior' and the interview is complete
            const expectedSectionSequence = ['home', 'householdMembers', 'selectPerson', 'visitedPlaces', 'travelBehavior', 'selectPerson', 'visitedPlaces', 'travelBehavior', 'end'];
            // TODO Implement the test
        });

    });

    describe('initNavigationState',() => {
        test('should navigate to first section when no previous navigation', () => {
            const requestedSection = undefined;
            const expectedSection = 'home';
            // TODO Implement the test
        });

        test('should navigate to last visited section if there are previous navigations, section not repeated', () => {
            const requestedSection = undefined;
            const expectedSection = 'end';
            // TODO Implement the test
        });

        test('should navigate to last visited section with correctly activated object if there are previous navigations', () => {
            const requestedSection = undefined;
            const expectedSection = 'visitedPlaces';
            // TODO Implement the test
        });

        test('should navigate to last incomplete section for activated object if requested section in a repeated block but not enabled', () => {
            const requestedSection = 'travelBehavior';
            const expectedSection = 'visitedPlaces';
            // TODO Implement the test
        });
    });
});