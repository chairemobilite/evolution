/*
 * Copyright 2026, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import request from 'supertest';
import express, { RequestHandler } from 'express';
import { execFile } from 'child_process';
import router from 'chaire-lib-backend/lib/api/admin.routes';

jest.mock('child_process', () => {
    const execFileMock = jest.fn();
    const util = jest.requireActual<typeof import('util')>('util');
    // Mimic Node's execFile promisification behavior ({ stdout, stderr }).
    // The route uses `promisify(execFile)`, so we need the mock to expose the same custom promisify hook.
    (execFileMock as unknown as { [key: symbol]: unknown })[util.promisify.custom] = (file, args, options) =>
        Promise.resolve(execFileMock(file, args, options));
    return { execFile: execFileMock };
});

// Mock authorization middleware so the route is reachable.
jest.mock('chaire-lib-backend/lib/services/auth/authorization', () => ({
    __esModule: true,
    default: jest.fn().mockReturnValue(jest.fn().mockImplementation((_req, _res, next) => next())),
    isAdmin: jest.fn().mockReturnValue(jest.fn().mockImplementation((_req, _res, next) => next()))
}));

const execFileMock = execFile as unknown as jest.MockedFunction<typeof execFile>;

// Register evolution-specific admin routes onto the shared admin router.
import '../admin.routes';

let app: express.Application;

beforeAll(() => {
    app = express();
    app.use(express.json() as RequestHandler);
    app.use('/api/admin', router);
});

describe('/generator/verify route', () => {
    beforeEach(() => {
        execFileMock.mockReset();
    });

    it('Should return 400 when no file is uploaded', async () => {
        const response = await request(app).post('/api/admin/generator/verify');

        expect(response.status).toBe(400);
        expect(response.body).toMatchObject({
            status: 'error',
            error: 'No Excel file uploaded'
        });
    });

    it('Should return 200 when Excel integrity check passes', async () => {
        const stdout = JSON.stringify({ ok: true, integrityOk: true, errors: [] });
        const stderr = '';

        execFileMock.mockReturnValueOnce({ stdout, stderr } as unknown as ReturnType<typeof execFile>);

        const response = await request(app)
            .post('/api/admin/generator/verify')
            .attach(
                'generatorFile',
                Buffer.from('dummy'),
                {
                    filename: 'test.xlsx',
                    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                }
            );

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
            status: 'ok',
            result: {
                integrityOk: true
            }
        });
        expect(response.body.result.output).toEqual([stdout]);
    });

    it('Should return 422 when Excel integrity check fails', async () => {
        const errors = ['Missing required sheet', 'Invalid data'];
        const stdout = JSON.stringify({ ok: true, integrityOk: false, errors });

        execFileMock.mockReturnValueOnce({ stdout, stderr: '' } as unknown as ReturnType<typeof execFile>);

        const response = await request(app)
            .post('/api/admin/generator/verify')
            .attach(
                'generatorFile',
                Buffer.from('dummy'),
                {
                    filename: 'test.xlsx',
                    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                }
            );

        expect(response.status).toBe(422);
        expect(response.body).toEqual({
            status: 'error',
            error: errors.join('\n')
        });
    });
});

