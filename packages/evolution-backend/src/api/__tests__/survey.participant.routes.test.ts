/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import request from 'supertest';
import express, { Router } from 'express';
import surveyParticipantRoutes, { getPublicParticipantRoutes } from '../survey.participant.routes';
import Interviews from '../../services/interviews/interviews';
import { InterviewLoggingMiddlewares } from '../../services/logging/queryLoggingMiddleware';
import { isLoggedIn } from 'chaire-lib-backend/lib/services/auth/authorization';
import { sendSupportRequestEmail } from '../../services/logging/supportRequest';
import projectConfig from 'evolution-common/lib/config/project.config';

jest.mock('../../services/interviews/interviews');
jest.mock('../../services/logging/queryLoggingMiddleware');
jest.mock('../../services/logging/supportRequest');
jest.mock('evolution-common/lib/config/project.config', () => ({
    surveySupportForm: true
}));

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

describe('POST /supportRequest', () => {

    // Setup public routes app
    const publicApp = express();
    publicApp.use(express.json());
    publicApp.use(getPublicParticipantRoutes());

    beforeEach(() => {
        (sendSupportRequestEmail as jest.Mock).mockClear();
        (Interviews.getUserInterview as jest.Mock).mockClear();
    });

    test('should handle support request successfully when user is not logged in', async () => {
        const requestData = {
            email: 'test@example.com',
            message: 'Help me please',
            currentUrl: 'http://test.com/page'
        };

        (sendSupportRequestEmail as jest.Mock).mockResolvedValue(undefined);

        const response = await request(publicApp)
            .post('/supportRequest/')
            .send(requestData);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ status: 'success' });
        expect(sendSupportRequestEmail).toHaveBeenCalledWith({
            message: requestData.message,
            userEmail: requestData.email,
            interviewId: undefined,
            currentUrl: requestData.currentUrl
        });
        expect(Interviews.getUserInterview).not.toHaveBeenCalled();
    });

    test('should handle support request successfully when user is logged in', async () => {
        // Set up a mock app that simulates logged-in user
        const loggedInApp = express();
        loggedInApp.use(express.json());
        loggedInApp.use((req, res, next) => {
            req.user = { id: mockUserId };
            next();
        });
        loggedInApp.use(getPublicParticipantRoutes());

        const mockInterview = { id: 42 };
        (Interviews.getUserInterview as jest.Mock).mockResolvedValue(mockInterview);
        (sendSupportRequestEmail as jest.Mock).mockResolvedValue(undefined);

        const requestData = {
            email: 'test@example.com',
            message: 'Help me please',
            currentUrl: 'http://test.com/page'
        };

        const response = await request(loggedInApp)
            .post('/supportRequest/')
            .send(requestData);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ status: 'success' });
        expect(Interviews.getUserInterview).toHaveBeenCalledWith(mockUserId);
        expect(sendSupportRequestEmail).toHaveBeenCalledWith({
            message: requestData.message,
            userEmail: requestData.email,
            interviewId: mockInterview.id,
            currentUrl: requestData.currentUrl
        });
    });

    test('should handle missing message in request', async () => {
        const requestData = {
            email: 'test@example.com',
            currentUrl: 'http://test.com/page'
        };

        (sendSupportRequestEmail as jest.Mock).mockResolvedValue(undefined);

        const response = await request(publicApp)
            .post('/supportRequest/')
            .send(requestData);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ status: 'success' });
        expect(sendSupportRequestEmail).toHaveBeenCalledWith({
            message: 'No message provided',
            userEmail: 'test@example.com',
            interviewId: undefined,
            currentUrl: 'http://test.com/page'
        });
    });

    test('should handle errors in support request processing', async () => {
        (sendSupportRequestEmail as jest.Mock).mockRejectedValue(new Error('Email sending failed'));

        const requestData = {
            email: 'test@example.com',
            message: 'Help me please'
        };

        const response = await request(publicApp)
            .post('/supportRequest/')
            .send(requestData);

        expect(response.status).toBe(500);
        expect(response.body).toEqual({ status: 'failed' });
    });

    test('should not register route when supportForm is disabled', async () => {
        // Override the project config mock to disable support form
        jest.resetModules();
        jest.mock('evolution-common/lib/config/project.config', () => ({
            surveySupportForm: false
        }));
        
        // Re-import to get updated config, otherwise it still uses the previous config mock and the result is a 500 error
        const { getPublicParticipantRoutes: getUpdatedRoutes } = require('../survey.participant.routes');
        
        const disabledApp = express();
        disabledApp.use(express.json());
        disabledApp.use(getUpdatedRoutes());

        const response = await request(disabledApp)
            .post('/supportRequest/')
            .send({ message: 'test' });

        // When route doesn't exist, Express returns 404 Not Found
        expect(response.status).toBe(404);
    });
});