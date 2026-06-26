/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import projectConfig from 'evolution-common/lib/config/project.config';
import {
    buildSurveyObjectBoxClassName,
    getReviewDecisionStatusBoxClass,
    getReviewDecisionStatusForObject
} from '../reviewDecisionStatusHelper';
import type { ReviewDecisionStatusByObject } from 'evolution-common/lib/services/reviews/types';

const personUuid = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const reviewDecisionStatusByObject: ReviewDecisionStatusByObject = {
    interview: [],
    household: [],
    home: [],
    persons: {
        [personUuid]: {
            objectType: 'person',
            objectUuid: personUuid,
            approvalCount: 1,
            rejectionCount: 1,
            hasConflict: true,
            isForceApproved: false,
            effectiveStatus: 'conflict',
            reReviewRequestedUserIds: [],
            isReviewed: true
        }
    },
    journeys: {},
    visitedPlaces: {},
    trips: {},
    segments: {}
};

describe('reviewDecisionStatusHelper', () => {
    test('getReviewDecisionStatusForObject finds person status by uuid', () => {
        const status = getReviewDecisionStatusForObject(reviewDecisionStatusByObject, 'person', personUuid);
        expect(status?.effectiveStatus).toBe('conflict');
    });

    // [effectiveStatus, expectedClass]
    const boxClassCases: [string, string][] = [
        ['rejected', 'admin__survey-object-box--rejected'],
        ['approved', 'admin__survey-object-box--approved'],
        ['forceApproved', 'admin__survey-object-box--approved'],
        ['conflict', 'admin__survey-object-box--conflict']
    ];

    it.each(boxClassCases)('getReviewDecisionStatusBoxClass maps %s', (effectiveStatus, expectedClass) => {
        const status = {
            ...reviewDecisionStatusByObject.persons[personUuid],
            effectiveStatus,
            isReviewed: true,
            hasConflict: effectiveStatus === 'conflict'
        };
        expect(getReviewDecisionStatusBoxClass(status as any)).toBe(expectedClass);
    });

    test('buildSurveyObjectBoxClassName adds review padding when type is reviewable in config', () => {
        // The padding only appears for object types listed as reviewable in the survey config
        const originalReviewableSurveyObjects = projectConfig.reviewableSurveyObjects;
        projectConfig.reviewableSurveyObjects = ['interview'];
        try {
            const className = buildSurveyObjectBoxClassName('interview', undefined, '_widget_container', 'some-uuid');
            expect(className).toContain('admin__survey-object-box');
            expect(className).toContain('_widget_container');
            expect(className).toContain('admin__survey-object-box--has-review');
        } finally {
            projectConfig.reviewableSurveyObjects = originalReviewableSurveyObjects;
        }
    });
});
