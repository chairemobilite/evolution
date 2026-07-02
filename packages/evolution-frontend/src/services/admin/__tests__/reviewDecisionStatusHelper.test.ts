/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import projectConfig from 'evolution-common/lib/config/project.config';
import type { SurveyObjectName } from 'evolution-common/lib/services/baseObjects/types';
import {
    buildSurveyObjectBoxClassName,
    getReviewDecisionStatusBoxClass,
    getReviewDecisionStatusForObject,
    isReviewStatusRejectedForDisplay
} from '../reviewDecisionStatusHelper';
import type {
    ReviewDecisionEffectiveStatus,
    ReviewDecisionStatusByObject,
    ReviewDecisionStatusForObject
} from 'evolution-common/lib/services/reviews/types';

const personUuid = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const interviewUuid = '11111111-1111-4111-8111-111111111111';
const householdUuid = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const homeUuid = '22222222-2222-4222-8222-222222222222';
const journeyUuid = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const visitedPlaceUuid = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const tripUuid = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const segmentUuid = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
const organizationUuid = 'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
const vehicleUuid = 'aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaaa2';
const tripChainUuid = '33333333-3333-4333-8333-333333333333';
const junctionUuid = 'aaaaaaa3-aaaa-4aaa-8aaa-aaaaaaaaaaa3';
const workPlaceUuid = 'aaaaaaa4-aaaa-4aaa-8aaa-aaaaaaaaaaa4';
const schoolPlaceUuid = '44444444-4444-4444-8444-444444444444';

const makeFixtureStatus = (
    objectType: SurveyObjectName,
    objectUuid: string,
    effectiveStatus: ReviewDecisionEffectiveStatus
): ReviewDecisionStatusForObject => ({
    objectType,
    objectUuid,
    approvalCount: effectiveStatus === 'rejected' ? 0 : 1,
    rejectionCount: effectiveStatus === 'rejected' ? 1 : effectiveStatus === 'conflict' ? 1 : 0,
    hasConflict: effectiveStatus === 'conflict',
    isForceApproved: false,
    effectiveStatus,
    reReviewRequestedUserIds: [],
    isReviewed: true
});

const reviewDecisionStatusByObject: ReviewDecisionStatusByObject = {
    interview: makeFixtureStatus('interview', interviewUuid, 'approved'),
    household: makeFixtureStatus('household', householdUuid, 'rejected'),
    home: makeFixtureStatus('home', homeUuid, 'approved'),
    persons: {
        [personUuid]: makeFixtureStatus('person', personUuid, 'conflict')
    },
    journeys: { [journeyUuid]: makeFixtureStatus('journey', journeyUuid, 'approved') },
    visitedPlaces: { [visitedPlaceUuid]: makeFixtureStatus('visitedPlace', visitedPlaceUuid, 'approved') },
    trips: { [tripUuid]: makeFixtureStatus('trip', tripUuid, 'approved') },
    segments: { [segmentUuid]: makeFixtureStatus('segment', segmentUuid, 'approved') },
    organizations: { [organizationUuid]: makeFixtureStatus('organization', organizationUuid, 'approved') },
    vehicles: { [vehicleUuid]: makeFixtureStatus('vehicle', vehicleUuid, 'approved') },
    tripChains: { [tripChainUuid]: makeFixtureStatus('tripChain', tripChainUuid, 'approved') },
    junctions: { [junctionUuid]: makeFixtureStatus('junction', junctionUuid, 'approved') },
    workPlaces: { [workPlaceUuid]: makeFixtureStatus('workPlace', workPlaceUuid, 'approved') },
    schoolPlaces: { [schoolPlaceUuid]: makeFixtureStatus('schoolPlace', schoolPlaceUuid, 'approved') }
};

/** [objectType, objectUuid, expectedEffectiveStatus] — one row per switch branch */
const getReviewDecisionStatusForObjectCases: [SurveyObjectName, string, ReviewDecisionEffectiveStatus][] = [
    ['interview', interviewUuid, 'approved'],
    ['household', householdUuid, 'rejected'],
    ['home', homeUuid, 'approved'],
    ['person', personUuid, 'conflict'],
    ['journey', journeyUuid, 'approved'],
    ['visitedPlace', visitedPlaceUuid, 'approved'],
    ['trip', tripUuid, 'approved'],
    ['segment', segmentUuid, 'approved'],
    ['organization', organizationUuid, 'approved'],
    ['vehicle', vehicleUuid, 'approved'],
    ['tripChain', tripChainUuid, 'approved'],
    ['junction', junctionUuid, 'approved'],
    ['workPlace', workPlaceUuid, 'approved'],
    ['schoolPlace', schoolPlaceUuid, 'approved']
];

describe('reviewDecisionStatusHelper', () => {
    it.each(getReviewDecisionStatusForObjectCases)(
        'getReviewDecisionStatusForObject looks up %s by uuid',
        (objectType, objectUuid, expectedEffectiveStatus) => {
            const status = getReviewDecisionStatusForObject(reviewDecisionStatusByObject, objectType, objectUuid);
            expect(status?.effectiveStatus).toBe(expectedEffectiveStatus);
            expect(status?.objectType).toBe(objectType);
            expect(status?.objectUuid).toBe(objectUuid);
        }
    );

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
            const className = buildSurveyObjectBoxClassName({
                objectType: 'interview',
                extraClassNames: '_widget_container',
                objectUuid: 'some-uuid'
            });
            expect(className).toContain('admin__survey-object-box');
            expect(className).toContain('_widget_container');
            expect(className).toContain('admin__survey-object-box--has-review');
        } finally {
            projectConfig.reviewableSurveyObjects = originalReviewableSurveyObjects;
        }
    });

    // [effectiveStatus, currentUserDecision, expected]
    const rejectedForDisplayCases: [string | undefined, string | undefined, boolean][] = [
        ['rejected', undefined, true],
        [undefined, 'reject', true],
        ['approved', undefined, false],
        ['approved', 'approve', false],
        [undefined, undefined, false]
    ];

    it.each(rejectedForDisplayCases)(
        'isReviewStatusRejectedForDisplay when effective=%s and userDecision=%s',
        (effectiveStatus, currentUserDecision, expected) => {
            const status = effectiveStatus
                ? {
                    ...reviewDecisionStatusByObject.persons[personUuid],
                    effectiveStatus,
                    currentUserDecision,
                    isReviewed: true
                }
                : currentUserDecision
                    ? {
                        ...reviewDecisionStatusByObject.persons[personUuid],
                        effectiveStatus: 'approved',
                        currentUserDecision,
                        isReviewed: true
                    }
                    : undefined;
            expect(isReviewStatusRejectedForDisplay(status as any)).toBe(expected);
        }
    );

    test('buildSurveyObjectBoxClassName applies inherited rejected styling without changing own status', () => {
        const approvedStatus = {
            ...reviewDecisionStatusByObject.persons[personUuid],
            effectiveStatus: 'approved',
            isReviewed: true,
            hasConflict: false
        };
        const className = buildSurveyObjectBoxClassName({
            objectType: 'trip',
            status: approvedStatus as any,
            objectUuid: 'trip-uuid',
            inheritedRejected: true
        });
        expect(className).toContain('admin__survey-object-box--rejected');
    });
});
