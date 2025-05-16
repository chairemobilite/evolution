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
            widgets: ['hhWidget'],
            skipIfNoVisibleQuestionWidgets: true
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
        });

        test('should navigate to the next section', () => {
            const currentSection = 'home';
            const currentNavigation = []; // FIXME TDB
            const expectedSection = 'householdMembers';
        });

        test('should remain in end section', () => {
            const currentSection = 'end';
            const currentNavigation = []; // FIXME TDB
            const expectedSection = 'end';
        });

        test('should skip section if no widget are visible and configured so', () => {
            const currentSection = 'home';
            const currentNavigation = []; // FIXME TDB
            // TODO Configure interview such that there is no visible widget on the page
            // TODO May need to define widgets
            const expectedSection = 'end';
        });
    })

    describe('initNavigationState',() => {
        test('should navigate to first section when no previous navigation', () => {

        });

        test('should navigate to last visited section if there are previous navigations', () => {

        });

        test('should navigate to requested section, even with previous navigations that reaches later', () => {

        });

        test('should navigate to last possible section if requested section is not enabled yet', () => {

        });
    });

});

describe('With repeated sections per household members, skipping select in natural flow', () => {

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
                activeObjectPath: '_activePersonId',
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
            skipIfNoVisibleQuestionWidgets: true
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
        });

        test('should skip selection section when coming from previous section the first time', () => {
            const currentSection = 'householdMembers';
            const currentNavigation = []; // FIXME TDB
            // TODO Configure interview such that it is the first time we reach the repeated block
            const expectedSection = 'visitedPlaces';
        });

        test('should skip selection section when coming from end of first iteration', () => {
            const currentSection = 'travelBehavior';
            const currentNavigation = []; // FIXME TDB
            // TODO Configure interview such that it is the end of the first iteration
            const expectedSection = 'visitedPlaces';
        });

        test('should show selection section when coming from previous, but sections already visited', () => {
            const currentSection = 'householdMembers';
            const currentNavigation = []; // FIXME TDB
            // TODO Configure interview such that some persons section have been visited already
            const expectedSection = 'selectPerson';
        });

        test('should navigate to the "end" section when all repeated blocks completed', () => {
            const currentSection = 'travelBehavior';
            const currentNavigation = []; // FIXME TDB
            // TODO Configure interview such that all sections are completed
            const expectedSection = 'end';
        });

        test('should show selection section when entering repeated block, even if interview is completed', () => {
            const currentSection = 'householdMembers';
            const currentNavigation = []; // FIXME TDB
            // TODO Configure interview such that all sections are completed
            const expectedSection = 'selectPerson';
        });

        test('should always select the correct next section for a completed interview', () => {
            // TODO Configure an interview with 3 persons such that there are 2
            // persons for which to get a repeated block, one should skip the
            // 'travelBehavior' and the interview is complete
            const expectedSectionSequence = ['home', 'householdMembers', 'selectPerson', 'visitedPlaces', 'travelBehavior', 'selectPerson', 'visitedPlaces', 'travelBehavior', 'end'];
        });

    });

    describe('initNavigationState',() => {
        test('should navigate to first section when no previous navigation', () => {
            const requestedSection = undefined;
            const expectedSection = 'home';
        });

        test('should navigate to last visited section if there are previous navigations, section not repeated', () => {
            const requestedSection = undefined;
            const expectedSection = 'end';

        });

        test('should navigate to last visited section with correctly activated object if there are previous navigations', () => {
            const requestedSection = undefined;
            const expectedSection = 'visitedPlaces';
        });

        test('should navigate to last incomplete section for activated object if requested section in a repeated block but not enabled', () => {
            const requestedSection = 'travelBehavior';
            const expectedSection = 'visitedPlaces';
        });
    });
});