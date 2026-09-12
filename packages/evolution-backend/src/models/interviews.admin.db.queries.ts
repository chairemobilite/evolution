/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import knex from 'chaire-lib-backend/lib/config/shared/db.config';
import TrError from 'chaire-lib-common/lib/utils/TrError';
import { _isBlank, _removeBlankFields } from 'chaire-lib-common/lib/utils/LodashExtensions';
import projectConfig from 'evolution-common/lib/config/project.config';
import {
    ANONYMOUS_PARTICIPANT_PREFIX,
    INTERVIEWER_PARTICIPANT_PREFIX
} from 'evolution-common/lib/services/interviews/interview';
import { InterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';

const tableName = 'sv_interviews';
const participantTable = 'sv_participants';

const isByFieldAuthEnabled = (): boolean =>
    !_isBlank(projectConfig.auth?.byField) && projectConfig.auth.byField !== false;

/**
 * Classify the participant login method in SQL. Google first, then username
 * prefixes (`telephone_`, `anonym_`), then email. Remaining participants are
 * `byField` when that auth method is enabled, otherwise `unknown`.
 */
export const getParticipantLoginMethodSelect = () => {
    const fallbackMethod = isByFieldAuthEnabled() ? 'byField' : 'unknown';
    return knex.raw(
        `
        CASE
            WHEN participant.google_id IS NOT NULL THEN 'google'
            WHEN starts_with(participant.username, ?) THEN 'telephone'
            WHEN starts_with(participant.username, ?) THEN 'anonymous'
            WHEN participant.email IS NOT NULL THEN 'email'
            ELSE ?
        END AS "loginMethod"
        `,
        [`${INTERVIEWER_PARTICIPANT_PREFIX}_`, `${ANONYMOUS_PARTICIPANT_PREFIX}_`, fallbackMethod]
    );
};

/**
 * Load an interview for admin review/audit, including the participant login
 * method. Do not use this from participant-facing routes.
 *
 * @param interviewUuid - Interview uuid
 * @returns The interview with `loginMethod`, or `undefined` when not found
 */
const getInterviewByUuidWithParticipant = async (interviewUuid: string): Promise<InterviewAttributes | undefined> => {
    try {
        const interviews = await knex
            .select('i.*', getParticipantLoginMethodSelect())
            .from(`${tableName} as i`)
            .leftJoin(`${participantTable} as participant`, 'i.participant_id', 'participant.id')
            .andWhere('i.uuid', interviewUuid);
        if (interviews.length !== 1) {
            return undefined;
        }
        return _removeBlankFields(interviews[0]) as InterviewAttributes;
    } catch (error) {
        console.error(error);
        throw new TrError(
            `cannot find interview by uuid with participant because of a database error (knex error: ${error})`,
            'TITQGC0032'
        );
    }
};

export default {
    getInterviewByUuidWithParticipant
};
