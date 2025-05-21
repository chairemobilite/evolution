/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import path from 'path';
import {
    exportAllToCsvBySurveyObject,
    filePathOnServer,
    getExportFiles,
    isExportRunning
} from '../../services/adminExport/exportAllToCsvBySurveyObject';
import { fileManager } from 'chaire-lib-backend/lib/utils/filesystem/fileManager';
import * as Status from 'chaire-lib-common/lib/utils/Status';
import { directoryManager } from 'chaire-lib-backend/lib/utils/filesystem/directoryManager';

// TODO Do not use the main admin router. Fine-tune the permissions for the export routes.
import router from 'chaire-lib-backend/lib/api/admin.routes';

export const addExportRoutes = () => {
    // Get a specific export file per object
    router.get('/data/exportcsv/exports/:filePath', (req, res, _next) => {
        console.log('requesting csv file from path', req.params.filePath);
        const projectRelativeFilePath = `${filePathOnServer}/${req.params.filePath}`;
        const fileExists = fileManager.fileExists(projectRelativeFilePath);
        if (fileExists) {
            const fileName = path.basename(req.params.filePath);
            res.setHeader('Content-disposition', `attachment; filename=${fileName}`);
            res.set('Content-Type', 'text/csv');
            return res.status(200).sendFile(fileManager.getAbsolutePath(projectRelativeFilePath));
        } else {
            return res.status(404).json({
                status: 'notFound',
                message: 'file does not exist'
            });
        }
    });

    // Route to get the status of the export task and the list of files
    router.get('/data/getExportTaskResults', (_req, res, _next) => {
        console.log('getting csv export files...');
        try {
            if (isExportRunning()) {
                return res.status(200).json(Status.createOk({ taskRunning: true, files: [] }));
            }
            const files = getExportFiles();
            return res.status(200).json(Status.createOk({ taskRunning: false, files }));
        } catch (error) {
            console.log('error getting csv export files', error);
            return res.status(500).json(Status.createError('Error getting csv files'));
        }
    });

    // Route to prepare the csv files to export
    router.get('/data/prepareCsvFileForExportBySurveyObject', (req, res, _next) => {
        console.log('preparing csv export files...');
        try {
            const correctedResponse = req.query.responseType !== 'participant';
            const taskRunning = exportAllToCsvBySurveyObject({
                responseType: correctedResponse ? 'correctedIfAvailable' : 'participant'
            });
            return res.status(200).json({
                status: taskRunning
            });
        } catch (error) {
            return res.status(500).json({
                status: 'error',
                csvExportFilePaths: [],
                error: 'could not prepare csv files for export: ' + error
            });
        }
    });

    // Route to download survey questionnaire list text file
    router.get('/data/downloadSurveyQuestionnaireListTxt', (req, res, _next) => {
        try {
            console.log('requesting survey questionnaire list...');
            const lang = req.query.lang || 'en'; // Default to 'en' if no lang is provided
            const questionnaireAbsoluteFilePath = directoryManager.getAbsolutePath(
                `../references/questionnaire_list_${lang}.txt`
            );
            const fileExists = fileManager.fileExistsAbsolute(questionnaireAbsoluteFilePath);

            if (fileExists) {
                const fileName = path.basename(questionnaireAbsoluteFilePath);
                res.setHeader('Content-disposition', `attachment; filename=${fileName}`);
                res.set('Content-Type', 'text/plain');
                console.log('sending file ', questionnaireAbsoluteFilePath);
                return res.status(200).sendFile(questionnaireAbsoluteFilePath);
            } else {
                return res.status(404).json({
                    status: 'notFound',
                    message: `file does not exist for language: ${lang}`
                });
            }
        } catch (error) {
            console.error('Error in downloadSurveyQuestionnaireListTxt:', error);
            return res.status(500).json({
                status: 'error',
                message: 'An unexpected error occurred while processing the request.'
            });
        }
    });
};
