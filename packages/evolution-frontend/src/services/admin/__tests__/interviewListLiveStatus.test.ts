/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import type { InterviewStatusAttributesBase } from 'evolution-common/lib/services/questionnaire/types';
import type {
    ReviewDecisionEffectiveStatus,
    ReviewDecisionStatusByObject
} from 'evolution-common/lib/services/reviews/types';
import {
    getOpenInterviewStatus,
    withLearnedInterviewStatus,
    withLiveInterviewStatuses,
    type InterviewLiveStatus
} from '../interviewListLiveStatus';
import { createApprovedReviewDecisionStatus } from './reviewDecisionStatusHelperTestUtils';

const openUuid = '11111111-1111-4111-8111-111111111111';
const otherUuid = '22222222-2222-4222-8222-222222222222';

/** Decisions of the open interview: approved when a status is asked for, reviewed by nobody otherwise. */
const statusByObject = (isApproved: boolean): ReviewDecisionStatusByObject =>
    (isApproved
        ? { interview: createApprovedReviewDecisionStatus('interview', openUuid) }
        : {}) as ReviewDecisionStatusByObject;

describe('getOpenInterviewStatus', () => {
    // [case name, open interview, review status of that interview, expected row values]
    const cases: [
        string,
        { uuid: string; is_completed?: boolean } | undefined | null,
        ReviewDecisionStatusByObject | undefined,
        InterviewLiveStatus | undefined
    ][] = [
        ['no interview is open', null, statusByObject(true), undefined],
        ['the decisions are still loading', { uuid: openUuid }, undefined, undefined],
        [
            'the interview was approved',
            { uuid: openUuid, is_completed: true },
            statusByObject(true),
            { uuid: openUuid, review_status: 'approved', is_completed: true }
        ],
        [
            'the last decision was cleared',
            { uuid: openUuid, is_completed: false },
            statusByObject(false),
            { uuid: openUuid, review_status: 'notReviewed', is_completed: false }
        ]
    ];

    test.each(cases)('when %s', (_name, interview, reviewDecisionStatusByObject, expected) => {
        expect(getOpenInterviewStatus(interview, reviewDecisionStatusByObject)).toEqual(expected);
    });
});

describe('withLearnedInterviewStatus', () => {
    const approved: InterviewLiveStatus = { uuid: openUuid, review_status: 'approved', is_completed: true };
    const learned = { [openUuid]: approved };

    test('keeps the same object when the status brings nothing new', () => {
        expect(withLearnedInterviewStatus(learned, approved)).toBe(learned);
    });

    test('keeps the same object when there is no status to learn', () => {
        expect(withLearnedInterviewStatus(learned, undefined)).toBe(learned);
    });

    test('replaces the status that differs from the one known', () => {
        const rejected: InterviewLiveStatus = { uuid: openUuid, review_status: 'rejected', is_completed: true };

        expect(withLearnedInterviewStatus(learned, rejected)).toEqual({ [openUuid]: rejected });
    });
});

describe('withLiveInterviewStatuses', () => {
    const rows = [
        { uuid: openUuid, review_status: 'notReviewed', is_completed: false },
        { uuid: otherUuid, review_status: 'rejected', is_completed: true }
    ] as InterviewStatusAttributesBase[];

    test('leaves the rows untouched when nothing was reviewed since the fetch', () => {
        expect(withLiveInterviewStatuses(rows, {})).toBe(rows);
    });

    test('applies the learned status to the row of its interview only', () => {
        const updated = withLiveInterviewStatuses(rows, {
            [openUuid]: { uuid: openUuid, review_status: 'forceApproved', is_completed: true }
        });

        expect(updated[0]).toEqual({ uuid: openUuid, review_status: 'forceApproved', is_completed: true });
        expect(updated[1]).toBe(rows[1]);
    });
});
