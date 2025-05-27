/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import request from 'supertest';
import express, { Router } from 'express';
import surveyParticipantRoutes from '../survey.participant.routes';
import Interviews from '../../services/interviews/interviews';
import { InterviewLoggingMiddlewares } from '../../services/logging/queryLoggingMiddleware';
import { isLoggedIn } from 'chaire-lib-backend/lib/services/auth/authorization';

jest.mock('../../services/interviews/interviews');
jest.mock('../../services/logging/queryLoggingMiddleware');

const mockUserId = 3;
const mockAuthorizationMiddleware = jest.fn(() => (req, res, next) => next());
const mockLoggingMiddleware: InterviewLoggingMiddlewares = {
    getUserIdForLogging: jest.fn(() => undefined),
    openingInterview: jest.fn().mockReturnValue(jest.fn()),
    updatingInterview: jest.fn().mockReturnValue(jest.fn())
};

jest.mock('chaire-lib-backend/lib/services/auth/authorization', () => ({
    isLoggedIn: jest.fn((req, res, next) => {
        req.user = { id: mockUserId }; // Mock user object
        next();
    }),
}));
const mockIsLoggedIn = isLoggedIn as jest.MockedFunction<typeof isLoggedIn>;

const app = express();
app.use(express.json());
app.use(
    surveyParticipantRoutes(mockAuthorizationMiddleware, mockLoggingMiddleware)
);

describe('GET /survey/activeInterview', () => {

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should return active interview for user', async () => {
        const mockInterview = {
            id: 1,
            uuid: 'mockUuid',
            is_valid: true,
            is_completed: false,
            response: {},
            participant_id: 1,
        };
        (Interviews.getUserInterview as jest.Mock).mockResolvedValue(mockInterview);

        const response = await request(app).get('/survey/activeInterview');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ status: 'success', interview: mockInterview });
        expect(Interviews.getUserInterview).toHaveBeenCalledWith(mockUserId);
    });

    test('should create interview if none exists', async () => {
        const mockCreatedInterview = {
            id: 1,
            uuid: 'mockUuid',
            is_valid: true,
            is_completed: false,
            response: {},
            participant_id: 1,
        };
        (Interviews.getUserInterview as jest.Mock).mockResolvedValue(undefined);
        (Interviews.createInterviewForUser as jest.Mock).mockResolvedValue(mockCreatedInterview);

        const response = await request(app).get('/survey/activeInterview');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ status: 'success', interview: mockCreatedInterview });
        expect(Interviews.getUserInterview).toHaveBeenCalledWith(mockUserId);
        expect(Interviews.createInterviewForUser).toHaveBeenCalledWith(
            mockUserId,
            {},
            undefined,
            ['id', 'uuid', 'is_valid', 'is_completed', 'response', 'participant_id']
        );
    });

    test('should return 400 if user is not defined', async () => {
        mockIsLoggedIn.mockImplementationOnce((req, res, next) => {
            req.user = undefined; // Simulate undefined user
            next();
        });

        const response = await request(app).get('/survey/activeInterview');

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ status: 'BadRequest' });
        expect(Interviews.getUserInterview).not.toHaveBeenCalled();
    });

    test('should handle server error', async () => {
        (Interviews.getUserInterview as jest.Mock).mockRejectedValue(new Error('Database error'));

        const response = await request(app).get('/survey/activeInterview');

        expect(response.status).toBe(500);
        expect(response.body).toEqual({
            status: 'failed',
            interview: null,
            error: 'cannot fetch interview',
        });
        expect(Interviews.getUserInterview).toHaveBeenCalledWith(mockUserId);
    });
});