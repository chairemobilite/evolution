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
import {
    exportAllResponsesToCsvByObject,
    getExportFiles,
    isExportRunning
} from '../../../services/adminExport/exportAllResponsesToCsvByObject';
import {
    exportSurveyObjectsToCsv,
    isSurveyObjectsExportRunning
} from '../../../services/adminExport/surveyObjects/exportSurveyObjectsToCsv';
import { isAdmin } from 'chaire-lib-backend/src/services/auth/authorization';
import _ from 'lodash';

// Mock the authorization function, isAuthorized returns a function
jest.mock('chaire-lib-backend/lib/services/auth/authorization', () => ({
    __esModule: true,
    default: jest.fn().mockReturnValue(jest.fn().mockImplementation((req, res, next) => next())),
    isAdmin: jest.fn().mockReturnValue(jest.fn().mockImplementation((req, res, next) => next()))
}));

// Mock the export functions
jest.mock('../../../services/adminExport/exportAllResponsesToCsvByObject', () => ({
    exportAllResponsesToCsvByObject: jest.fn().mockReturnValue('exportStarted'),
    isExportRunning: jest.fn().mockReturnValue(false),
    getExportFiles: jest.fn().mockReturnValue([])
}));

jest.mock('../../../services/adminExport/surveyObjects/exportSurveyObjectsToCsv', () => ({
    exportSurveyObjectsToCsv: jest.fn(),
    isSurveyObjectsExportRunning: jest.fn().mockReturnValue(false)
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

const exportAllResponsesToCsvByObjectMock = exportAllResponsesToCsvByObject as jest.MockedFunction<typeof exportAllResponsesToCsvByObject>;
const exportSurveyObjectsToCsvMock = exportSurveyObjectsToCsv as jest.MockedFunction<
    typeof exportSurveyObjectsToCsv
>;
const isExportRunningMock = isExportRunning as jest.MockedFunction<typeof isExportRunning>;
const getExportFilesMock = getExportFiles as jest.MockedFunction<typeof getExportFiles>;
const isSurveyObjectsExportRunningMock = isSurveyObjectsExportRunning as jest.MockedFunction<
    typeof isSurveyObjectsExportRunning
>;
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
        expect(exportAllResponsesToCsvByObjectMock).toHaveBeenCalledWith({ responseType: 'correctedIfAvailable' });
    });

    it('Should prepare corrected response, if specified', async () => {
        const response = await request(app).get(
            '/api/admin/data/prepareCsvFileForExportBySurveyObject?responseType=correctedIfAvailable'
        );
        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            status: 'exportStarted'
        });
        expect(exportAllResponsesToCsvByObjectMock).toHaveBeenCalledWith({ responseType: 'correctedIfAvailable' });
    });

    it('Should prepare corrected response, if invalid value is specified', async () => {
        const response = await request(app).get(
            '/api/admin/data/prepareCsvFileForExportBySurveyObject?responseType=unknownType'
        );
        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            status: 'exportStarted'
        });
        expect(exportAllResponsesToCsvByObjectMock).toHaveBeenCalledWith({ responseType: 'correctedIfAvailable' });
    });

    it('Should prepare participant data, if specified', async () => {
        const response = await request(app).get(
            '/api/admin/data/prepareCsvFileForExportBySurveyObject?responseType=participant'
        );
        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            status: 'exportStarted'
        });
        expect(exportAllResponsesToCsvByObjectMock).toHaveBeenCalledWith({ responseType: 'participant' });
    });
});

describe('prepareSurveyObjectsCsvExport route', () => {
    it.each(['exportStarted', 'alreadyRunning'] as const)('Should return the export status: %s', async (status) => {
        exportSurveyObjectsToCsvMock.mockReturnValueOnce(status);
        const response = await request(app).get('/api/admin/data/prepareSurveyObjectsCsvExport');
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ status });
    });

    it('Should return an error if the export throws', async () => {
        exportSurveyObjectsToCsvMock.mockImplementationOnce(() => {
            throw new Error('error');
        });
        const response = await request(app).get('/api/admin/data/prepareSurveyObjectsCsvExport');
        expect(response.status).toBe(500);
        expect(response.body).toEqual({ status: 'error' });
    });
});

describe('getExportTaskResults route', () => {
    afterEach(() => {
        isExportRunningMock.mockReturnValue(false);
        isSurveyObjectsExportRunningMock.mockReturnValue(false);
    });

    it.each([
        { description: 'no export running', responsesExportRunning: false, surveyObjectsExportRunning: false },
        { description: 'responses export running', responsesExportRunning: true, surveyObjectsExportRunning: false },
        {
            description: 'survey objects export running',
            responsesExportRunning: false,
            surveyObjectsExportRunning: true
        }
    ])(
        'Should list the files only when no export is running: $description',
        async ({ responsesExportRunning, surveyObjectsExportRunning }) => {
            // Not `mockReturnValueOnce`: the route does not call both when the first one is running
            isExportRunningMock.mockReturnValue(responsesExportRunning);
            isSurveyObjectsExportRunningMock.mockReturnValue(surveyObjectsExportRunning);
            getExportFilesMock.mockReturnValueOnce(['file.csv']);
            const taskRunning = responsesExportRunning || surveyObjectsExportRunning;

            const response = await request(app).get('/api/admin/data/getExportTaskResults');

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                status: 'ok',
                result: { taskRunning, files: taskRunning ? [] : ['file.csv'] }
            });
        }
    );
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
