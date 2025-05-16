/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

/**
 * Represents a section path that includes iteration information
 * Format: sectionShortname[.iterationContext]
 * Examples: 'home', 'visitedPlaces.person_123', 'segments.person_123.journey_456'
 */
export type NavigationSection = {
    sectionShortname: string;
    sectionPath: string;
};

/**
 * Navigation state that keeps track of the current path and iteration context
 */
export type NavigationState = {
    /**
     * The current section path including iteration context
     */
    currentSection: NavigationSection;

    /**
     * Stack of sections previously visited, to enable back navigation
     */
    navigationHistory: NavigationSection[];
};

export type NextSectionResult = {
    navigationState: NavigationState;
    valuesByPath?: { [path: string]: unknown };
};
