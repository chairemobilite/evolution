/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { getActivityIcon, getActivityMarkerIcon } from '../activityIconMapping';
import { Activity } from '../../../../baseObjects/attributeTypes/VisitedPlaceAttributes';

describe('activityIconMapping', () => {
    describe('getActivityIcon', () => {
        test('should return default icon for undefined activity', () => {
            expect(getActivityIcon(undefined)).toBe('/dist/icons/activities/other/question_mark.svg');
        });

        test('should return default icon for null activity', () => {
            expect(getActivityIcon(null)).toBe('/dist/icons/activities/other/question_mark.svg');
        });

        test('should return correct icon for specific activity', () => {
            expect(getActivityIcon('home' as Activity)).toBe('/dist/icons/activities/home/home.svg');
        });

        test('should return default icon for non-existent activity', () => {
            expect(getActivityIcon('nonExistentActivity' as any)).toBe('/dist/icons/activities/other/question_mark.svg');
        });
    });

    describe('getActivityMarkerIcon', () => {
        test('should return default round marker icon for undefined activity', () => {
            expect(getActivityMarkerIcon(undefined)).toBe('/dist/icons/activities/other/question_mark-marker_round.svg');
        });

        test('should return default round marker icon for null activity', () => {
            expect(getActivityMarkerIcon(null)).toBe('/dist/icons/activities/other/question_mark-marker_round.svg');
        });

        test('should return correct round marker icon for specific activity', () => {
            expect(getActivityMarkerIcon('work' as Activity)).toBe('/dist/icons/activities/work/briefcase-marker_round.svg');
        });

        test('should return correct round marker icon for specific activity, with round specified', () => {
            expect(getActivityMarkerIcon('volunteering' as Activity, 'round')).toBe('/dist/icons/activities/other/volunteering-marker_round.svg');
        });

        test('should return correct square marker icon for specific activity', () => {
            expect(getActivityMarkerIcon('school' as Activity, 'square')).toBe('/dist/icons/activities/school/graduation_cap-marker_square.svg');
        });
    });
    
});
