/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { NextFunction, Request, Response } from 'express';
import { v4 as uuidV4 } from 'uuid';
import isAuthorized,  { isUserAllowed } from '../userAuthorization';
import each from 'jest-each';
import Interviews from '../../interviews/interviews';
import defineDefaultRoles from '../roleDefinition';

defineDefaultRoles();

let mockRequest: Partial<Request>;
let mockResponse: Partial<Response>;
const nextFunction: NextFunction = jest.fn();
const mockUser = { id: 3, username: 'notAdmin', is_admin: false };
const mockAdmin = { id: 4, username: 'admin', is_admin: true };

const mockGetInterviewByUuid = Interviews.getInterviewByUuid = jest.fn();

const interviewId = uuidV4();

beforeEach(() => {
    mockRequest = {};
    mockResponse = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
    };
    (nextFunction as any).mockClear();
    mockGetInterviewByUuid.mockClear();
});

describe('User interview access', () => {
    const defaultPermissions = ['update', 'read'];
    const defaultGetParams = { params: { interviewId } };
    const defaultPostParams = { body: { interviewId } };

    each([
        ['No authenticated user', undefined, defaultGetParams, defaultPermissions, undefined, 401],
        ['Normal user, no interview id', mockUser, {}, defaultPermissions, undefined, true],
        ['Get params, Normal user, interview not found', mockUser, defaultGetParams, defaultPermissions, undefined, 404],
        ['Get params, Normal user, interview exists', mockUser, defaultGetParams, defaultPermissions, true, 401],
        ['Get params, Admin user, interview not found', mockAdmin, defaultGetParams, defaultPermissions, undefined, 404],
        ['Get params, Admin user, interview exists', mockAdmin, defaultGetParams, defaultPermissions, true, true],
        ['Get params, Admin user, interview with extra permissions', mockAdmin, defaultGetParams, [...defaultPermissions, 'validate'], true, true],
        ['Get params, Normal user, interview not found', mockUser, defaultPostParams, defaultPermissions, undefined, 404],
        ['Get params, Normal user, interview exists', mockUser, defaultPostParams, defaultPermissions, true, 401],
        ['Get params, Admin user, interview not found', mockAdmin, defaultPostParams, defaultPermissions, undefined, 404],
        ['Get params, Admin user, interview exists', mockAdmin, defaultPostParams, defaultPermissions, true, true],
        ['Get params, Admin user, interview with extra permissions', mockAdmin, defaultPostParams, [...defaultPermissions, 'validate'], true, true],
        ['Post and get params, identical, ok', mockAdmin, { ...defaultPostParams, ...defaultGetParams }, defaultPermissions, true, true],
        ['Post and get params, not identical, not ok', mockAdmin, { ...defaultGetParams, body: { interviewId: uuidV4() } }, defaultPermissions, true, 400]
    ]).test('%s', async (_title, user, reqParams, requestedPermissions, retUndefined, expectedNextOrCode, is_active = true) => {
        mockRequest.user = user;
        const request = { ...mockRequest, ...reqParams };
        mockGetInterviewByUuid.mockResolvedValue(retUndefined ? { id: 1, participant_id: 1, is_active } : undefined);
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
        ['Normal user', mockUser, defaultPermissions, false],
        ['Admin user', mockAdmin, defaultPermissions, true],
        ['Admin user, with extra permissions', mockAdmin, [...defaultPermissions, 'validate'], true],
    ]).test('%s', async (_title, user, requestedPermissions, expectedResult, is_active = true) => {
        const interview = {
            id: 3,
            uuid: 'arbitrary',
            participant_id: 1,
            is_completed: true,
            is_questionable: false,
            response: {},
            validations: {},
            is_valid: true,
            is_active,
            survey_id: 1
        };
        expect(isUserAllowed(user, interview, requestedPermissions)).toEqual(expectedResult);
    });
});
