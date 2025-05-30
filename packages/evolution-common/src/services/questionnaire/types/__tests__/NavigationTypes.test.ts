/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { sectionToUrlPath, NavigationSection } from '../NavigationTypes';

describe('sectionToUrlPath', () => {
    it('should return the section shortname when iterationContext is undefined', () => {
        const section: NavigationSection = { sectionShortname: 'home' };
        expect(sectionToUrlPath(section)).toBe('home');
    });

    it('should return the section shortname when iterationContext is an empty array', () => {
        const section: NavigationSection = { sectionShortname: 'home', iterationContext: [] };
        expect(sectionToUrlPath(section)).toBe('home');
    });

    it('should return the full path with iterationContext', () => {
        const section: NavigationSection = {
            sectionShortname: 'visitedPlaces',
            iterationContext: ['person', '123']
        };
        expect(sectionToUrlPath(section)).toBe('visitedPlaces/person/123');
    });

    it('should handle iterationContext with multiple parts', () => {
        const section: NavigationSection = {
            sectionShortname: 'segments',
            iterationContext: ['person', '123', 'journey', '456']
        };
        expect(sectionToUrlPath(section)).toBe('segments/person/123/journey/456');
    });
});
