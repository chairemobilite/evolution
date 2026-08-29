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
    getInterviewListRowClassName,
    getInheritedStatusForDisplay,
    getInterviewSearchResultClassName,
    getReviewDecisionStatusBoxClass,
    getReviewDecisionStatusForObject,
    isReviewStatusRejectedForDisplay,
    type InheritedReviewDisplayStatus
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

    const mismatchedSingletonUuid = '99999999-9999-4999-8999-999999999999';

    it.each([
        ['interview', mismatchedSingletonUuid],
        ['household', mismatchedSingletonUuid],
        ['home', mismatchedSingletonUuid]
    ] as const)(
        'getReviewDecisionStatusForObject returns undefined for %s when objectUuid does not match',
        (objectType, objectUuid) => {
            expect(getReviewDecisionStatusForObject(reviewDecisionStatusByObject, objectType, objectUuid)).toBeUndefined();
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

    // [own effective status, own decision, status inherited from the ancestors, status passed down]
    const inheritedStatusCases: [
        ReviewDecisionEffectiveStatus,
        string | undefined,
        InheritedReviewDisplayStatus | undefined,
        InheritedReviewDisplayStatus | undefined
    ][] = [
        ['approved', undefined, undefined, 'approved'],
        ['rejected', undefined, 'approved', 'rejected'],
        ['approved', undefined, 'rejected', 'rejected'],
        ['notReviewed', undefined, 'approved', 'approved'],
        ['notReviewed', undefined, undefined, undefined],
        // A disagreement is unsettled, so it passes nothing down, not even to the reviewer who
        // approved, whose own colour would otherwise hide the disagreement from them.
        ['conflict', 'approve', undefined, undefined],
        ['conflict', undefined, 'approved', 'approved'],
        // A reviewer who rejected still sees their own rejection propagate.
        ['conflict', 'reject', undefined, 'rejected']
    ];

    it.each(inheritedStatusCases)(
        'getInheritedStatusForDisplay with own=%s, decision=%s and inherited=%s',
        (effectiveStatus, currentUserDecision, inheritedStatus, expected) => {
            const statusByObject = {
                persons: {
                    [personUuid]: {
                        ...makeFixtureStatus('person', personUuid, effectiveStatus),
                        isReviewed: effectiveStatus !== 'notReviewed',
                        currentUserDecision
                    }
                }
            } as unknown as ReviewDecisionStatusByObject;

            expect(getInheritedStatusForDisplay(statusByObject, { objectType: 'person', objectUuid: personUuid, inheritedStatus })).toBe(expected);
        }
    );

    // An inherited rejection overrides the object's own decision, while an inherited approval
    // only colours objects nobody reviewed individually.
    // [inherited status, own effective status, expected box modifier]
    const boxClassNameCases: [InheritedReviewDisplayStatus | undefined, string | undefined, string][] = [
        ['rejected', 'approved', 'admin__survey-object-box--rejected'],
        ['rejected', undefined, 'admin__survey-object-box--rejected'],
        ['approved', 'rejected', 'admin__survey-object-box--rejected'],
        ['approved', 'approved', 'admin__survey-object-box--approved'],
        ['approved', undefined, 'admin__survey-object-box--approved'],
        [undefined, 'approved', 'admin__survey-object-box--approved'],
        [undefined, undefined, '']
    ];

    it.each(boxClassNameCases)(
        'buildSurveyObjectBoxClassName with inherited=%s and own=%s',
        (inheritedStatus, effectiveStatus, expectedClass) => {
            const status = effectiveStatus
                ? {
                    ...reviewDecisionStatusByObject.persons[personUuid],
                    effectiveStatus,
                    isReviewed: true,
                    hasConflict: false
                }
                : undefined;
            const className = buildSurveyObjectBoxClassName({
                objectType: 'trip',
                status: status as any,
                objectUuid: 'trip-uuid',
                inheritedStatus
            });
            if (expectedClass === '') {
                expect(className).not.toContain('admin__survey-object-box--rejected');
                expect(className).not.toContain('admin__survey-object-box--approved');
            } else {
                expect(className).toContain(expectedClass);
            }
        }
    );

    // [reviewStatus, isCompleted, expected class names]
    const listRowClassNameCases: [ReviewDecisionEffectiveStatus, boolean | undefined, string][] = [
        ['forceApproved', true, '_green _strong _active-background'],
        ['approved', true, '_dark-green _strong'],
        ['approved', false, '_orange _strong'],
        ['approved', undefined, '_orange _strong'],
        ['rejected', true, '_dark-red _strong'],
        ['conflict', true, '_yellow _strong'],
        ['notReviewed', true, '']
    ];

    it.each(listRowClassNameCases)(
        'getInterviewListRowClassName when status=%s and completed=%s',
        (reviewStatus, isCompleted, expected) => {
            expect(getInterviewListRowClassName({ reviewStatus, isCompleted })).toBe(expected);
        }
    );

    // [reviewStatus, isCompleted, expected class names]
    const searchResultClassNameCases: [ReviewDecisionEffectiveStatus, boolean | undefined, string][] = [
        ['approved', true, '_green _strong _active-background'],
        ['forceApproved', true, '_green _strong _active-background'],
        ['rejected', true, '_dark-red _strong'],
        ['conflict', true, ''],
        ['notReviewed', true, ''],
        // An incomplete interview shows as incomplete whatever the reviewers decided
        ['approved', false, '_orange _strong'],
        ['rejected', false, '_orange _strong'],
        ['notReviewed', false, '_orange _strong'],
        ['notReviewed', undefined, '_orange _strong']
    ];

    it.each(searchResultClassNameCases)(
        'getInterviewSearchResultClassName when status=%s and completed=%s',
        (reviewStatus, isCompleted, expected) => {
            expect(getInterviewSearchResultClassName({ reviewStatus, isCompleted })).toBe(expected);
        }
    );
});
