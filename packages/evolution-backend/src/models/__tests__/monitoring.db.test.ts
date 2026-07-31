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
    getStartedAndCompletedInterviewsByDay,
    getSurveyDifficultyDistribution
} from '../monitoring.db.queries';
import each from 'jest-each';
import projectConfig from 'evolution-common/lib/config/project.config';
import type { Timezone } from 'evolution-common/lib/utils/DateTimeUtils';

// Fixed timezone so the by-day grouping test is deterministic on any machine.
// Survey start/end dates are mutated per test (see afterEach reset).
jest.mock('evolution-common/lib/config/project.config', () => ({
    __esModule: true,
    default: {
        timezone: 'America/Toronto',
        startDateTimeWithTimezoneOffset: undefined,
        endDateTimeWithTimezoneOffset: undefined
    }
}));

const interviewsTable = 'sv_interviews';
const participantsTable = 'sv_participants';
const surveysTable = 'sv_surveys';

// `sv_interviews.participant_id` is NOT NULL and there is a UNIQUE(survey_id, participant_id)
// constraint, so each interview fixture must reference a distinct participant for a given survey.
const localParticipants = Array.from({ length: 7 }, (_v, i) => ({
    id: i + 1,
    email: `test${i + 1}@transition.city`,
    is_valid: true
}));

// `sv_interviews.survey_id` is NOT NULL in the schema, so interviews must reference an existing survey.
const localSurvey = {
    id: 1,
    shortname: 'test_survey'
};

// created_at values are chosen around UTC midnights so the by-day test verifies
// that grouping follows the survey timezone (America/Toronto, UTC-5 in January)
// instead of the UTC calendar day.
const mockInterviews = [
    {
        id: 1,
        uuid: uuidV4(),
        survey_id: localSurvey.id,
        participant_id: localParticipants[0].id,
        is_valid: true,
        is_completed: true,
        created_at: '2024-01-02T02:00:00Z', // 2024-01-01 21:00 in Toronto
        response: {
            _completedAt: '2024-01-01T10:00:00Z',
            perceivedBurden: { difficultyRange: 10 }
        }
    },
    {
        id: 2,
        uuid: uuidV4(),
        survey_id: localSurvey.id,
        participant_id: localParticipants[1].id,
        is_valid: true,
        is_completed: true,
        created_at: '2024-01-01T15:00:00Z', // 2024-01-01 10:00 in Toronto
        response: {
            _completedAt: '2024-01-02T10:00:00Z',
            perceivedBurden: { difficultyRange: 50 }
        }
    },
    {
        id: 3,
        uuid: uuidV4(),
        survey_id: localSurvey.id,
        participant_id: localParticipants[2].id,
        is_valid: true,
        is_completed: false,
        created_at: '2024-01-03T04:59:00Z', // 2024-01-02 23:59 in Toronto
        response: {
            perceivedBurden: { difficultyRange: 90 }
        }
    },
    {
        id: 4,
        uuid: uuidV4(),
        survey_id: localSurvey.id,
        participant_id: localParticipants[3].id,
        is_valid: true,
        is_completed: true,
        created_at: '2024-01-03T12:00:00Z', // 2024-01-03 07:00 in Toronto
        response: {
            _completedAt: '2024-01-03T10:00:00Z',
            perceivedBurden: { difficultyRange: null }
        }
    },
    {
        id: 5,
        uuid: uuidV4(),
        survey_id: localSurvey.id,
        participant_id: localParticipants[4].id,
        is_valid: true,
        is_completed: false,
        created_at: '2024-01-04T00:30:00Z', // 2024-01-03 19:30 in Toronto
        response: {}
    },
    // Interviews 6 and 7 are exactly at the survey period boundaries used in the
    // configured-period tests, to verify that the start/end filtering is inclusive
    {
        id: 6,
        uuid: uuidV4(),
        survey_id: localSurvey.id,
        participant_id: localParticipants[5].id,
        is_valid: true,
        is_completed: false,
        created_at: '2024-01-02T05:00:00Z', // exactly 2024-01-02T00:00:00-05:00 (survey start)
        response: {}
    },
    {
        id: 7,
        uuid: uuidV4(),
        survey_id: localSurvey.id,
        participant_id: localParticipants[6].id,
        is_valid: true,
        is_completed: true,
        created_at: '2024-01-03T04:59:59Z', // exactly 2024-01-02T23:59:59-05:00 (survey end)
        response: {
            _completedAt: '2024-01-03T10:00:00Z'
        }
    }
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

    test('getStartedAndCompletedInterviewsByDay groups by day in the survey timezone', async () => {
        // Interviews 1 and 2 started on 2024-01-01 Toronto time (interview 1 is on
        // 2024-01-02 in UTC), interviews 3, 6 and 7 on 2024-01-02, interviews 4 and 5 on 2024-01-03
        const result = await getStartedAndCompletedInterviewsByDay();
        expect(result).toEqual([
            { date: '2024-01-01', started: 2, completed: 2 },
            { date: '2024-01-02', started: 3, completed: 1 },
            { date: '2024-01-03', started: 2, completed: 1 }
        ]);
    });

    test('getStartedAndCompletedInterviewsByDay defaults to UTC when no timezone is configured', async () => {
        projectConfig.timezone = undefined;
        try {
            // Same interviews as above, but grouped by the UTC calendar day: interviews 1
            // and 7 move to the next UTC day, as does interview 5 (from 2024-01-03 to 2024-01-04)
            const result = await getStartedAndCompletedInterviewsByDay();
            expect(result).toEqual([
                { date: '2024-01-01', started: 1, completed: 1 },
                { date: '2024-01-02', started: 2, completed: 1 },
                { date: '2024-01-03', started: 3, completed: 2 },
                { date: '2024-01-04', started: 1, completed: 0 }
            ]);
        } finally {
            projectConfig.timezone = 'America/Toronto' as Timezone;
        }
    });

    describe('getStartedAndCompletedInterviewsByDay with a configured survey period', () => {
        afterEach(() => {
            projectConfig.startDateTimeWithTimezoneOffset = undefined;
            projectConfig.endDateTimeWithTimezoneOffset = undefined;
        });

        // Interview 6 is exactly at the start instant and interview 7 exactly at the end
        // instant: both must remain included (the filtering is inclusive on both ends)
        each([
            [
                'interviews before the survey start date are ignored',
                '2024-01-02T00:00:00-05:00',
                undefined,
                [
                    { date: '2024-01-02', started: 3, completed: 1 },
                    { date: '2024-01-03', started: 2, completed: 1 }
                ]
            ],
            [
                'interviews after the survey end date are ignored',
                undefined,
                '2024-01-02T23:59:59-05:00',
                [
                    { date: '2024-01-01', started: 2, completed: 2 },
                    { date: '2024-01-02', started: 3, completed: 1 }
                ]
            ],
            [
                'interviews outside the start/end range are ignored',
                '2024-01-02T00:00:00-05:00',
                '2024-01-02T23:59:59-05:00',
                [{ date: '2024-01-02', started: 3, completed: 1 }]
            ]
        ]).test('%s', async (_title, startDateTime, endDateTime, expected) => {
            projectConfig.startDateTimeWithTimezoneOffset = startDateTime;
            projectConfig.endDateTimeWithTimezoneOffset = endDateTime;
            const result = await getStartedAndCompletedInterviewsByDay();
            expect(result).toEqual(expected);
        });
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
        const withDifficulty = mockInterviews.filter(
            (i) => typeof i.response.perceivedBurden?.difficultyRange === 'number'
        ).length;
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
