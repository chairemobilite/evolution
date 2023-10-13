/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import workerpool, { WorkerPool } from 'workerpool';

import { fileManager } from 'chaire-lib-backend/lib/utils/filesystem/fileManager';

export const filePathOnServer = 'exports';

let pool: WorkerPool | undefined = undefined;
pool = workerpool.pool(__dirname + '/exportToCsvByObjectWorkerPool.js', { maxWorkers: 1 });

// eslint-disable-next-line @typescript-eslint/ban-types
let runningExportNonce: undefined | Object = undefined;

export const exportAllToCsvByObject = function () {
    if (runningExportNonce !== undefined) {
        return 'alreadyRunning';
    }
    runningExportNonce = new Object();
    pool.exec('exportAllToCsvByObject')
        .then(() => console.log('Export by object completed'))
        .catch((error) => {
            console.log('Export by object failed:', error);
        })
        .then(() => {
            runningExportNonce = undefined;
        });
    return 'exportStarted';
};

export const isExportRunning = () => runningExportNonce !== undefined;

export const getExportFiles = () => fileManager.directoryManager.getFiles(filePathOnServer);
