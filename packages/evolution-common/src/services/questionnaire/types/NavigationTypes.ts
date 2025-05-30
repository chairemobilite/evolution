/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

/**
 * Represents a section path that includes iteration information
 * Format: sectionShortname[(/iterationContextParts)*]
 * Examples: 'home', 'visitedPlaces/person/123', 'segments/person/123/journey/456'
 */
export type NavigationSection = {
    /**
     * The section shortname, e.g. 'home', 'visitedPlaces', 'segments'
     */
    sectionShortname: string;
    /**
     * Optional iteration context, to be appended to the section shortname to
     * get the full path with the current iteration context. It may include many
     * elements to create the URL.
     */
    iterationContext?: string[];
};

export const sectionToUrlPath = (section: NavigationSection): string => {
    if (!section.iterationContext || section.iterationContext.length === 0) {
        return section.sectionShortname;
    }
    return `${section.sectionShortname}/${section.iterationContext.join('/')}`;
};

/**
 * Represents the result of navigating to the next section. It includes the new
 * navigation state and optional values by path that needs to be updated by this
 * navigation (like the active survey object update)
 */
export type TargetSectionResult = {
    /**
     * The new navigation state after the navigation
     */
    targetSection: NavigationSection;
    /**
     * Optional values that need to be updated by this navigation
     */
    valuesByPath?: { [path: string]: unknown };
};
