/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import request from 'supertest';
import express, { RequestHandler } from 'express';
import { addExportRoutes } from '../exports.routes';
import router from 'chaire-lib-backend/lib/api/admin.routes';
import { exportAllToCsvByObject} from '../../../services/adminExport/exportAllToCsvByObject';

// Mock the authorization function, isAuthorized returns a function
jest.mock('chaire-lib-backend/lib/services/auth/authorization', () => jest.fn().mockReturnValue(jest.fn().mockImplementation((req, res, next) => next())));
// Mock the export functions
jest.mock('../../../services/adminExport/exportAllToCsvByObject', () => ({
    exportAllToCsvByObject: jest.fn().mockReturnValue('exportStarted')
}));
const exportAllToCsvByObjectMock = exportAllToCsvByObject as jest.MockedFunction<typeof exportAllToCsvByObject>;

let app: express.Application;
beforeAll(() => {
    app = express();
    app.use(express.json() as RequestHandler);
    addExportRoutes();
    app.use('/api/admin', router)
});

describe('prepareCsvFileForExportByObject route', () => {
    
    it('Should prepare validated data by default', async () => {
        const response = await request(app).get('/api/admin/data/prepareCsvFileForExportByObject');
        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            status: 'exportStarted'
        });
        expect(exportAllToCsvByObjectMock).toHaveBeenCalledWith({ responseType: 'validatedIfAvailable' });
    });

    it('Should prepare validated data, if specified', async () => {
        const response = await request(app).get('/api/admin/data/prepareCsvFileForExportByObject?responseType=validatedIfAvailable');
        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            status: 'exportStarted'
        });
        expect(exportAllToCsvByObjectMock).toHaveBeenCalledWith({ responseType: 'validatedIfAvailable' });
    });

    it('Should prepare validated data, if invalid value is specified', async () => {
        const response = await request(app).get('/api/admin/data/prepareCsvFileForExportByObject?responseType=unknownType');
        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            status: 'exportStarted'
        });
        expect(exportAllToCsvByObjectMock).toHaveBeenCalledWith({ responseType: 'validatedIfAvailable' });
    });

    it('Should prepare participant data, if specified', async () => {
        const response = await request(app).get('/api/admin/data/prepareCsvFileForExportByObject?responseType=participant');
        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            status: 'exportStarted'
        });
        expect(exportAllToCsvByObjectMock).toHaveBeenCalledWith({ responseType: 'participant' });
    });
});