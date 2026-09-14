/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
// This file is meant as the entry point of the worker pool, to be run in workers directly
import workerpool from 'workerpool';
import { workerData } from 'worker_threads';
import { loadRegisteredServerConfig, registerServerConfigs } from '../config/serverConfigRegistry';
import { exportAllToCsvBySurveyObjectTask } from '../services/adminExport/exportAllToCsvBySurveyObject';
import { exportInterviewLogTask } from '../services/adminExport/exportInterviewLogs';
import { runBatchAuditsTask } from '../services/audits/BatchAuditService';

// Worker pool for evolution backend tasks
const run = async () => {
    // The configuration of this worker holds the defaults until the modules the
    // server registered are loaded here too, without which the tasks would run
    // without the parsers and the callbacks of the survey
    registerServerConfigs(workerData?.serverConfigs ?? {});
    await loadRegisteredServerConfig();

    // create a worker and register public functions
    workerpool.worker({
        exportAllToCsvBySurveyObject: exportAllToCsvBySurveyObjectTask,
        exportInterviewLog: exportInterviewLogTask,
        runBatchAudits: runBatchAuditsTask
    });
};

run();

export default workerpool;
