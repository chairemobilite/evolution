/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { v4 as uuidV4 } from 'uuid';
import request from 'supertest';
import express from 'express';
import validateUuidMiddleware from '../validateUuidMiddleware';

// Default handler that returns a 200 status code
const requestHandler = jest.fn().mockImplementation((_req, res) => res.status(200).send());

// Prepare the app and router for the test
const app = express();
const router = express.Router();
// Add the middleware to test before each route
router.get('/testWithUuid/:interviewUuid', validateUuidMiddleware, requestHandler);
router.get('/testWithId/:interviewId', validateUuidMiddleware, requestHandler);
app.use('/test', router)

beforeEach(() => {
    jest.clearAllMocks();
})

test('Valid uuid in interviewUuid', async () => {
    const uuid = uuidV4()
    const response = await request(app).get(`/test/testWithUuid/${uuid}`);
    expect(response.status).toBe(200);
    expect(requestHandler).toHaveBeenCalled();
});

test('Invalid uuid in interviewUuid', async () => {
    const response = await request(app).get('/test/testWithUuid/null');
    expect(response.status).toBe(400);
    expect(requestHandler).not.toHaveBeenCalled();
});

test('Valid uuid in interviewId', async () => {
    const uuid = uuidV4()
    const response = await request(app).get(`/test/testWithId/${uuid}`);
    expect(response.status).toBe(200);
    expect(requestHandler).toHaveBeenCalled();
});

test('Invalid uuid in interviewId', async () => {
    const response = await request(app).get('/test/testWithId/null');
    expect(response.status).toBe(400);
    expect(requestHandler).not.toHaveBeenCalled();
});

