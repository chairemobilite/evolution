/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { NextFunction, Request, Response } from 'express';
import { v4 as uuidV4 } from 'uuid'
import isAuthorized,  { isUserAllowed } from '../authorization';
import each from 'jest-each';
import Interviews from '../../interviews/interviews';
import defineDefaultRoles from '../roleDefinition';

defineDefaultRoles();

let mockRequest: Partial<Request>;
let mockResponse: Partial<Response>;
let nextFunction: NextFunction = jest.fn();
let mockUser = { id: 3, username: 'notAdmin', is_admin: false };
let mockAdmin = { id: 4, username: 'admin', is_admin: true };

const mockGetUserId = Interviews.getInterviewByUuid = jest.fn();

const interviewId = uuidV4();

beforeEach(() => {
    mockRequest = {};
    mockResponse = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
    };
    (nextFunction as any).mockClear();
    mockGetUserId.mockClear();
});

describe('User interview access', () => {
    const defaultPermissions = ['update', 'read'];
    const defaultGetParams = { params: { interviewId }};
    const defaultPostParams = { body: { interviewId }};

    each([
        ['No authenticated user', undefined, defaultGetParams, defaultPermissions, undefined, 401],
        ['Normal user, no interview id', mockUser, {}, defaultPermissions, undefined, true],
        ['Get params, Normal user, interview not found', mockUser, defaultGetParams, defaultPermissions, undefined, 404],
        ['Get params, Normal user, own interview, ok', mockUser, defaultGetParams, defaultPermissions, mockUser.id, true],
        ['Get params, Normal user, own inactive interview, not ok', mockUser, defaultGetParams, defaultPermissions, mockUser.id, 401, false],
        ['Get params, Normal user, own interview with validation, not ok', mockUser, defaultGetParams, [...defaultPermissions, 'validate'], mockUser.id, 401],
        ['Get params, Normal user, other interview, not ok', mockUser, defaultGetParams, defaultPermissions, mockAdmin.id, 401],
        ['Get params, Admin user, interview not found', mockAdmin, defaultGetParams, defaultPermissions, undefined, 404],
        ['Get params, Admin user, own interview, ok', mockAdmin, defaultGetParams, defaultPermissions, mockAdmin.id, true],
        ['Get params, Admin user, own interview with validation, ok', mockAdmin, defaultGetParams, [...defaultPermissions, 'validate'], mockAdmin.id, true],
        ['Get params, Admin user, other interview, ok', mockAdmin, defaultGetParams, defaultPermissions, mockUser.id, true],
        ['Post params, Normal user, interview not found', mockUser, defaultPostParams, defaultPermissions, undefined, 404],
        ['Post params, Normal user, own interview, ok', mockUser, defaultPostParams, defaultPermissions, mockUser.id, true],
        ['Post params, Normal user, own interview with validation, not ok', mockUser, defaultPostParams, [...defaultPermissions, 'validate'], mockUser.id, 401],
        ['Post params, Normal user, other interview, not ok', mockUser, defaultPostParams, defaultPermissions, mockAdmin.id, 401],
        ['Post params, Admin user, interview not found', mockAdmin, defaultPostParams, defaultPermissions, undefined, 404],
        ['Post params, Admin user, own interview, ok', mockAdmin, defaultPostParams, defaultPermissions, mockAdmin.id, true],
        ['Post params, Admin user, own interview with validation, ok', mockAdmin, defaultPostParams, [...defaultPermissions, 'validate'], mockAdmin.id, true],
        ['Post params, Admin user, other interview, ok', mockAdmin, defaultPostParams, defaultPermissions, mockUser.id, true],
        ['Post and get params, identical, ok', mockUser, { ...defaultPostParams, ...defaultGetParams }, defaultPermissions, mockUser.id, true],
        ['Post and get params, not identical, ok', mockUser, { ...defaultGetParams, body: { interviewId: uuidV4() } }, defaultPermissions, mockUser.id, 400]
    ]).test('%s', async (_title, user, reqParams, requestedPermissions, retUserId, expectedNextOrCode, is_active = true) => {
        mockRequest.user = user;
        const request = {...mockRequest, ...reqParams };
        mockGetUserId.mockResolvedValue(retUserId ? { id: retUserId, user_id: retUserId, is_active } : undefined);
        await isAuthorized(requestedPermissions)(request as Request, mockResponse as Response, nextFunction);
        if (typeof expectedNextOrCode === 'number') {
            expect(mockResponse.status).toHaveBeenCalledTimes(1);
            expect(mockResponse.status).toHaveBeenCalledWith(expectedNextOrCode);
            expect(nextFunction).not.toHaveBeenCalled();
        } else {
            expect(mockResponse.status).not.toHaveBeenCalled();
            expect(nextFunction).toHaveBeenCalledTimes(1);
        }
    });
});

describe('is User allowed', () => {
    const defaultPermissions = ['update', 'read'];

    each([
        ['Get params, Normal user, interview not found', mockUser, defaultPermissions, undefined, false],
        ['Get params, Normal user, own interview, ok', mockUser, defaultPermissions, mockUser.id, true],
        ['Get params, Normal user, own inactive interview, not ok', mockUser, defaultPermissions, mockUser.id, false, false],
        ['Get params, Normal user, own interview with validation, not ok', mockUser, [...defaultPermissions, 'validate'], mockUser.id, false],
        ['Get params, Normal user, other interview, not ok', mockUser, defaultPermissions, mockAdmin.id, false],
        ['Get params, Admin user, own interview, ok', mockAdmin, defaultPermissions, mockAdmin.id, true],
        ['Get params, Admin user, own interview with validation, ok', mockAdmin, [...defaultPermissions, 'validate'], mockAdmin.id, true],
        ['Get params, Admin user, other interview, ok', mockAdmin, defaultPermissions, mockUser.id, true],
    ]).test('%s', async (_title, user, requestedPermissions, retUserId, expectedResult, is_active = true) => {
        const interview = {
            id: 3,
            uuid: 'arbitrary',
            user_id: retUserId,
            is_completed: true,
            responses: {},
            validations: {},
            is_valid: true,
            is_active,
            logs: []
        };
        expect(isUserAllowed(user, interview, requestedPermissions)).toEqual(expectedResult);
    });
});