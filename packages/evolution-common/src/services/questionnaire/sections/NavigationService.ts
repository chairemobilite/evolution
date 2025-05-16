/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { UserRuntimeInterviewAttributes } from '../types/Data';
import { SurveySections, SectionConfigWithDefaultsSet } from '../types/SectionConfig';
import { NavigationSection, NavigationState, NextSectionResult } from '../types/NavigationTypes';

/**
 * NavigationService handles complex navigation for questionnaires,
 * including repeated blocks of sections and conditional navigation.
 */
export class NavigationService {
    private sections: SurveySections;

    constructor(sections: SurveySections) {
        this.sections = sections;
    }

    /**
     * Find the first section that shouldn't be skipped in the given direction
     */
    private findFirstNonSkippedSection(
        interview: UserRuntimeInterviewAttributes,
        currentSection: NavigationSection,
        direction: 'next' | 'prev'
    ): NavigationSection {
        const navigateToSection = currentSection;

        // FIXME Copilot's suggestion added a visited set to prevent infinite loops. See if it is necessary with our navigation logic
        // const visited = new Set<string>();

        // while (true) {
        // TODO Get the next section in the direction

        // TODO If null, keep current section

        // TODO Is it enabled? If not, continue to next section
        // FIXME If direction is 'next' and the section is not enabled, could a section be enabled later? Or we should just return?

        // TODO If the section is one with a repeated block, get the actual next section from this block
        if (this.sections[navigateToSection.sectionShortname].repeatedBlock) {
            // FIXME Not sure if we return here or continue the while block, depends if the function here handled the skippable functions in general (not just the first)
            const nextSection = this.getTargetSectionFromRepeatedBlock(
                interview,
                currentSection,
                direction,
                this.sections[navigateToSection.sectionShortname]
            );
            console.log('nextSection', nextSection);
        }

        // TODO Otherwise, determine if the section should be skipped

        // TODO If so, continue to the next iteration in the while loop

        // TODO If not, return the section
        return navigateToSection;
        // }
    }

    private getTargetSectionFromRepeatedBlock(
        _interview: UserRuntimeInterviewAttributes,
        currentSection: NavigationSection,
        _direction: string,
        _blockSectionConfig: SectionConfigWithDefaultsSet
    ): NavigationSection {
        // TODO Get the objects or count of objects that will have a repeated
        // block
        //
        // TODO Determine the next object to activate: if there was no
        // previously selected object, take the first, if it was the last, set
        // null, otherwise, take the next
        //
        // TODO If the current object was the last and the last section was
        // completed, go to the next section after the repeated block,
        // [deactivating the current object?]
        //
        // TODO If the current object was not the last:
        //
        // TODO If the section is the selection section, the section is marked
        // as `skipSelectionInNaturalFlow` and we are in natural flow, to go
        // second section in the repeated block
        //
        // TODO Otherwise, go to the first section in the repeated block

        // FIXME Temporary return value for compilation
        return currentSection;
    }

    /**
     * Main navigation function to determine the target section in the
     * appropriate direction
     */
    public navigate(
        interview: UserRuntimeInterviewAttributes,
        navigationState: NavigationState,
        direction: 'next' | 'prev' = 'next'
    ): NextSectionResult {
        // TODO Get current section path and config

        // TODO If direction is 'next', validate that the current section is valid and completed. If not, return current section

        // TODO Find the first non-skipped section in the requested direction
        const nextSectionToVisit = this.findFirstNonSkippedSection(
            interview,
            navigationState.currentSection,
            direction
        );
        console.log('nextSection', nextSectionToVisit);

        // FIXME Temporary return value for compilation
        return {
            navigationState: navigationState
        };
    }

    /**
     * Initialize a new navigation state. This can either happen when the page
     * is first loaded to go to the last section, or when the user requests a
     * specific section, for example through the URL or by clicking the
     * navigation menu. In any case, it will not navigate to a section that is
     * not enabled or accessible yet.
     *
     * @param {UserRuntimeInterviewAttributes} interview The interview for which
     * to create the navigation state
     * @param {string} [requestedSection] The section to navigate to. If left
     * blank, it will either navigate to the last visited (or allowed) section
     * or the first one.
     */
    public initNavigationState(
        _interview: UserRuntimeInterviewAttributes,
        requestedSection?: string
    ): NextSectionResult {
        // TODO Find the last visited section in the interview if any, else find the interview's first section

        // TODO See if it is possible to go to this section. If so, return the section

        // TODO Otherwise, find the first incomplete section

        // FIXME Temporary return value for compilation
        return {
            navigationState: {
                currentSection: { sectionShortname: requestedSection || '', sectionPath: requestedSection || '' },
                navigationHistory: []
            }
        };
    }
}

/**
 * Create a navigation service instance from survey sections
 */
export function createNavigationService(sections: SurveySections): NavigationService {
    return new NavigationService(sections);
}
