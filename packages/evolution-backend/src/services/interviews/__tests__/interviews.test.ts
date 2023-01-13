/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { v4 as uuidV4 } from 'uuid';

import Interviews from '../interviews';
import { InterviewAttributes } from 'evolution-common/lib/services/interviews/interview';
import interviewsQueries from '../../../models/interviews.db.queries';
import { registerAccessCodeValidationFunction } from '../../accessCode';
import { updateInterview } from '../interview';

jest.mock('../../../models/interviews.db.queries', () => ({
    findByResponse: jest.fn(),
    getInterviewByUuid: jest.fn(),
    create: jest.fn(),
    getUserInterview: jest.fn(),
    getList: jest.fn(),
    getValidationErrors: jest.fn(),
    statEditingUsers: jest.fn()
}));
const mockDbCreate = interviewsQueries.create as jest.MockedFunction<typeof interviewsQueries.create>;
const mockDbGetByUuid = interviewsQueries.getInterviewByUuid as jest.MockedFunction<typeof interviewsQueries.getInterviewByUuid>;
const mockStatEditingUsers = interviewsQueries.statEditingUsers as jest.MockedFunction<typeof interviewsQueries.statEditingUsers>;

jest.mock('../interview', () => ({
    updateInterview: jest.fn()
}));
const mockInterviewUpdate = updateInterview as jest.MockedFunction<typeof updateInterview>;

// Create 10 interviews, half are active
const allInterviews = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((id) => ({
    id,
    uuid: 'arbitrary' + id,
    user_id: id,
    is_valid: true,
    is_active: id % 2 === 0,
    responses: { accessCode: 'notsure' },
    validations: {},
    logs: [],
    is_completed: false
}));
const returnedInterview = allInterviews[3];
(interviewsQueries.findByResponse as any).mockResolvedValue(allInterviews);
mockDbGetByUuid.mockResolvedValue(returnedInterview as InterviewAttributes<unknown, unknown, unknown, unknown>);
(interviewsQueries.getUserInterview as any).mockResolvedValue(returnedInterview);
mockDbCreate.mockImplementation(async (newObject: Partial<InterviewAttributes<unknown, unknown, unknown, unknown>>, returning: string | string[] = 'id') => {
    const returnFields = typeof returning === 'string' ? [returning] : returning;
    const ret: Partial<InterviewAttributes<unknown, unknown, unknown, unknown>> = {};
    returnFields.forEach(field => ret[field] = newObject[field] || returnedInterview[field]);
    return ret;
});
(interviewsQueries.getList as any).mockResolvedValue({ interviews: allInterviews, totalCount: allInterviews.length });
(interviewsQueries.getValidationErrors as any).mockResolvedValue({ errors: [] });

describe('Find by access code', () => {
    const validCode = '7145328';
    registerAccessCodeValidationFunction((accessCode) => accessCode === validCode);

    beforeEach(async () => {
        (interviewsQueries.findByResponse as any).mockClear();
    });

    test('Get all users', async() => {
        
        const response = await Interviews.findByAccessCode(validCode);
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
        expect(interviewUserId).toBeUndefined()
    });

    test('Invalid uuid', async() => {
        const interviewUserId = await Interviews.getInterviewByUuid('not a valid uuid');
        expect(interviewsQueries.getInterviewByUuid).not.toHaveBeenCalled();
        expect(interviewUserId).toBeUndefined()
    });

    test('Invalid data', async() => {
        const interviewUserId = await Interviews.getInterviewByUuid({ foo: 'bar' } as any);
        expect(interviewsQueries.getInterviewByUuid).not.toHaveBeenCalled();
        expect(interviewUserId).toBeUndefined()
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
        expect(interview).toBeUndefined()
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

    const userId = 20;
    let createdInterview: InterviewAttributes<unknown, unknown, unknown, unknown> | undefined = undefined 

    beforeEach(() => {
        mockDbCreate.mockClear();
        mockDbGetByUuid.mockClear();
        mockInterviewUpdate.mockClear();
        mockDbCreate.mockImplementationOnce(async (interview, returning = 'uuid') => {
            const newInterview = {
                ...interview,
                uuid: interview.uuid ? interview.uuid : uuidV4()
            };
            createdInterview = newInterview as InterviewAttributes<unknown, unknown, unknown, unknown>;
            const returnInterview = {};
            const returningArr = typeof returning === 'string' ? [returning] : returning;
            returningArr?.forEach((field) => returnInterview[field] = newInterview[field]);
            return returnInterview;
        });
    });

    test('Create with empty responses', async() => {
        const newInterview = await Interviews.createInterviewForUser(userId, {});
        expect(mockDbCreate).toHaveBeenCalledTimes(1);
        expect(mockDbCreate).toHaveBeenCalledWith({
            user_id: userId,
            responses: {},
            is_active: true,
            validations: {},
            logs: []
        }, 'uuid');
        expect(newInterview).toEqual({ uuid: expect.anything() });
        expect(mockDbGetByUuid).not.toHaveBeenCalled();
        expect(mockInterviewUpdate).not.toHaveBeenCalled();
    });

    test('Create with default responses', async() => {
        mockDbGetByUuid.mockImplementationOnce(async () => createdInterview);
        const responses = {
            foo: 'bar',
            fooObj: {
                baz: 'test'
            }
        }
        const newInterview = await Interviews.createInterviewForUser(userId, responses);
        expect(mockDbCreate).toHaveBeenCalledTimes(1);
        expect(mockDbCreate).toHaveBeenCalledWith({
            user_id: userId,
            responses,
            is_active: true,
            validations: {},
            logs: []
        }, 'uuid');
        expect(newInterview).toEqual({ uuid: expect.anything() });
        expect(mockDbGetByUuid).toHaveBeenCalledTimes(1);
        expect(mockDbGetByUuid).toHaveBeenCalledWith(newInterview.uuid);
        expect(mockInterviewUpdate).toHaveBeenCalledWith(createdInterview, { 
            valuesByPath: { 'responses.foo': responses.foo, 'responses.fooObj': responses.fooObj },
            fieldsToUpdate: ['responses'] 
        });
    });

    test('Create and return single other field', async() => {
        const newInterview = await Interviews.createInterviewForUser(userId, {}, 'user_id');
        expect(mockDbCreate).toHaveBeenCalledTimes(1);
        expect(mockDbCreate).toHaveBeenCalledWith({
            user_id: userId,
            responses: {},
            is_active: true,
            validations: {},
            logs: []
        }, 'user_id');
        expect(newInterview).toEqual({ user_id: userId });
        expect(mockDbGetByUuid).not.toHaveBeenCalled();
        expect(mockInterviewUpdate).not.toHaveBeenCalled();
    });

    test('Create and return many other field', async() => {
        const returningFields = ['user_id', 'responses', 'uuid'];
        const newInterview = await Interviews.createInterviewForUser(userId, {}, returningFields);
        expect(mockDbCreate).toHaveBeenCalledTimes(1);
        expect(mockDbCreate).toHaveBeenCalledWith({
            user_id: userId,
            responses: {},
            is_active: true,
            validations: {},
            logs: []
        }, returningFields);
        expect(newInterview).toEqual({ user_id: userId, uuid: expect.anything(), responses: {} });
        expect(mockDbGetByUuid).not.toHaveBeenCalled();
        expect(mockInterviewUpdate).not.toHaveBeenCalled();
    });

});

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
            filters: { updated_at: { value: updatedAt, op: 'gte' }},
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

    test('Various isValid filter values', async() => {
        const pageIndex = 3;
        const pageSize = 10;
        // isValid: valid
        await Interviews.getAllMatching({
            pageIndex,
            pageSize,
            filter: { is_valid: 'valid' }
        });
        expect(interviewsQueries.getList).toHaveBeenCalledTimes(1);
        expect(interviewsQueries.getList).toHaveBeenCalledWith({
            filters: { is_valid: { value: true, op: 'eq' }},
            pageIndex,
            pageSize
        });

        // isValid: all
        await Interviews.getAllMatching({
            pageIndex,
            pageSize,
            filter: { is_valid: 'all' }
        });
        expect(interviewsQueries.getList).toHaveBeenCalledTimes(2);
        expect(interviewsQueries.getList).toHaveBeenLastCalledWith({
            filters: { },
            pageIndex,
            pageSize
        });

        // isValid: invalid
        await Interviews.getAllMatching({
            filter: { is_valid: 'invalid' }
        });
        expect(interviewsQueries.getList).toHaveBeenCalledTimes(3);
        expect(interviewsQueries.getList).toHaveBeenLastCalledWith({
            filters: { is_valid: { value: false, op: 'eq' }},
            pageIndex: 0,
            pageSize: -1
        });

        // isValid: notValidated
        await Interviews.getAllMatching({
            filter: { is_valid: 'notValidated' }
        });
        expect(interviewsQueries.getList).toHaveBeenCalledTimes(4);
        expect(interviewsQueries.getList).toHaveBeenLastCalledWith({
            filters: { is_valid: { value: null, op: 'eq' }},
            pageIndex: 0,
            pageSize: -1
        });

        // isValid: notInvalid
        await Interviews.getAllMatching({
            filter: { is_valid: 'notInvalid' }
        });
        expect(interviewsQueries.getList).toHaveBeenCalledTimes(5);
        expect(interviewsQueries.getList).toHaveBeenLastCalledWith({
            filters: { is_valid: { value: false, op: 'not' }},
            pageIndex: 0,
            pageSize: -1
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

});

describe('Get Validation errors', () => {

    beforeEach(() => {
        (interviewsQueries.getValidationErrors as any).mockClear();
    });

    test('Empty parameters', async() => {
        await Interviews.getValidationErrors();
        expect(interviewsQueries.getValidationErrors).toHaveBeenCalledTimes(1);
        expect(interviewsQueries.getValidationErrors).toHaveBeenCalledWith({
            filters: {}
        });
    });

    test('Various isValid filter values', async() => {
        // isValid: valid
        await Interviews.getValidationErrors({
            filter: { is_valid: 'valid' }
        });
        expect(interviewsQueries.getValidationErrors).toHaveBeenCalledTimes(1);
        expect(interviewsQueries.getValidationErrors).toHaveBeenCalledWith({
            filters: { is_valid: { value: true, op: 'eq' }}
        });

        // isValid: all
        await Interviews.getValidationErrors({
            filter: { is_valid: 'all' }
        });
        expect(interviewsQueries.getValidationErrors).toHaveBeenCalledTimes(2);
        expect(interviewsQueries.getValidationErrors).toHaveBeenLastCalledWith({
            filters: { }
        });
    });

    test('Filters: various filters', async() => {
        const updatedAt = 12300000;
        await Interviews.getValidationErrors({
            filter: { test: 'foo' }
        });
        expect(interviewsQueries.getValidationErrors).toHaveBeenCalledTimes(1);
        expect(interviewsQueries.getValidationErrors).toHaveBeenCalledWith({
            filters: { test: { value: 'foo' }}
        });

        // Updated_at is 0, should not be sent to the query
        await Interviews.getValidationErrors({
            filter: { test: 'foo', other: { value: 'bar', op: 'gte' } }
        });
        expect(interviewsQueries.getValidationErrors).toHaveBeenCalledTimes(2);
        expect(interviewsQueries.getValidationErrors).toHaveBeenLastCalledWith({
            filters: { test: { value: 'foo' }, other: { value: 'bar', op: 'gte' } }
        });
    });
});

describe('Reset interview', () => {

    test('Test with bad confirmation parameter', async () => {
        let exception: unknown = undefined;
        try {
            await Interviews.resetInterviews('confirm');
        } catch(error) {
            exception = error;
        }
        expect(exception).toBeDefined();
    });

});

describe('Stat editing users', () => {

    beforeEach(() => {
        mockStatEditingUsers.mockClear();
    })

    test('Test with correct answer', async () => {
        const userStats = [
            { email: 'foo@bar.com', count: 10 },
            { email: 'a@b.c', count: 2 }
        ]
        mockStatEditingUsers.mockResolvedValueOnce(userStats);
        const stats = await Interviews.statEditingUsers();
        expect(stats).toEqual(userStats);
        expect(mockStatEditingUsers).toHaveBeenCalledWith({});
    });

    test('Test with permissions', async () => {
        const userStats = [
            { email: 'foo@bar.com', count: 10 },
            { email: 'a@b.c', count: 2 }
        ]
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
