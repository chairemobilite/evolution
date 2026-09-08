/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import projectConfig from '../../config/project.config';

type InterviewOpenedAtSource = {
    response?: { _startedAt?: number };
    created_at?: string;
};

/**
 * Instant the respondent opened the interview, in milliseconds since epoch.
 * Prefers `response._startedAt` (unix seconds), then `created_at`.
 *
 * @param interview Interview with opening timestamps
 * @returns Milliseconds since epoch, or undefined when neither timestamp is usable
 */
export const getRespondentOpenedAtMilliseconds = (interview: InterviewOpenedAtSource): number | undefined => {
    const startedAt = interview.response?._startedAt;
    if (typeof startedAt === 'number' && Number.isFinite(startedAt)) {
        return startedAt * 1000;
    }
    if (interview.created_at !== undefined) {
        const createdAtMilliseconds = Date.parse(interview.created_at);
        if (!Number.isNaN(createdAtMilliseconds)) {
            return createdAtMilliseconds;
        }
    }
    return undefined;
};

/**
 * Whether a freeze may be stored: the respondent opened the interview at least
 * `minimumDelayBeforeFreezeSeconds` ago. Unknown opening time is refused so a
 * just-created interview is not frozen.
 *
 * @param interview Interview with opening timestamps
 * @param nowMilliseconds Current time in milliseconds since epoch
 * @returns True when freeze is allowed
 */
export const canFreezeInterview = (
    interview: InterviewOpenedAtSource,
    nowMilliseconds: number = Date.now()
): boolean => {
    const openedAtMilliseconds = getRespondentOpenedAtMilliseconds(interview);
    if (openedAtMilliseconds === undefined) {
        return false;
    }
    return nowMilliseconds - openedAtMilliseconds >= projectConfig.minimumDelayBeforeFreezeSeconds * 1000;
};

/**
 * Whether participant access must be refused: the interview is frozen and the
 * freeze is allowed (`minimumDelayBeforeFreezeSeconds` since opening). Review
 * does not use this.
 *
 * @param interview Interview with freeze flag and opening timestamps
 * @param nowMilliseconds Current time in milliseconds since epoch
 * @returns True when the participant must be blocked
 */
export const isParticipantBlockedByFreeze = (
    interview: InterviewOpenedAtSource & { is_frozen?: boolean },
    nowMilliseconds: number = Date.now()
): boolean => interview.is_frozen === true && canFreezeInterview(interview, nowMilliseconds);
