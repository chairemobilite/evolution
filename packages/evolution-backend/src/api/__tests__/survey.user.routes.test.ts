/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { v4 as uuidV4 } from 'uuid';
import request from 'supertest';
import express, { Router } from 'express';
import surveyUserRoutes from '../survey.user.routes';
import { InterviewLoggingMiddlewares } from '../../services/logging/queryLoggingMiddleware';
import Interviews from '../../services/interviews/interviews';
import { addRolesToInterview } from '../../services/interviews/interview';
import { isLoggedIn } from 'chaire-lib-backend/lib/services/auth/authorization';
import { getParadataLoggingFunction } from '../../services/logging/paradataLogging';

jest.mock('../../services/interviews/interviews', () => ({
    getInterviewByUuid: jest.fn()
}));
const mockGetInterviewByUuid = Interviews.getInterviewByUuid as jest.MockedFunction<typeof Interviews.getInterviewByUuid>;
jest.mock('../../services/interviews/interview', () => ({
    addRolesToInterview: jest.fn()
}));
const mockAddRolesToInterview = addRolesToInterview as jest.MockedFunction<typeof addRolesToInterview>;
jest.mock('../../services/logging/queryLoggingMiddleware');
jest.mock('../../services/logging/paradataLogging', () => ({
    getParadataLoggingFunction: jest.fn()
}));

const mockUserId = 3;
const mockAuthorizationMiddleware = jest.fn(() => (req, res, next) => next());
const mockLoggingMiddleware: InterviewLoggingMiddlewares = {
    getUserIdForLogging: jest.fn(() => mockUserId),
    openingInterview: jest.fn(() => (req, res, next) => next()),
    updatingInterview: jest.fn(() => (req, res, next) => next())
};

// Set the user in the request at the same time
jest.mock('chaire-lib-backend/lib/services/auth/authorization', () => ({
    isLoggedIn: jest.fn((req, res, next) => {
        req.user = { id: mockUserId }; // Mock user object
        next();
    }),
}));
const mockIsLoggedIn = isLoggedIn as jest.MockedFunction<typeof isLoggedIn>;
const mockGetParadataLoggingFunction = getParadataLoggingFunction as jest.MockedFunction<
    typeof getParadataLoggingFunction
>;

const app = express();
app.use(express.json());
app.use(
    surveyUserRoutes(mockAuthorizationMiddleware, mockLoggingMiddleware)
);

describe('GET /survey/activeInterview/:interviewUuid', () => {

    const interviewUuid = uuidV4();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return 400 if user is not defined', async () => {
        mockIsLoggedIn.mockImplementationOnce((req, res, next) => {
            req.user = undefined; // Simulate undefined user
            next();
        });

        const response = await request(app).get('/survey/activeInterview/' + interviewUuid);
        expect(response.status).toBe(400);
        expect(response.body).toEqual({ status: 'BadRequest' });
    });

    it('should return 404 if interview is not found', async () => {
        mockGetInterviewByUuid.mockResolvedValueOnce(undefined);

        const response = await request(app)
            .get('/survey/activeInterview/' + interviewUuid);

        expect(response.status).toBe(404);
        expect(response.body).toEqual({ status: 'notFound', interview: null });
        expect(mockGetInterviewByUuid).toHaveBeenCalledWith(interviewUuid);
    });

    it('should return 200 with interview if found', async () => {
        const mockInterview = { id: 1, uuid: interviewUuid };
        mockGetInterviewByUuid.mockResolvedValueOnce(mockInterview as any);

        const response = await request(app)
            .get('/survey/activeInterview/' + interviewUuid);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ status: 'success', interview: mockInterview });
        expect(mockAddRolesToInterview).toHaveBeenCalledWith(mockInterview, { id: mockUserId });
        expect(mockGetInterviewByUuid).toHaveBeenCalledWith(interviewUuid);
    });

    it('should return 200 if interview is frozen', async () => {
        const mockInterview = { id: 1, uuid: interviewUuid, is_frozen: true };
        mockGetInterviewByUuid.mockResolvedValueOnce(mockInterview as any);

        const response = await request(app).get('/survey/activeInterview/' + interviewUuid);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ status: 'success', interview: mockInterview });
        expect(mockAddRolesToInterview).toHaveBeenCalledWith(mockInterview, { id: mockUserId });
    });

    it('should return 500 if an error occurs', async () => {
        mockGetInterviewByUuid.mockRejectedValueOnce(new Error('Database error'));

        const response = await request(app)
            .get('/survey/activeInterview/' + interviewUuid);

        expect(response.status).toBe(500);
        expect(response.body).toEqual({
            status: 'failed',
            interview: null,
            error: 'cannot fetch interview'
        });
    });

    it('should return failed status if uuid is not valid', async () => {
        const response = await request(app).get('/survey/activeInterview/notAUuid');
        expect(response.status).toBe(400);
        expect(response.body).toEqual({ status: 'failed', error: "Invalid interview ID" });
    });
});

describe('POST /survey/logClientEvent', () => {
    const clientEvent = { type: 'buttonClick', path: 'survey.next' };

    beforeEach(() => {
        jest.clearAllMocks();
        mockGetParadataLoggingFunction.mockReturnValue(undefined);
        (mockLoggingMiddleware.getUserIdForLogging as jest.Mock).mockReturnValue(mockUserId);
    });

    test('should log an event for an admin user with an interview ID', async () => {
        const logFunction = jest.fn();
        mockGetParadataLoggingFunction.mockReturnValue(logFunction);

        const response = await request(app)
            .post('/survey/logClientEvent/')
            .send({ interviewId: 42, clientEvent });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ status: 'success' });
        expect(mockGetParadataLoggingFunction).toHaveBeenCalledWith({
            interviewId: 42,
            userId: mockUserId
        });
        expect(logFunction).toHaveBeenCalledWith({ userAction: clientEvent });
    });

    test('should return 400 when the interview ID is missing', async () => {
        const response = await request(app).post('/survey/logClientEvent/').send({ clientEvent });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ status: 'MissingInterviewId' });
        expect(mockGetParadataLoggingFunction).not.toHaveBeenCalled();
    });

    test.each([
        ['a UUID', uuidV4()],
        ['a non-numeric string', 'not-an-id'],
        ['a decimal number', 42.5],
        ['zero', 0],
        ['a negative number', -1],
        ['a boolean', true]
    ])('should return 400 for %s as the interview ID', async (_description, interviewId) => {
        const response = await request(app)
            .post('/survey/logClientEvent/')
            .send({ interviewId, clientEvent });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ status: 'InvalidInterviewId' });
        expect(mockGetParadataLoggingFunction).not.toHaveBeenCalled();
    });

    test('should accept a positive integer interview ID provided as a numeric string', async () => {
        const response = await request(app)
            .post('/survey/logClientEvent/')
            .send({ interviewId: '42', clientEvent });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ status: 'success' });
        expect(mockGetParadataLoggingFunction).toHaveBeenCalledWith({
            interviewId: 42,
            userId: mockUserId
        });
    });

    test('should return 400 if the req user is not defined', async () => {
        mockIsLoggedIn.mockImplementationOnce((req, res, next) => {
            req.user = undefined;
            next();
        });

        const response = await request(app)
            .post('/survey/logClientEvent/')
            .send({ interviewId: 42, clientEvent });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ status: 'BadRequest' });
        expect(mockGetParadataLoggingFunction).not.toHaveBeenCalled();
    });

    test('should accept an event when database paradata logging is disabled', async () => {
        const response = await request(app)
            .post('/survey/logClientEvent/')
            .send({ interviewId: 42, clientEvent });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ status: 'success' });
        expect(mockGetParadataLoggingFunction).toHaveBeenCalledWith({
            interviewId: 42,
            userId: mockUserId
        });
    });

    test('should return 500 when paradata logging fails', async () => {
        mockGetParadataLoggingFunction.mockImplementationOnce(() => {
            throw new Error('Logging error');
        });
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

        try {
             const response = await request(app)
                .post('/survey/logClientEvent/')
                .send({ interviewId: 42, clientEvent });

            expect(response.status).toBe(500);
            expect(response.body).toEqual({ status: 'failed' });
        } finally {
            consoleErrorSpy.mockRestore();
        }
    });
});
