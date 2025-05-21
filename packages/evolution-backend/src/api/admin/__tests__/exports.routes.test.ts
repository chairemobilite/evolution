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
import { directoryManager } from 'chaire-lib-backend/lib/utils/filesystem/directoryManager';
import { fileManager } from 'chaire-lib-backend/lib/utils/filesystem/fileManager';
import { exportAllToCsvBySurveyObject } from '../../../services/adminExport/exportAllToCsvBySurveyObject';
import { isAdmin } from 'chaire-lib-backend/src/services/auth/authorization';
import _ from 'lodash';

// Mock the authorization function, isAuthorized returns a function
jest.mock('chaire-lib-backend/lib/services/auth/authorization', () => ({
    __esModule: true,
    default: jest.fn().mockReturnValue(jest.fn().mockImplementation((req, res, next) => next())),
    isAdmin: jest.fn().mockReturnValue(jest.fn().mockImplementation((req, res, next) => next()))
}));

// Mock the export functions
jest.mock('../../../services/adminExport/exportAllToCsvBySurveyObject', () => ({
    exportAllToCsvBySurveyObject: jest.fn().mockReturnValue('exportStarted')
}));

// Mock the file path on server
jest.mock('chaire-lib-backend/lib/utils/filesystem/directoryManager', () => ({
    directoryManager: {
        getAbsolutePath: jest.fn()
    }
}));

// Mock the file manager
jest.mock('chaire-lib-backend/lib/utils/filesystem/fileManager', () => ({
    fileManager: {
        fileExistsAbsolute: jest.fn()
    }
}));

const exportAllToCsvBySurveyObjectMock = exportAllToCsvBySurveyObject as jest.MockedFunction<typeof exportAllToCsvBySurveyObject>;
const fileExistsAbsoluteMock = fileManager.fileExistsAbsolute as jest.MockedFunction<
    typeof fileManager.fileExistsAbsolute
>;
const getAbsolutePathMock = directoryManager.getAbsolutePath as jest.MockedFunction<
    typeof directoryManager.getAbsolutePath
>;

let app: express.Application;
beforeAll(() => {
    app = express();
    app.use(express.json() as RequestHandler);
    addExportRoutes();
    app.use('/api/admin', router);
});

describe('prepareCsvFileForExportBySurveyObject route', () => {
    it('Should prepare corrected response by default', async () => {
        const response = await request(app).get('/api/admin/data/prepareCsvFileForExportBySurveyObject');
        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            status: 'exportStarted'
        });
        expect(exportAllToCsvBySurveyObjectMock).toHaveBeenCalledWith({ responseType: 'correctedIfAvailable' });
    });

    it('Should prepare corrected response, if specified', async () => {
        const response = await request(app).get(
            '/api/admin/data/prepareCsvFileForExportBySurveyObject?responseType=correctedIfAvailable'
        );
        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            status: 'exportStarted'
        });
        expect(exportAllToCsvBySurveyObjectMock).toHaveBeenCalledWith({ responseType: 'correctedIfAvailable' });
    });

    it('Should prepare corrected response, if invalid value is specified', async () => {
        const response = await request(app).get(
            '/api/admin/data/prepareCsvFileForExportBySurveyObject?responseType=unknownType'
        );
        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            status: 'exportStarted'
        });
        expect(exportAllToCsvBySurveyObjectMock).toHaveBeenCalledWith({ responseType: 'correctedIfAvailable' });
    });

    it('Should prepare participant data, if specified', async () => {
        const response = await request(app).get(
            '/api/admin/data/prepareCsvFileForExportBySurveyObject?responseType=participant'
        );
        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            status: 'exportStarted'
        });
        expect(exportAllToCsvBySurveyObjectMock).toHaveBeenCalledWith({ responseType: 'participant' });
    });
});

describe('downloadSurveyQuestionnaireListTxt route', () => {
    it('Should return the English questionnaire file if lang is en', async () => {
        fileExistsAbsoluteMock.mockReturnValueOnce(true);
        getAbsolutePathMock.mockReturnValueOnce(__dirname + '/questionnaire_list_en.txt');

        const response = await request(app).get('/api/admin/data/downloadSurveyQuestionnaireListTxt?lang=en');
        expect(response.status).toBe(200);
        expect(response.header['content-type']).toBe('text/plain; charset=utf-8');
        expect(response.header['content-disposition']).toContain('attachment; filename=questionnaire_list_en.txt');
        expect(getAbsolutePathMock).toHaveBeenCalledWith('../references/questionnaire_list_en.txt');
        expect(getAbsolutePathMock).toHaveReturnedWith(__dirname + '/questionnaire_list_en.txt');
    });

    it('Should return the French questionnaire file if lang is fr', async () => {
        fileExistsAbsoluteMock.mockReturnValueOnce(true);
        getAbsolutePathMock.mockReturnValueOnce(__dirname + '/questionnaire_list_fr.txt');

        const response = await request(app).get('/api/admin/data/downloadSurveyQuestionnaireListTxt?lang=fr');
        expect(response.status).toBe(200);
        expect(response.header['content-type']).toBe('text/plain; charset=utf-8');
        expect(response.header['content-disposition']).toContain('attachment; filename=questionnaire_list_fr.txt');
        expect(getAbsolutePathMock).toHaveBeenCalledWith('../references/questionnaire_list_fr.txt');
        expect(getAbsolutePathMock).toHaveReturnedWith(__dirname + '/questionnaire_list_en.txt');
    });

    it('Should default to English if lang is not provided', async () => {
        fileExistsAbsoluteMock.mockReturnValueOnce(true);
        getAbsolutePathMock.mockReturnValueOnce(__dirname + '/questionnaire_list_en.txt');

        const response = await request(app).get('/api/admin/data/downloadSurveyQuestionnaireListTxt');
        expect(response.status).toBe(200);
        expect(response.header['content-type']).toBe('text/plain; charset=utf-8');
        expect(response.header['content-disposition']).toContain('attachment; filename=questionnaire_list_en.txt');
        expect(getAbsolutePathMock).toHaveBeenCalledWith('../references/questionnaire_list_en.txt');
        expect(getAbsolutePathMock).toHaveReturnedWith(__dirname + '/questionnaire_list_en.txt');
    });

    it('Should return 404 if the file does not exist', async () => {
        fileExistsAbsoluteMock.mockReturnValueOnce(false);
        getAbsolutePathMock.mockReturnValueOnce(__dirname + '/questionnaire_list_doesNotExist.txt');

        const response = await request(app).get('/api/admin/data/downloadSurveyQuestionnaireListTxt?lang=en');
        expect(response.status).toBe(404);
        expect(response.body).toEqual({
            status: 'notFound',
            message: 'file does not exist for language: en'
        });
    });
});
