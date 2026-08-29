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
import { getReviewDecisionStatusForObject } from './reviewDecisionStatusHelper';

/*
 * Keeps the interview list in step with the review panel opened beside it, whose decisions would
 * otherwise only show after a page reload.
 *
 * Only the decisions of the reviewer using this page are followed, since they are the only ones
 * this browser learns about: the statuses are read from the review panel state, which holds the
 * interview that reviewer has open. What the other reviewers decide meanwhile keeps showing the
 * value of the last fetch, until the list is fetched again or the page is reloaded.
 */

/** What the review panel shows for an interview, once its decisions are loaded. */
export type InterviewLiveStatus = {
    uuid: string;
    review_status: ReviewDecisionEffectiveStatus;
    is_completed?: boolean;
};

/** Statuses learned from the review panel, by interview uuid. */
export type InterviewLiveStatusByUuid = { [uuid: string]: InterviewLiveStatus };

/**
 * Reads from the review panel state the review status and completion of the interview open in it.
 * @param interview - Interview open in the review panel, absent when the list stands alone
 * @param reviewDecisionStatusByObject - Review status of that interview, undefined while loading
 * @returns Values the review panel shows, or undefined when nothing reliable can be read yet
 */
export const getOpenInterviewStatus = (
    interview: { uuid: string; is_completed?: boolean } | undefined | null,
    reviewDecisionStatusByObject: ReviewDecisionStatusByObject | undefined
): InterviewLiveStatus | undefined => {
    if (!interview || reviewDecisionStatusByObject === undefined) {
        return undefined;
    }
    // Opening an interview resets the decisions, so a loaded map always describes this one: an
    // interview missing from it has no decision left, rather than decisions not known yet.
    const status = getReviewDecisionStatusForObject(reviewDecisionStatusByObject, 'interview', interview.uuid);
    return {
        uuid: interview.uuid,
        review_status: status?.effectiveStatus ?? 'notReviewed',
        is_completed: interview.is_completed
    };
};

/**
 * Adds a status to those learned from the review panel, returning the same object when it brings
 * nothing new, so that a component holding them in state does not render again for nothing.
 * @param liveStatusByUuid - Statuses learned so far
 * @param status - Status read from the review panel, if any
 * @returns The statuses, with that of the interview updated
 */
export const withLearnedInterviewStatus = (
    liveStatusByUuid: InterviewLiveStatusByUuid,
    status: InterviewLiveStatus | undefined
): InterviewLiveStatusByUuid => {
    if (status === undefined) {
        return liveStatusByUuid;
    }
    const known = liveStatusByUuid[status.uuid];
    return known?.review_status === status.review_status && known?.is_completed === status.is_completed
        ? liveStatusByUuid
        : { ...liveStatusByUuid, [status.uuid]: status };
};

/**
 * Refreshes the interview list rows with the decisions taken in the review panel beside it.
 * The list holds a server snapshot from its last fetch, so its rows would otherwise keep showing
 * the review status and the completion the interviews had back then. Only the decisions of the
 * reviewer working beside the list are followed; those of the others show on the next fetch.
 * @param interviews - Rows of the interview list, as last fetched
 * @param liveStatusByUuid - Statuses learned since, from {@link withLearnedInterviewStatus}
 * @returns The rows, those of the reviewed interviews carrying the values of the review panel
 */
export const withLiveInterviewStatuses = <T extends InterviewStatusAttributesBase>(
    interviews: T[],
    liveStatusByUuid: InterviewLiveStatusByUuid
): T[] =>
        Object.keys(liveStatusByUuid).length === 0
            ? interviews
            : interviews.map((interview) => {
                const liveStatus = liveStatusByUuid[interview.uuid];
                return liveStatus === undefined
                    ? interview
                    : { ...interview, review_status: liveStatus.review_status, is_completed: liveStatus.is_completed };
            });
