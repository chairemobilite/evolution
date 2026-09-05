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
import { getParadataLoggingFunction } from '../../services/logging/paradataLogging';
import { UserAction } from 'evolution-common/lib/services/questionnaire/types';

jest.mock('../../services/interviews/interviews');
jest.mock('../../services/logging/queryLoggingMiddleware');
jest.mock('../../services/logging/supportRequest');
jest.mock('../../services/logging/paradataLogging', () => {
    const actual = jest.requireActual('../../services/logging/paradataLogging');
    return {
        ...actual,
        getParadataLoggingFunction: jest.fn()
    }
});
jest.mock('evolution-common/lib/config/project.config', () => {
    const actual = jest.requireActual('evolution-common/lib/config/project.config');
    return {
        ...actual.default,
        surveySupportForm: true
    };
});

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
    })
}));
const mockIsLoggedIn = isLoggedIn as jest.MockedFunction<typeof isLoggedIn>;
const mockGetParadataLoggingFunction = getParadataLoggingFunction as jest.MockedFunction<
    typeof getParadataLoggingFunction
>;

// Mock the captcha validation, return next() to simulate successful validation
jest.mock('chaire-lib-backend/lib/api/captcha.routes', () => ({
    validateCaptchaToken: jest.fn().mockImplementation(() => mockedValidateCaptchaToken)
}));
const mockedValidateCaptchaToken = jest.fn().mockImplementation((req, res, next) => {
    next();
});

const app = express();
app.use(express.json());
app.use(surveyParticipantRoutes(mockAuthorizationMiddleware, mockLoggingMiddleware));

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
            participant_id: 1
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
            participant_id: 1
        };
        (Interviews.getUserInterview as jest.Mock).mockResolvedValue(undefined);
        (Interviews.createInterviewForUser as jest.Mock).mockResolvedValue(mockCreatedInterview);

        const response = await request(app).get('/survey/activeInterview');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ status: 'success', interview: mockCreatedInterview });
        expect(Interviews.getUserInterview).toHaveBeenCalledWith(mockUserId);
        expect(Interviews.createInterviewForUser).toHaveBeenCalledWith(mockUserId, {}, undefined, [
            'id',
            'uuid',
            'is_completed',
            'response',
            'participant_id'
        ]);
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
            error: 'cannot fetch interview'
        });
        expect(Interviews.getUserInterview).toHaveBeenCalledWith(mockUserId);
    });

    test('should return 403 if interview is frozen', async () => {
        const mockFrozenInterview = {
            id: 1,
            uuid: 'mockUuid',
            is_valid: true,
            is_completed: false,
            response: {},
            participant_id: 1,
            is_frozen: true
        };
        (Interviews.getUserInterview as jest.Mock).mockResolvedValue(mockFrozenInterview);

        const response = await request(app).get('/survey/activeInterview');

        expect(response.status).toBe(403);
        expect(response.body).toEqual({ status: 'forbidden', interview: null, error: 'interview cannot be accessed' });
        expect(Interviews.getUserInterview).toHaveBeenCalledWith(mockUserId);
    });
});

describe('POST /logClientEvent', () => {
    const clientEvent: UserAction = { type: 'buttonClick', buttonId: 'survey.next' };

    beforeEach(() => {
        jest.clearAllMocks();
        mockGetParadataLoggingFunction.mockReturnValue(undefined);
    });

    test('should accept an event from a participant who is not logged in', async () => {
        const publicApp = express();
        publicApp.use(express.json());
        publicApp.use((req, res, next) => {
            req.user = undefined;
            next();
        });
        publicApp.use(getPublicParticipantRoutes(mockLoggingMiddleware));

        const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
        try {
            const response = await request(publicApp).post('/logClientEvent/').send({ clientEvent });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ status: 'success' });
            expect(consoleLogSpy).toHaveBeenCalledWith(
                'Received not logged in client paradata event: ',
                clientEvent.type
            );
            expect(Interviews.getUserInterview).not.toHaveBeenCalled();
            expect(mockGetParadataLoggingFunction).not.toHaveBeenCalled();
        } finally {
            consoleLogSpy.mockRestore();
        }
    });

    test('should log an event for a logged-in participant with an interview', async () => {
        const mockInterview = { id: 42 };
        const logFunction = jest.fn();
        (Interviews.getUserInterview as jest.Mock).mockResolvedValue(mockInterview);
        mockGetParadataLoggingFunction.mockReturnValue(logFunction);

        const publicApp = express();
        publicApp.use(express.json());
        publicApp.use((req, res, next) => {
            req.user = { id: mockUserId };
            next();
        });
        publicApp.use(getPublicParticipantRoutes(mockLoggingMiddleware));

        const response = await request(publicApp).post('/logClientEvent/').send({ clientEvent });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ status: 'success' });
        expect(Interviews.getUserInterview).toHaveBeenCalledWith(mockUserId);
        expect(mockGetParadataLoggingFunction).toHaveBeenCalledWith({
            interviewId: mockInterview.id,
            userId: undefined
        });
        expect(logFunction).toHaveBeenCalledWith({ userAction: clientEvent });
    });

    test('should accept an event without logging when the participant has no interview', async () => {
        // This case should not happen (logged in participant, no interview), but we still test it in case
        (Interviews.getUserInterview as jest.Mock).mockResolvedValue(undefined);
        const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

        try {

            const publicApp = express();
            publicApp.use(express.json());
            publicApp.use((req, res, next) => {
                req.user = { id: mockUserId };
                next();
            });
            publicApp.use(getPublicParticipantRoutes(mockLoggingMiddleware));

            const response = await request(publicApp).post('/logClientEvent/').send({ clientEvent });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ status: 'success' });
            expect(consoleLogSpy).toHaveBeenCalledWith(
                'Received not logged in client paradata event: ',
                clientEvent.type
            );
            expect(mockGetParadataLoggingFunction).not.toHaveBeenCalled();
        } finally {
            consoleLogSpy.mockRestore();
        }
    });

    test('should accept an event when database paradata logging is disabled', async () => {
        (Interviews.getUserInterview as jest.Mock).mockResolvedValue({ id: 42 });
        mockGetParadataLoggingFunction.mockReturnValue(undefined);

        const publicApp = express();
        publicApp.use(express.json());
        publicApp.use((req, res, next) => {
            req.user = { id: mockUserId };
            next();
        });
        publicApp.use(getPublicParticipantRoutes(mockLoggingMiddleware));

        const response = await request(publicApp).post('/logClientEvent/').send({ clientEvent });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ status: 'success' });
        expect(mockGetParadataLoggingFunction).toHaveBeenCalled();
    });

    test('should return 500 when retrieving the participant interview fails', async () => {
        (Interviews.getUserInterview as jest.Mock).mockRejectedValue(new Error('Database error'));
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

        try {
            const publicApp = express();
            publicApp.use(express.json());
            publicApp.use((req, res, next) => {
                req.user = { id: mockUserId };
                next();
            });
            publicApp.use(getPublicParticipantRoutes(mockLoggingMiddleware));

            const response = await request(publicApp).post('/logClientEvent/').send({ clientEvent });

            expect(response.status).toBe(500);
            expect(response.body).toEqual({ status: 'failed' });
        } finally {
            consoleErrorSpy.mockRestore();
        }
    });

    test('should return 400 when client event is not a client event', async () => {
        const publicApp = express();
        publicApp.use(express.json());
        publicApp.use((req, res, next) => {
            req.user = { id: mockUserId };
            next();
        });
        publicApp.use(getPublicParticipantRoutes(mockLoggingMiddleware));

        const response = await request(publicApp).post('/logClientEvent/').send({ clientEvent: { type: 'notAClientEvent' } });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ status: 'NotAClientEvent' });
    });
});

describe('POST /supportRequest', () => {
    // Setup public routes app
    const publicApp = express();
    publicApp.use(express.json());
    publicApp.use(getPublicParticipantRoutes(mockLoggingMiddleware));

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should handle support request successfully when user is not logged in', async () => {
        const requestData = {
            email: 'test@example.com',
            message: 'Help me please',
            currentUrl: 'http://test.com/page'
        };

        (sendSupportRequestEmail as jest.Mock).mockResolvedValue(undefined);

        const response = await request(publicApp).post('/supportRequest/').send(requestData);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ status: 'success' });
        expect(sendSupportRequestEmail).toHaveBeenCalledWith({
            message: requestData.message,
            userEmail: requestData.email,
            interviewId: undefined,
            currentUrl: requestData.currentUrl
        });
        expect(Interviews.getUserInterview).not.toHaveBeenCalled();
        expect(mockedValidateCaptchaToken).toHaveBeenCalledTimes(1);
        // There should have been no paradata logging
        expect(mockGetParadataLoggingFunction).not.toHaveBeenCalled();
    });

    test('should handle support request successfully when user is logged in, and log paradata', async () => {
        // Set up a mock app that simulates logged-in user
        const loggedInApp = express();
        loggedInApp.use(express.json());
        loggedInApp.use((req, res, next) => {
            req.user = { id: mockUserId };
            next();
        });
        loggedInApp.use(getPublicParticipantRoutes(mockLoggingMiddleware));

        // Return the paradata logging function as well
        const mockInterview = { id: 42 };
        const logFunction = jest.fn();
        (Interviews.getUserInterview as jest.Mock).mockResolvedValue(mockInterview);
        (sendSupportRequestEmail as jest.Mock).mockResolvedValue(undefined);
        mockGetParadataLoggingFunction.mockReturnValue(logFunction);

        const requestData = {
            email: 'test@example.com',
            message: 'Help me please',
            currentUrl: 'http://test.com/page'
        };

        const response = await request(loggedInApp).post('/supportRequest/').send(requestData);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ status: 'success' });
        expect(Interviews.getUserInterview).toHaveBeenCalledWith(mockUserId);
        expect(sendSupportRequestEmail).toHaveBeenCalledWith({
            message: requestData.message,
            userEmail: requestData.email,
            interviewId: mockInterview.id,
            currentUrl: requestData.currentUrl
        });
        expect(mockGetParadataLoggingFunction).toHaveBeenCalledWith({
            interviewId: mockInterview.id,
            userId: undefined
        });
        expect(logFunction).toHaveBeenCalledWith({
            userAction: { type: 'supportRequestSent' }
        });
        expect(mockedValidateCaptchaToken).toHaveBeenCalledTimes(1);
    });

    test('should handle missing message in request', async () => {
        const requestData = {
            email: 'test@example.com',
            currentUrl: 'http://test.com/page'
        };

        (sendSupportRequestEmail as jest.Mock).mockResolvedValue(undefined);

        const response = await request(publicApp).post('/supportRequest/').send(requestData);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ status: 'success' });
        expect(sendSupportRequestEmail).toHaveBeenCalledWith({
            message: 'No message provided',
            userEmail: 'test@example.com',
            interviewId: undefined,
            currentUrl: 'http://test.com/page'
        });
        expect(mockedValidateCaptchaToken).toHaveBeenCalledTimes(1);
    });

    test('should handle errors in support request processing', async () => {
        (sendSupportRequestEmail as jest.Mock).mockRejectedValue(new Error('Email sending failed'));

        const requestData = {
            email: 'test@example.com',
            message: 'Help me please'
        };

        const response = await request(publicApp).post('/supportRequest/').send(requestData);

        expect(response.status).toBe(500);
        expect(response.body).toEqual({ status: 'failed' });
        expect(mockedValidateCaptchaToken).toHaveBeenCalledTimes(1);
    });

    test('should not log paradata for logged in user and request failed', async () => {
        // Set up a mock app that simulates logged-in user
        const loggedInApp = express();
        loggedInApp.use(express.json());
        loggedInApp.use((req, res, next) => {
            req.user = { id: mockUserId };
            next();
        });
        loggedInApp.use(getPublicParticipantRoutes(mockLoggingMiddleware));

        // Return the paradata logging function as well
        const mockInterview = { id: 42 };
        const logFunction = jest.fn();
        mockGetParadataLoggingFunction.mockReturnValue(logFunction);
        (Interviews.getUserInterview as jest.Mock).mockResolvedValue(mockInterview);
        (sendSupportRequestEmail as jest.Mock).mockRejectedValue(new Error('Email sending failed'));

        const requestData = {
            email: 'test@example.com',
            message: 'Help me please',
            currentUrl: 'http://test.com/page'
        };

        const response = await request(loggedInApp).post('/supportRequest/').send(requestData);

        expect(response.status).toBe(500);
        expect(response.body).toEqual({ status: 'failed' });
        expect(Interviews.getUserInterview).toHaveBeenCalledWith(mockUserId);
        expect(sendSupportRequestEmail).toHaveBeenCalledWith({
            message: requestData.message,
            userEmail: requestData.email,
            interviewId: mockInterview.id,
            currentUrl: requestData.currentUrl
        });
        // Paradata logging function should not have been called
        expect(mockGetParadataLoggingFunction).not.toHaveBeenCalled();
        expect(logFunction).not.toHaveBeenCalled();
        expect(mockedValidateCaptchaToken).toHaveBeenCalledTimes(1);
    });

    test('should not log paradata if logging is disabled', async () => {
        // Set up a mock app that simulates logged-in user
        const loggedInApp = express();
        loggedInApp.use(express.json());
        loggedInApp.use((req, res, next) => {
            req.user = { id: mockUserId };
            next();
        });
        loggedInApp.use(getPublicParticipantRoutes(mockLoggingMiddleware));

        // Return the paradata logging function as well
        const mockInterview = { id: 42 };
        (Interviews.getUserInterview as jest.Mock).mockResolvedValue(mockInterview);
        (sendSupportRequestEmail as jest.Mock).mockResolvedValue(undefined);
        mockGetParadataLoggingFunction.mockReturnValue(undefined);

        const requestData = {
            email: 'test@example.com',
            message: 'Help me please',
            currentUrl: 'http://test.com/page'
        };

        const response = await request(loggedInApp).post('/supportRequest/').send(requestData);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ status: 'success' });
        expect(Interviews.getUserInterview).toHaveBeenCalledWith(mockUserId);
        expect(sendSupportRequestEmail).toHaveBeenCalledWith({
            message: requestData.message,
            userEmail: requestData.email,
            interviewId: mockInterview.id,
            currentUrl: requestData.currentUrl
        });
        expect(mockGetParadataLoggingFunction).toHaveBeenCalledWith({
            interviewId: mockInterview.id,
            userId: undefined
        });
        expect(mockedValidateCaptchaToken).toHaveBeenCalledTimes(1);
    });

    test('not be called if the captcha does not validate', async () => {
        // Make the captcha fail
        mockedValidateCaptchaToken.mockImplementationOnce((req, res, next) => {
            return res.status(403).json({ status: 'InvalidCaptcha' });
        });

        const requestData = {
            email: 'test@example.com',
            message: 'Help me please',
            currentUrl: 'http://test.com/page'
        };

        (sendSupportRequestEmail as jest.Mock).mockResolvedValue(undefined);

        const response = await request(publicApp).post('/supportRequest/').send(requestData);

        expect(response.status).toBe(403);
        expect(response.body).toEqual({ status: 'InvalidCaptcha' });
        expect(sendSupportRequestEmail).not.toHaveBeenCalled();
        expect(mockedValidateCaptchaToken).toHaveBeenCalledTimes(1);
    });

    test('should not register route when supportForm is disabled', async () => {
        // Override the project config mock to disable support form
        jest.resetModules();
        jest.mock('evolution-common/lib/config/project.config', () => {
            const actual = jest.requireActual('evolution-common/lib/config/project.config');
            return {
                ...actual.default,
                surveySupportForm: false
            };
        });

        // Re-import to get updated config, otherwise it still uses the previous config mock and the result is a 500 error
        const { getPublicParticipantRoutes: getUpdatedRoutes } = require('../survey.participant.routes');

        const disabledApp = express();
        disabledApp.use(express.json());
        disabledApp.use(getUpdatedRoutes(mockLoggingMiddleware));

        const response = await request(disabledApp).post('/supportRequest/').send({ message: 'test' });

        // When route doesn't exist, Express returns 404 Not Found
        expect(response.status).toBe(404);
        expect(mockedValidateCaptchaToken).not.toHaveBeenCalled();
    });
});
