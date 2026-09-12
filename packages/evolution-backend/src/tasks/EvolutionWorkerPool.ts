/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
// This file is meant as the entry point of the worker pool, to be run in workers directly
import workerpool from 'workerpool';
import { workerData } from 'worker_threads';
import { exportAllToCsvBySurveyObjectTask } from '../services/adminExport/exportAllToCsvBySurveyObject';
import { exportInterviewLogTask } from '../services/adminExport/exportInterviewLogs';
import { runBatchAuditsTask } from '../services/audits/BatchAuditService';

/**
 * Set up the project configuration of this worker, which starts with the
 * defaults only, by requiring the module of the survey that configures the
 * server. The tasks read the configuration of their own instance, so without
 * this a batch audit would run without the object parsers of the survey and
 * audit responses the server would have parsed first.
 */
const configureProject = async () => {
    const serverConfigFile = workerData?.serverConfigFile;
    if (serverConfigFile === undefined) {
        return;
    }
    try {
        await import(serverConfigFile);
    } catch (error) {
        console.error(`Worker pool: cannot configure the project from ${serverConfigFile}:`, error);
    }
};

// Worker pool for evolution backend tasks
const run = async () => {
    await configureProject();
    // create a worker and register public functions
    workerpool.worker({
        exportAllToCsvBySurveyObject: exportAllToCsvBySurveyObjectTask,
        exportInterviewLog: exportInterviewLogTask,
        runBatchAudits: runBatchAuditsTask
    });
};

run();

export default workerpool;
