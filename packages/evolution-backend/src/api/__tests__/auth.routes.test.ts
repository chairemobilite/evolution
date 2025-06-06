/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import express, { RequestHandler } from 'express';
import request from 'supertest';
import session from 'supertest-session';
import passport from 'passport';

import authRoutes from '../auth.routes';
import { userAuthModel } from 'chaire-lib-backend/lib/services/auth/userAuthModel';
import projectConfig from 'evolution-common/lib/config/project.config';

// Mock the original auth routes
jest.mock('chaire-lib-backend/lib/api/auth.routes', () => {
    return jest.fn();
});

let authResponse: {
    error: any,
    user: any,
    statusCode?: number
} = {
    error: null,
    user: false
}

const authMockImplementation = (req, res, next) => {
    const response = authResponse;
    if (response.user) {
        req.user = response.user;
    }
    if (response.statusCode) {
        res.status(response.statusCode);
    }
    next(response.error, response.user);
};

const authMockFunctions = {
    'auth-by-field': jest.fn().mockImplementation(authMockImplementation)
}

jest.mock('passport', () => {
    return {
        authenticate: jest.fn().mockImplementation((authType) => {
            return authMockFunctions[authType] || jest.fn().mockImplementation(authMockImplementation);
        }),
        use: jest.fn(),
        serializeUser: jest.fn(),
        deserializeUser: jest.fn(),
        initialize: jest.fn().mockReturnValue((req, res, next) => next()),
        session: jest.fn().mockReturnValue((req, res, next) => next())
    }
});

const validFieldValue = 'test-value';
const validUser = {
    id: 5,
    uuid: 'arbitrary',
    username: 'test',
    email: 'test@test.org',
    is_confirmed: true,
    is_valid: true
};

beforeEach(() => {
    authResponse = {
        error: null,
        user: false
    }
    Object.keys(authMockFunctions).forEach(authType => authMockFunctions[authType].mockClear());
})

describe('Auth by field route', () => {
    // Setup the app with byField enabled
    projectConfig.auth = { byField: true };

    const app = express();
    // FIXME Since upgrading @types/node, the types are wrong and we get compilation error.
    app.use(express.json({ limit: '500mb' }) as RequestHandler);
    app.use(express.urlencoded({ extended: true }) as RequestHandler);
    const router = express.Router();
    authRoutes(router, userAuthModel, passport);
    app.use(router);

    test('Auth by field, valid credentials', async () => {
        authResponse = {
            error: null,
            user: validUser
        };
        const res = await session(app)
            .post('/auth-by-field')
            .send({ field: validFieldValue })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(200);
        expect(res.body.status).toEqual('Login successful!');
        expect(res.body.user).toEqual(validUser);
        expect(authMockFunctions['auth-by-field']).toHaveBeenCalledTimes(1);
    });

    test('Auth by field, invalid credentials', async () => {
        authResponse = {
            error: 'InvalidField',
            user: false
        };
        const res = await session(app)
            .post('/auth-by-field')
            .send({ field: 'invalid-value' })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(200);
        expect(res.body.status).toEqual('User not authenticated');
        expect(res.body.error).toEqual('InvalidField');
        expect(res.body.user).toEqual(undefined);
        expect(authMockFunctions['auth-by-field']).toHaveBeenCalledTimes(1);
    });

    test('Auth by field, unauthorized access', async () => {
        authResponse = {
            error: 'Unauthorized',
            user: false,
            statusCode: 401
        };
        const res = await session(app)
            .post('/auth-by-field')
            .send({ field: validFieldValue })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(401);
        expect(res.body.status).toEqual('User not authenticated');
        expect(res.body.error).toEqual('Unauthorized');
        expect(res.body.user).toEqual(undefined);
        expect(authMockFunctions['auth-by-field']).toHaveBeenCalledTimes(1);
    });
});

describe('Auth by field route when disabled', () => {
    // Setup the app with byField disabled
    projectConfig.auth = { byField: false };

    const app = express();
    // FIXME Since upgrading @types/node, the types are wrong and we get compilation error.
    app.use(express.json({ limit: '500mb' }) as RequestHandler);
    app.use(express.urlencoded({ extended: true }) as RequestHandler);
    const router = express.Router();
    authRoutes(router, userAuthModel, passport);
    app.use(router);

    test('Auth by field route should not be accessible when disabled', async () => {
        await request(app)
            .post('/auth-by-field')
            .send({ field: validFieldValue })
            .set('Accept', 'application/json')
            .expect('Content-Type', 'text/html; charset=utf-8')
            .expect(404);
    });
});