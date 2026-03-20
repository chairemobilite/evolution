/*
 * Copyright 2026, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import knex from 'chaire-lib-backend/lib/config/shared/db.config';
import { v4 as uuidV4 } from 'uuid';
import { truncate } from 'chaire-lib-backend/lib/models/db/default.db.queries';
import {
    getStartedInterviewsCount,
    getCompletedInterviewsCount,
    getInterviewsCompletionRate,
    getSurveyDifficultyDistribution
} from '../monitoring.db.queries';

const interviewsTable = 'sv_interviews';
const participantsTable = 'sv_participants';
const surveysTable = 'sv_surveys';

// `sv_interviews.participant_id` is NOT NULL and there is a UNIQUE(survey_id, participant_id)
// constraint, so each interview fixture must reference a distinct participant for a given survey.
const localParticipants = Array.from({ length: 5 }, (_v, i) => ({ id: i + 1, email: `test${i + 1}@transition.city`, is_valid: true }));

// `sv_interviews.survey_id` is NOT NULL in the schema, so interviews must reference an existing survey.
const localSurvey = { id: 1, shortname: 'test_survey' };

const mockInterviews = [
    {
        id: 1,
        uuid: uuidV4(),
        survey_id: localSurvey.id,
        participant_id: localParticipants[0].id,
        is_valid: true,
        is_completed: true,
        response: { _completedAt: '2024-01-01T10:00:00Z', perceivedBurden: { difficultyRange: 10 } }
    },
    {
        id: 2,
        uuid: uuidV4(),
        survey_id: localSurvey.id,
        participant_id: localParticipants[1].id,
        is_valid: true,
        is_completed: true,
        response: { _completedAt: '2024-01-02T10:00:00Z', perceivedBurden: { difficultyRange: 50 } }
    },
    {
        id: 3,
        uuid: uuidV4(),
        survey_id: localSurvey.id,
        participant_id: localParticipants[2].id,
        is_valid: true,
        is_completed: false,
        response: { perceivedBurden: { difficultyRange: 90 } }
    },
    {
        id: 4,
        uuid: uuidV4(),
        survey_id: localSurvey.id,
        participant_id: localParticipants[3].id,
        is_valid: true,
        is_completed: true,
        response: { _completedAt: '2024-01-03T10:00:00Z', perceivedBurden: { difficultyRange: null } }
    },
    { id: 5, uuid: uuidV4(), survey_id: localSurvey.id, participant_id: localParticipants[4].id, is_valid: true, is_completed: false, response: {} }
];

beforeAll(async () => {
    jest.setTimeout(10000);
    // Prepare required tables first: interviews depend on participants (NOT NULL participant_id).
    await truncate(knex, interviewsTable);
    await truncate(knex, participantsTable);
    await truncate(knex, surveysTable);
    await knex(surveysTable).insert(localSurvey);
    await knex(participantsTable).insert(localParticipants);
    await knex(interviewsTable).insert(mockInterviews);
});

afterAll(async () => {
    await truncate(knex, interviewsTable);
    await truncate(knex, participantsTable);
    await truncate(knex, surveysTable);
    await knex.destroy();
});

describe('monitoring.db.queries with mock data', () => {
    test('getStartedInterviewsCount returns correct count', async () => {
        const result = await getStartedInterviewsCount();
        expect(result).toBe(mockInterviews.length);
    });

    test('getCompletedInterviewsCount returns correct count', async () => {
        // Only interviews with _completedAt in response are counted as completed
        const expected = mockInterviews.filter((i) => i.response._completedAt).length;
        const result = await getCompletedInterviewsCount();
        expect(result).toBe(expected);
    });

    test('getInterviewsCompletionRate returns correct percentage', async () => {
        const started = mockInterviews.length;
        const completed = mockInterviews.filter((i) => i.response._completedAt).length;
        const expectedRate = started > 0 ? Number(((completed / started) * 100).toFixed(1)) : 0;
        const result = await getInterviewsCompletionRate();
        expect(result).toBe(expectedRate);
    });

    test('getSurveyDifficultyDistribution returns correct bins', async () => {
        const result = await getSurveyDifficultyDistribution();
        expect(Array.isArray(result)).toBe(true);

        // Check bin structure
        result.forEach((bin) => {
            expect(bin).toHaveProperty('label');
            expect(bin).toHaveProperty('percentage');
            expect(bin).toHaveProperty('count');
        });

        // Check that bins add up to number of interviews with difficulty value
        const withDifficulty = mockInterviews.filter((i) => typeof i.response.perceivedBurden?.difficultyRange === 'number').length;
        const totalCount = result.reduce((sum, bin) => sum + bin.count, 0);
        expect(totalCount).toBe(withDifficulty);

        // Check actual bin values for difficulty 10 and 50
        const bin10 = result.find((bin) => bin.label.startsWith('0-10'));
        const bin50 = result.find((bin) => bin.label.startsWith('41-50'));
        const bin90 = result.find((bin) => bin.label.startsWith('81-90'));
        expect(bin10?.count).toBe(1); // Only one interview with difficulty 10
        expect(bin50?.count).toBe(1); // Only one interview with difficulty 50
        expect(bin90?.count).toBe(1); // One interview with difficulty 90, regardless of completion

        // Check that all other bins have count 0
        result.forEach((bin) => {
            if (bin.label !== bin10?.label && bin.label !== bin50?.label && bin.label !== bin90?.label) {
                expect(bin.count).toBe(0);
            }
        });
    });
});
