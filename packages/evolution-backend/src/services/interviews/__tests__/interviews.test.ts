/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { v4 as uuidV4 } from 'uuid';
import { ObjectReadableMock } from 'stream-mock';

import Interviews from '../interviews';
import { InterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import { type InterviewListStatusFilter } from 'evolution-common/lib/services/reviews/types';
import projectConfig from 'evolution-common/lib/config/project.config';
import { RandomOrderQuestions } from 'evolution-common/lib/services/questionnaire/randomOrderQuestions';
import interviewsQueries from '../../../models/interviews.db.queries';
import interviewsAccessesQueries from '../../../models/interviewsAccesses.db.queries';
import reviewDecisionsQueries from '../../../models/reviewDecisions.db.queries';
import { registerAccessCodeValidationFunction } from '../../accessCode';
import { updateInterview } from '../interview';
import moment from 'moment';
import { getParadataLoggingFunction } from '../../logging/paradataLogging';

jest.mock('../../../models/interviews.db.queries', () => ({
    findByResponse: jest.fn(),
    getInterviewByUuid: jest.fn(),
    create: jest.fn(),
    getUserInterview: jest.fn(),
    getList: jest.fn(),
    getValidationAuditStats: jest.fn(),
    getInterviewsStream: jest.fn()
}));

jest.mock('../../../models/interviewsAccesses.db.queries', () => ({
    statEditingUsers: jest.fn()
}));

jest.mock('../../../models/reviewDecisions.db.queries', () => ({
    deleteReviewDecisionsForInterview: jest.fn().mockResolvedValue(true)
}));
const mockDbCreate = interviewsQueries.create as jest.MockedFunction<typeof interviewsQueries.create>;
const mockDbGetByUuid = interviewsQueries.getInterviewByUuid as jest.MockedFunction<typeof interviewsQueries.getInterviewByUuid>;
const mockStatEditingUsers = interviewsAccessesQueries.statEditingUsers as jest.MockedFunction<typeof interviewsAccessesQueries.statEditingUsers>;

jest.mock('../interview', () => ({
    updateInterview: jest.fn()
}));
const mockInterviewUpdate = updateInterview as jest.MockedFunction<typeof updateInterview>;

jest.mock('../../logging/paradataLogging', () => ({
    getParadataLoggingFunction: jest.fn().mockReturnValue(undefined)
}));
const mockGetParadataLogFunction = getParadataLoggingFunction as jest.MockedFunction<typeof getParadataLoggingFunction>;

// Create 10 interviews, half are active
const allInterviews = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((id) => ({
    id,
    uuid: 'arbitrary' + id,
    participant_id: id,
    is_valid: true,
    is_active: id % 2 === 0,
    response: { accessCode: 'notsure' },
    validations: {},
    is_completed: false,
    is_questionable: false,
    survey_id: 1
}));
const returnedInterview = allInterviews[3];
(interviewsQueries.findByResponse as any).mockResolvedValue(allInterviews);
mockDbGetByUuid.mockResolvedValue(returnedInterview as InterviewAttributes);
(interviewsQueries.getUserInterview as any).mockResolvedValue(returnedInterview);
mockDbCreate.mockImplementation(async (newObject: Partial<InterviewAttributes>, returning: string | string[] = 'id') => {
    const returnFields = typeof returning === 'string' ? [returning] : returning;
    const ret: Partial<InterviewAttributes> = {};
    returnFields.forEach((field) => ret[field] = newObject[field] || returnedInterview[field]);
    return ret;
});
(interviewsQueries.getList as any).mockResolvedValue({ interviews: allInterviews, totalCount: allInterviews.length });
(interviewsQueries.getValidationAuditStats as any).mockResolvedValue({ audits: [] });

describe('Find by access code', () => {
    // Canonical 8-digit code (matches the default '0000-0000' format)
    const validCode = '1234-5678';

    beforeAll(() => {
        // Rely on the configured format only (no additional survey-specific check)
        registerAccessCodeValidationFunction(() => true);
    });

    afterAll(() => {
        // Reset to default permissive validation
        registerAccessCodeValidationFunction(() => true);
    });

    beforeEach(async () => {
        (interviewsQueries.findByResponse as any).mockClear();
    });

    test('Get all users', async() => {
        const response = await Interviews.findByAccessCode(validCode);
        expect(interviewsQueries.findByResponse).toHaveBeenCalledTimes(1);
        expect(interviewsQueries.findByResponse).toHaveBeenCalledWith({ accessCode: validCode });
        expect(response.length).toBeGreaterThan(0);
    });

    test('Accepted variant is searched in canonical form', async() => {
        // '12345678' is a valid variant of '1234-5678' and must be normalized before searching
        const response = await Interviews.findByAccessCode('12345678');
        expect(interviewsQueries.findByResponse).toHaveBeenCalledTimes(1);
        expect(interviewsQueries.findByResponse).toHaveBeenCalledWith({ accessCode: validCode });
        expect(response.length).toBeGreaterThan(0);
    });

    test('Invalid access code', async() => {
        const response = await Interviews.findByAccessCode('not an access code');
        expect(interviewsQueries.findByResponse).toHaveBeenCalledTimes(0);
        expect(response).toEqual([]);
    });

});

describe('Get interview by interview ID', () => {
    const interviewId = uuidV4();

    beforeEach(() => {
        (interviewsQueries.getInterviewByUuid as any).mockClear();
    });

    test('Get interview', async() => {
        const interviewUserId = await Interviews.getInterviewByUuid(interviewId);
        expect(interviewsQueries.getInterviewByUuid).toHaveBeenCalledTimes(1);
        expect(interviewsQueries.getInterviewByUuid).toHaveBeenCalledWith(interviewId);
        expect(interviewUserId).toEqual(returnedInterview);
    });

    test('Interview not found', async() => {
        (interviewsQueries.getInterviewByUuid as any).mockResolvedValue(undefined);
        const interviewUserId = await Interviews.getInterviewByUuid(interviewId);
        expect(interviewsQueries.getInterviewByUuid).toHaveBeenCalledTimes(1);
        expect(interviewsQueries.getInterviewByUuid).toHaveBeenCalledWith(interviewId);
        expect(interviewUserId).toBeUndefined();
    });

    test('Invalid uuid', async() => {
        const interviewUserId = await Interviews.getInterviewByUuid('not a valid uuid');
        expect(interviewsQueries.getInterviewByUuid).not.toHaveBeenCalled();
        expect(interviewUserId).toBeUndefined();
    });

    test('Invalid data', async() => {
        const interviewUserId = await Interviews.getInterviewByUuid({ foo: 'bar' } as any);
        expect(interviewsQueries.getInterviewByUuid).not.toHaveBeenCalled();
        expect(interviewUserId).toBeUndefined();
    });

});

describe('Get interview by userId', () => {
    const userId = 1;

    beforeEach(() => {
        (interviewsQueries.getUserInterview as any).mockClear();
    });

    test('Get interview', async() => {
        const interview = await Interviews.getUserInterview(userId);
        expect(interviewsQueries.getUserInterview).toHaveBeenCalledTimes(1);
        expect(interviewsQueries.getUserInterview).toHaveBeenCalledWith(userId);
        expect(interview).toEqual(returnedInterview);
    });

    test('Interview not found', async() => {
        (interviewsQueries.getUserInterview as any).mockResolvedValue(undefined);
        const interview = await Interviews.getUserInterview(userId);
        expect(interviewsQueries.getUserInterview).toHaveBeenCalledTimes(1);
        expect(interviewsQueries.getUserInterview).toHaveBeenCalledWith(userId);
        expect(interview).toBeUndefined();
    });

    test('Exception thrown by db query', async() => {
        const error = 'Fake database error';

        (interviewsQueries.getUserInterview as any).mockRejectedValueOnce(error);
        let thrownError: any = false;
        try {
            await Interviews.getUserInterview(userId);
        } catch (err) {
            thrownError = err;
        }
        expect(thrownError).toEqual(error);
    });

});

describe('Create interviews', () => {

    const participantId = 20;
    let createdInterview: InterviewAttributes | undefined = undefined;

    beforeEach(() => {
        jest.clearAllMocks();
        mockDbCreate.mockImplementationOnce(async (interview, returning = 'uuid') => {
            const newInterview = {
                ...interview,
                uuid: interview.uuid ? interview.uuid : uuidV4()
            };
            createdInterview = newInterview as InterviewAttributes;
            const returnInterview = {};
            const returningArr = typeof returning === 'string' ? [returning] : returning;
            returningArr?.forEach((field) => returnInterview[field] = newInterview[field]);
            return returnInterview;
        });
    });

    test('Create with empty response', async() => {

        const newInterview = await Interviews.createInterviewForUser(participantId, {});
        expect(mockDbCreate).toHaveBeenCalledTimes(1);
        expect(mockDbCreate).toHaveBeenCalledWith({
            participant_id: participantId,
            response: { _startedAt: expect.anything() },
            is_active: true,
            validations: {}
        }, 'uuid');
        expect(newInterview).toEqual({ uuid: expect.anything() });
        expect(mockDbGetByUuid).not.toHaveBeenCalled();
        expect(mockInterviewUpdate).not.toHaveBeenCalled();
    });

    describe('Create with randomOrderQuestions config', () => {

        const configuredGroup = ['q1', 'q2', 'q3'];
        let previousConfig: { [groupShortname: string]: string[] };

        beforeEach(() => {
            mockDbGetByUuid.mockImplementationOnce(async () => createdInterview);
            previousConfig = projectConfig.randomOrderQuestions;
            projectConfig.randomOrderQuestions = { attitudes: configuredGroup };
        });

        afterEach(() => {
            projectConfig.randomOrderQuestions = previousConfig;
        });

        // The order drawn in the response of the created interview
        const createdOrder = (): string[] =>
            (mockDbCreate.mock.calls[0][0].response as { _randomOrderQuestions: RandomOrderQuestions })
                ._randomOrderQuestions.attitudes;

        test.each([
            ['no order in the initial response', {}],
            ['a blank order in the initial response', { _randomOrderQuestions: null }]
        ])('Draws an order when there is %s', async (_title, initialResponse) => {
            await Interviews.createInterviewForUser(participantId, initialResponse);
            expect([...createdOrder()].sort()).toEqual(configuredGroup);
            // The drawn order must not be overwritten by the initial response
            expect(mockInterviewUpdate).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
                valuesByPath: expect.objectContaining({ 'response._randomOrderQuestions': expect.anything() })
            }));
        });

        test('Keeps the order set by the project', async () => {
            const projectOrder = ['q3', 'q1', 'q2'];
            await Interviews.createInterviewForUser(participantId, { _randomOrderQuestions: { attitudes: projectOrder } });
            expect(createdOrder()).toEqual(projectOrder);
        });
    });

    test('Create with default response', async() => {
        mockDbGetByUuid.mockImplementationOnce(async () => createdInterview);
        const response = {
            foo: 'bar',
            fooObj: {
                baz: 'test'
            }
        };
        const newInterview = await Interviews.createInterviewForUser(participantId, response);
        expect(mockDbCreate).toHaveBeenCalledTimes(1);
        expect(mockDbCreate).toHaveBeenCalledWith({
            participant_id: participantId,
            response: { ...response, _startedAt: expect.anything() },
            is_active: true,
            validations: {}
        }, 'uuid');
        expect(newInterview).toEqual({ uuid: expect.anything() });
        expect(mockDbGetByUuid).toHaveBeenCalledTimes(1);
        expect(mockDbGetByUuid).toHaveBeenCalledWith(newInterview.uuid);
        expect(mockInterviewUpdate).toHaveBeenCalledWith(createdInterview, {
            valuesByPath: { 'response.foo': response.foo, 'response.fooObj': response.fooObj },
            fieldsToUpdate: ['response']
        });
    });

    test('Create and return single other field', async() => {
        const userId = 1;
        const newInterview = await Interviews.createInterviewForUser(participantId, {}, userId, 'participant_id');
        expect(mockDbCreate).toHaveBeenCalledTimes(1);
        expect(mockDbCreate).toHaveBeenCalledWith({
            participant_id: participantId,
            response: { _startedAt: expect.anything() },
            is_active: true,
            validations: {}
        }, 'participant_id');
        expect(newInterview).toEqual({ participant_id: participantId });
        expect(mockDbGetByUuid).not.toHaveBeenCalled();
        expect(mockInterviewUpdate).not.toHaveBeenCalled();
    });

    test('Create and return many other field', async() => {
        const initialTimeStamp = moment().unix();
        const returningFields = ['participant_id', 'response', 'uuid'];
        const newInterview = await Interviews.createInterviewForUser(participantId, {}, undefined, returningFields);
        expect(mockDbCreate).toHaveBeenCalledTimes(1);
        expect(mockDbCreate).toHaveBeenCalledWith({
            participant_id: participantId,
            response: { _startedAt: expect.anything() },
            is_active: true,
            validations: {}
        }, returningFields);
        expect(newInterview).toEqual({ participant_id: participantId, uuid: expect.anything(), response: { _startedAt: expect.anything() } });
        expect(mockDbGetByUuid).not.toHaveBeenCalled();
        expect(mockInterviewUpdate).not.toHaveBeenCalled();

        // Make sure timestamp in response is higher than the one at the beginning of the test
        expect((newInterview.response as any)._startedAt).toBeGreaterThanOrEqual(initialTimeStamp);
    });

    test('Create with log update', async() => {
        mockDbGetByUuid.mockImplementationOnce(async () => createdInterview);
        // Return a log function and make sure it is passed to the update
        const logFunction = jest.fn();
        const userId = 123;
        mockGetParadataLogFunction.mockReturnValueOnce(logFunction);

        const newInterview = await Interviews.createInterviewForUser(participantId, { initial: 'value' }, userId);
        expect(mockDbCreate).toHaveBeenCalledTimes(1);
        expect(mockDbCreate).toHaveBeenCalledWith({
            participant_id: participantId,
            response: { _startedAt: expect.anything(), initial: 'value' },
            is_active: true,
            validations: {}
        }, 'uuid');
        expect(newInterview).toEqual({ uuid: expect.anything() });
        expect(mockDbGetByUuid).toHaveBeenCalledTimes(1);
        expect(mockDbGetByUuid).toHaveBeenCalledWith(newInterview.uuid);
        expect(mockGetParadataLogFunction).toHaveBeenCalledTimes(1);
        expect(mockGetParadataLogFunction).toHaveBeenCalledWith({ interviewId: createdInterview!.id, userId });
        expect(mockInterviewUpdate).toHaveBeenCalledWith(createdInterview, {
            logUpdate: logFunction,
            valuesByPath: { 'response.initial': 'value' },
            fieldsToUpdate: ['response']
        });
    });

});

// [reviewStatus filter requested, filters expected in the db query]
const reviewStatusFilterCases: [InterviewListStatusFilter, { [key: string]: unknown }][] = [
    ['all', {}],
    ['notReviewed', { review_status: { value: 'notReviewed' } }],
    ['approved', { review_status: { value: 'approved' } }],
    ['rejected', { review_status: { value: 'rejected' } }],
    ['conflict', { review_status: { value: 'conflict' } }],
    ['forceApproved', { review_status: { value: 'forceApproved' } }],
    ['notRejected', { review_status: { value: 'notRejected' } }],
    // `questionable` is a column of its own, not a review status
    ['questionable', { is_questionable: { value: true, op: 'eq' } }]
];

describe('Get all matching', () => {

    beforeEach(() => {
        (interviewsQueries.getList as any).mockClear();
    });

    test('Empty parameters', async() => {
        await Interviews.getAllMatching();
        expect(interviewsQueries.getList).toHaveBeenCalledTimes(1);
        expect(interviewsQueries.getList).toHaveBeenCalledWith({
            filters: {},
            pageIndex: 0,
            pageSize: -1
        });
    });

    test('Page index and page size', async() => {
        const pageIndex = 3;
        const pageSize = 10;
        await Interviews.getAllMatching({
            pageIndex,
            pageSize,
        });
        expect(interviewsQueries.getList).toHaveBeenCalledTimes(1);
        expect(interviewsQueries.getList).toHaveBeenCalledWith({
            filters: {},
            pageIndex,
            pageSize
        });
    });

    test('Filters: updatedAt and others', async() => {
        const updatedAt = 12300000;
        await Interviews.getAllMatching({
            updatedAt
        });
        expect(interviewsQueries.getList).toHaveBeenCalledTimes(1);
        expect(interviewsQueries.getList).toHaveBeenCalledWith({
            filters: { updated_at: { value: updatedAt, op: 'gte' } },
            pageIndex: 0,
            pageSize: -1
        });

        // Updated_at is 0, should not be sent to the query
        await Interviews.getAllMatching({
            updatedAt: 0
        });
        expect(interviewsQueries.getList).toHaveBeenCalledTimes(2);
        expect(interviewsQueries.getList).toHaveBeenLastCalledWith({
            filters: {},
            pageIndex: 0,
            pageSize: -1
        });
    });

    test.each(reviewStatusFilterCases)('Review status filter value: %s', async(reviewStatus, expectedFilters) => {
        const pageIndex = 3;
        const pageSize = 10;
        await Interviews.getAllMatching({ pageIndex, pageSize, filter: { review_status: reviewStatus } });
        expect(interviewsQueries.getList).toHaveBeenCalledTimes(1);
        expect(interviewsQueries.getList).toHaveBeenCalledWith({
            filters: expectedFilters,
            pageIndex,
            pageSize
        });
    });

    test('Only page size', async() => {
        const pageSize = 10;
        // isValid: valid
        await Interviews.getAllMatching({
            pageSize,
        });
        expect(interviewsQueries.getList).toHaveBeenCalledTimes(1);
        expect(interviewsQueries.getList).toHaveBeenCalledWith({
            filters: {},
            pageIndex: 0,
            pageSize
        });
    });

    test('Only page index', async() => {
        const pageIndex = 3;
        // isValid: valid
        await Interviews.getAllMatching({
            pageIndex,
        });
        expect(interviewsQueries.getList).toHaveBeenCalledTimes(1);
        expect(interviewsQueries.getList).toHaveBeenCalledWith({
            filters: {},
            pageIndex,
            pageSize: -1
        });
    });

    test('With sort', async() => {
        const pageIndex = 3;
        // isValid: valid
        await Interviews.getAllMatching({
            pageIndex,
            sort: ['uuid']
        });
        expect(interviewsQueries.getList).toHaveBeenCalledTimes(1);
        expect(interviewsQueries.getList).toHaveBeenCalledWith({
            filters: {},
            pageIndex,
            pageSize: -1,
            sort: ['uuid']
        });
    });

    test('Filters: various filters', async() => {
        // string audit
        await Interviews.getAllMatching({
            filter: { audits: 'myAudit' }
        });
        expect(interviewsQueries.getList).toHaveBeenCalledTimes(1);
        expect(interviewsQueries.getList).toHaveBeenCalledWith({
            filters: { audits: { value: 'myAudit' } },
            pageIndex: 0,
            pageSize: -1
        });

        // array of string audit
        await Interviews.getAllMatching({
            filter: { audits: ['myAudit1', 'myAudit2'] }
        });
        expect(interviewsQueries.getList).toHaveBeenCalledTimes(2);
        expect(interviewsQueries.getList).toHaveBeenCalledWith({
            filters: { audits: { value: ['myAudit1', 'myAudit2'] } },
            pageIndex: 0,
            pageSize: -1
        });

        // object filter
        await Interviews.getAllMatching({
            filter: { audits: { value: 'myAudit', op: 'like' } }
        });
        expect(interviewsQueries.getList).toHaveBeenCalledTimes(3);
        expect(interviewsQueries.getList).toHaveBeenCalledWith({
            filters: { audits: { value: 'myAudit', op: 'like' } },
            pageIndex: 0,
            pageSize: -1
        });

    });

});

describe('Get Validation errors', () => {

    beforeEach(() => {
        (interviewsQueries.getValidationAuditStats as any).mockClear();
    });

    test('Empty parameters', async() => {
        await Interviews.getValidationAuditStats();
        expect(interviewsQueries.getValidationAuditStats).toHaveBeenCalledTimes(1);
        expect(interviewsQueries.getValidationAuditStats).toHaveBeenCalledWith({
            filters: {}
        });
    });

    test.each(reviewStatusFilterCases)(
        'Review status filter value: %s',
        async(reviewStatus, expectedFilters) => {
            await Interviews.getValidationAuditStats({ filter: { review_status: reviewStatus } });
            expect(interviewsQueries.getValidationAuditStats).toHaveBeenCalledTimes(1);
            expect(interviewsQueries.getValidationAuditStats).toHaveBeenCalledWith({ filters: expectedFilters });
        }
    );

    test('Filters: various filters', async() => {
        await Interviews.getValidationAuditStats({
            filter: { test: 'foo' }
        });
        expect(interviewsQueries.getValidationAuditStats).toHaveBeenCalledTimes(1);
        expect(interviewsQueries.getValidationAuditStats).toHaveBeenCalledWith({
            filters: { test: { value: 'foo' } }
        });

        // Updated_at is 0, should not be sent to the query
        await Interviews.getValidationAuditStats({
            filter: { test: 'foo', other: { value: 'bar', op: 'gte' } }
        });
        expect(interviewsQueries.getValidationAuditStats).toHaveBeenCalledTimes(2);
        expect(interviewsQueries.getValidationAuditStats).toHaveBeenLastCalledWith({
            filters: { test: { value: 'foo' }, other: { value: 'bar', op: 'gte' } }
        });
    });
});

describe('Reset interview', () => {

    const mockDeleteReviewDecisions = reviewDecisionsQueries.deleteReviewDecisionsForInterview as jest.MockedFunction<typeof reviewDecisionsQueries.deleteReviewDecisionsForInterview>;
    const mockGetInterviewsStream = interviewsQueries.getInterviewsStream as jest.MockedFunction<typeof interviewsQueries.getInterviewsStream>;

    test('Test with bad confirmation parameter', async () => {
        let exception: unknown = undefined;
        try {
            await Interviews.resetInterviews('confirm');
        } catch(error) {
            exception = error;
        }
        expect(exception).toBeDefined();
    });

    test('Should delete the review decisions along with the legacy validation fields', async () => {
        const interview = { id: 3, uuid: uuidV4(), response: { accessCode: '1111-2222' } };
        mockInterviewUpdate.mockResolvedValue({} as any);
        mockGetInterviewsStream.mockReturnValue(new ObjectReadableMock([interview]) as any);

        await Interviews.resetInterviews('I WANT TO DELETE ALL VALIDATION WORK');

        expect(mockDeleteReviewDecisions).toHaveBeenCalledTimes(1);
        expect(mockDeleteReviewDecisions).toHaveBeenCalledWith(interview.id);
        expect(mockInterviewUpdate).toHaveBeenCalledWith(interview, {
            fieldsToUpdate: ['corrected_response', 'is_completed', 'is_validated', 'is_valid'],
            valuesByPath: {
                corrected_response: interview.response,
                is_completed: null,
                is_validated: null,
                is_valid: null
            }
        });
    });

});

describe('Stat editing users', () => {

    beforeEach(() => {
        mockStatEditingUsers.mockClear();
    });

    test('Test with correct answer', async () => {
        const userStats = [
            { email: 'foo@bar.com', interview_id: 12, user_id: 3, for_validation: false, update_count: 10, created_at: '2023-06-28', updated_at: '2023-06-28' },
            { email: 'a@b.c', interview_id: 12, user_id: 3, for_validation: false, update_count: 2, created_at: '2023-06-28', updated_at: '2023-06-28' }
        ];
        mockStatEditingUsers.mockResolvedValueOnce(userStats);
        const stats = await Interviews.statEditingUsers();
        expect(stats).toEqual(userStats);
        expect(mockStatEditingUsers).toHaveBeenCalledWith({});
    });

    test('Test with permissions', async () => {
        const userStats = [
            { email: 'foo@bar.com', interview_id: 12, user_id: 3, for_validation: false, update_count: 10, created_at: '2023-06-28', updated_at: '2023-06-28' },
            { email: 'a@b.c', interview_id: 12, user_id: 3, for_validation: false, update_count: 2, created_at: '2023-06-28', updated_at: '2023-06-28' }
        ];
        mockStatEditingUsers.mockResolvedValueOnce(userStats);
        const stats = await Interviews.statEditingUsers({ permissions: [ 'role1', 'role2' ] });
        expect(stats).toEqual(userStats);
        expect(mockStatEditingUsers).toHaveBeenCalledWith({ permissions: [ 'role1', 'role2' ] });
    });

    test('Test with exception', async () => {
        mockStatEditingUsers.mockRejectedValueOnce('Error');
        let exception: unknown = undefined;
        try {
            await Interviews.statEditingUsers();
        } catch(error) {
            exception = error;
        }
        expect(exception).toBeDefined();
    });

});
