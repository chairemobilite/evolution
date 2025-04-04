/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React, { useEffect, useState } from 'react';
import { WithTranslation, withTranslation } from 'react-i18next';
import Button from 'chaire-lib-frontend/lib/components/input/Button';
import FormErrors from 'chaire-lib-frontend/lib/components/pageParts/FormErrors';
import LoadingPage from 'chaire-lib-frontend/lib/components/pages/LoadingPage';
import * as Status from 'chaire-lib-common/lib/utils/Status';
import TrError from 'chaire-lib-common/lib/utils/TrError';

const ExportInterviewData = ({ t }: WithTranslation) => {
    const [error, setError] = useState<string | undefined>(undefined);
    const [isPreparingCsvExportFiles, setIsPreparingCsvExportFiles] = useState(false);
    const [csvExportFilesReady, setCsvExportFilesReady] = useState(false);
    const [csvExportFilePaths, setCsvExportFilePaths] = useState<string[]>([]);

    useEffect(() => {
        updateOrWaitForFiles(false);
    }, []);

    const onPrepareCsvRespondentExportFiles = async () => {
        return onPrepareCsvExportFiles('participant');
    };

    const onPrepareCsvValidatedExportFiles = async () => {
        return onPrepareCsvExportFiles('validatedIfAvailable');
    };

    const onPrepareCsvExportFiles = async (
        exportType: 'validatedIfAvailable' | 'participant' = 'validatedIfAvailable'
    ) => {
        setIsPreparingCsvExportFiles(true);
        try {
            const response = await fetch('/api/admin/data/prepareCsvFileForExportByObject?responseType=' + exportType, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (response.status === 200) {
                updateOrWaitForFiles();
            } else {
                throw new TrError(
                    'Wrong response status ' + response.status,
                    'prepareNoResponse',
                    response.status >= 500
                        ? 'admin:export:ServerErrorForExport'
                        : response.status === 401
                            ? 'admin:export:ServerExportForbidden'
                            : 'admin:export:PrepareDataError'
                );
            }
        } catch (err) {
            console.log('Error preparing export files.', err);
            setError(TrError.isTrError(err) ? err.message : 'admin:export:PrepareDataError');
            setCsvExportFilesReady(false);
            setCsvExportFilePaths([]);
            setIsPreparingCsvExportFiles(false);
        }
    };

    const updateOrWaitForFiles = async (listenForFiles = true) => {
        try {
            const response = await fetch('/api/admin/data/getExportTaskResults', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (response.status === 200) {
                const status: Status.Status<{ taskRunning: boolean; files: string[] }> = await response.json();
                if (Status.isStatusOk(status)) {
                    const { taskRunning, files } = Status.unwrap(status);
                    setCsvExportFilesReady(!taskRunning);
                    setCsvExportFilePaths(files);
                    setError(undefined);
                    setIsPreparingCsvExportFiles(taskRunning);
                    if (taskRunning && listenForFiles) {
                        setTimeout(updateOrWaitForFiles, 10000);
                    }
                } else {
                    throw status.error;
                }
            } else {
                throw new TrError(
                    'Wrong response status ' + response.status,
                    'updateOrWaitResponse',
                    response.status >= 500
                        ? 'admin:export:ServerErrorForExport'
                        : response.status === 401
                            ? 'admin:export:ServerExportForbidden'
                            : 'admin:export:UpdateOrWaitError'
                );
            }
        } catch (err) {
            console.log('Error fetching export files.', err);
            setError(TrError.isTrError(err) ? err.message : 'admin:export:WaitForFileError');
            setCsvExportFilesReady(false);
            setCsvExportFilePaths([]);
            setIsPreparingCsvExportFiles(false);
        }
    };

    // This function is used to download the survey questionnaire list as a .txt file
    // NOTE: It is not related to the CSV export files, but it is included here for convenience
    const downloadSurveyQuestionnaireListTxt = async () => {
        try {
            const response = await fetch('/api/admin/data/downloadSurveyQuestionnaireListTxt', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (response.status === 200) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'questionnaire_list_en.txt';
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(url);
            } else if (response.status === 404) {
                throw new TrError(
                    'Wrong response status ' + response.status,
                    'downloadSurveyQuestionnaireListNotFound',
                    'admin:export:DownloadSurveyQuestionnaireListNotFound'
                );
            } else if (response.status === 401) {
                throw new TrError(
                    'Wrong response status ' + response.status,
                    'downloadSurveyQuestionnaireListUnauthorized',
                    'admin:export:DownloadSurveyQuestionnaireListUnauthorized'
                );
            } else {
                throw new TrError(
                    'Wrong response status ' + response.status,
                    'downloadSurveyQuestionnaireListError',
                    'admin:export:DownloadSurveyQuestionnaireListError'
                );
            }
        } catch (err) {
            console.log('Error downloading survey questionnaire list.', err);
            setError(TrError.isTrError(err) ? err.message : 'admin:export:DownloadSurveyQuestionnaireListError');
        }
    };

    const onRefreshExportFiles = () => updateOrWaitForFiles(false);

    const csvFileExportLinks = csvExportFilePaths.map((csvFilePath) => (
        <li key={csvFilePath}>
            <a
                href={`/api/admin/data/exportcsv/${
                    csvFilePath.startsWith('exports/') ? csvFilePath : 'exports/' + csvFilePath
                }`}
            >
                {csvFilePath}
            </a>
        </li>
    ));

    return (
        <div className="admin-widget-container">
            {isPreparingCsvExportFiles && <LoadingPage />}
            <Button
                color="blue"
                onClick={onPrepareCsvValidatedExportFiles}
                label={t('admin:export:PrepareValidatedCsvExportFiles')}
                align="left"
            />
            <Button
                color="blue"
                onClick={onPrepareCsvRespondentExportFiles}
                label={t('admin:export:PrepareParticipantCsvExportFiles')}
                align="left"
            />
            <Button
                color="green"
                onClick={downloadSurveyQuestionnaireListTxt}
                label={t('admin:export:DownloadSurveyQuestionnaireListTxt')}
                align="left"
            />
            {error && <FormErrors errors={[error]} />}
            {csvExportFilesReady && <ul>{csvFileExportLinks}</ul>}
            <ul>
                <li>
                    <a onClick={onRefreshExportFiles} style={{ cursor: 'pointer' }}>
                        {t('admin:export:RefreshExportFiles')}
                    </a>
                </li>
            </ul>
        </div>
    );
};

export default withTranslation()(ExportInterviewData);
