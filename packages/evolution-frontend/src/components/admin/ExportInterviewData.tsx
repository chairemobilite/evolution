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

    const onPrepareCsvExportFiles = async () => {
        setIsPreparingCsvExportFiles(true);
        try {
            const response = await fetch('/api/admin/data/prepareCsvFileForExportByObject', {
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
            <Button color="blue" onClick={onPrepareCsvExportFiles} label={t('admin:export:PrepareCsvExportFiles')} />
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
