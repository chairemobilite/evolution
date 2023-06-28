/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { NextFunction, Request, Response } from 'express';
import { v4 as uuidV4 } from 'uuid'
import { logUserAccessesMiddleware, defaultMiddlewares } from '../queryLoggingMiddleware';
import each from 'jest-each';
import interviewsAccessesDbQueries from '../../../models/interviewsAccesses.db.queries';

jest.mock('../../../models/interviewsAccesses.db.queries', () => ({
    userOpenedInterview: jest.fn(),
    userUpdatedInterview: jest.fn(),
}));
const mockUserOpenedQuery = interviewsAccessesDbQueries.userOpenedInterview as jest.MockedFunction<typeof interviewsAccessesDbQueries.userOpenedInterview>;
const mockUserUpdatedQuery = interviewsAccessesDbQueries.userUpdatedInterview as jest.MockedFunction<typeof interviewsAccessesDbQueries.userUpdatedInterview>;

let mockRequest: Partial<Request>;
let mockResponse: Partial<Response>;
let nextFunction: NextFunction = jest.fn();
let mockUser = { id: 3, username: 'notAdmin' };

const interviewId = uuidV4();

beforeEach(() => {
    mockRequest = {};
    mockResponse = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
    };
    (nextFunction as any).mockClear();
    mockUserOpenedQuery.mockClear();
    mockUserUpdatedQuery.mockClear();
});

each([
    ['Interview uuid in params', mockUser, { interviewUuid: interviewId }, true],
    ['Interview id in params', mockUser, { interviewUuid: interviewId }, true],
    ['No interview ID', mockUser, {  }, false],
    ['No user, should not happen, but not cause exception either', undefined, { interviewUuid: interviewId }, false],
]).describe('log opening the interview: %s', (_title, user, reqParams, expectedCalled) => {

    test('log user access: edit mode', async () => {
        mockRequest.user = user;
        const request = { ...mockRequest, params: reqParams };
        logUserAccessesMiddleware.openingInterview(false)(request as Request, mockResponse as Response, nextFunction);
        if (expectedCalled) {
            expect(mockUserOpenedQuery).toHaveBeenCalledTimes(1);
            expect(mockUserOpenedQuery).toHaveBeenCalledWith({ interviewUuid: interviewId, userId: user.id, validationMode: false });
        } else {
            expect(mockUserOpenedQuery).not.toHaveBeenCalled();
        }
        expect(nextFunction).toHaveBeenCalled();
    });

    test('log user access: validation mode', async () => {
        mockRequest.user = user;
        const request = { ...mockRequest, params: reqParams };
        logUserAccessesMiddleware.openingInterview(true)(request as Request, mockResponse as Response, nextFunction);
        if (expectedCalled) {
            expect(mockUserOpenedQuery).toHaveBeenCalledTimes(1);
            expect(mockUserOpenedQuery).toHaveBeenCalledWith({ interviewUuid: interviewId, userId: user.id, validationMode: true });
        } else {
            expect(mockUserOpenedQuery).not.toHaveBeenCalled();
        }
        expect(nextFunction).toHaveBeenCalled();
    });

    test('default no log: edit mode', async () => {
        mockRequest.user = user;
        const request = { ...mockRequest, params: reqParams };
        defaultMiddlewares.openingInterview(false)(request as Request, mockResponse as Response, nextFunction);
        expect(nextFunction).toHaveBeenCalled();
    });

    test('default no log: validation mode', async () => {
        mockRequest.user = user;
        const request = { ...mockRequest, params: reqParams };
        defaultMiddlewares.openingInterview(true)(request as Request, mockResponse as Response, nextFunction);
        expect(nextFunction).toHaveBeenCalled();
    });
});

each([
    ['Interview uuid in params', mockUser, { interviewUuid: interviewId }, {}, true],
    ['Interview id in body', mockUser, {}, { interviewId: interviewId }, true],
    ['No interview ID', mockUser, {}, {}, false],
    ['No user, should not happen, but not cause exception either', undefined, { interviewUuid: interviewId }, {}, false],
]).describe('log updating the interview: %s', (_title, user, reqParams, body, expectedCalled) => {

    test('edit mode', async () => {
        mockRequest.user = user;
        const request = { ...mockRequest, params: reqParams, body: body };
        logUserAccessesMiddleware.updatingInterview(false)(request as Request, mockResponse as Response, nextFunction);
        if (expectedCalled) {
            expect(mockUserUpdatedQuery).toHaveBeenCalledTimes(1);
            expect(mockUserUpdatedQuery).toHaveBeenCalledWith({ interviewUuid: interviewId, userId: user.id, validationMode: false });
        } else {
            expect(mockUserUpdatedQuery).not.toHaveBeenCalled();
        }
        expect(nextFunction).toHaveBeenCalled();
    });

    test('validation mode', async () => {
        mockRequest.user = user;
        const request = { ...mockRequest, params: reqParams, body: body };
        logUserAccessesMiddleware.updatingInterview(true)(request as Request, mockResponse as Response, nextFunction);
        if (expectedCalled) {
            expect(mockUserUpdatedQuery).toHaveBeenCalledTimes(1);
            expect(mockUserUpdatedQuery).toHaveBeenCalledWith({ interviewUuid: interviewId, userId: user.id, validationMode: true });
        } else {
            expect(mockUserUpdatedQuery).not.toHaveBeenCalled();
        }
        expect(nextFunction).toHaveBeenCalled();
    });

    test('default no log: edit mode', async () => {
        mockRequest.user = user;
        const request = { ...mockRequest, params: reqParams, body: body };
        defaultMiddlewares.updatingInterview(false)(request as Request, mockResponse as Response, nextFunction);
        expect(nextFunction).toHaveBeenCalled();
    });

    test('default no log: validation mode', async () => {
        mockRequest.user = user;
        const request = { ...mockRequest, params: reqParams, body: body };
        defaultMiddlewares.updatingInterview(true)(request as Request, mockResponse as Response, nextFunction);
        expect(nextFunction).toHaveBeenCalled();
    });
});
