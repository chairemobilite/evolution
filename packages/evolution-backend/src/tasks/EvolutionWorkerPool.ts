/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
// This file is meant as the entry point of the worker pool, to be run in workers directly
import workerpool from 'workerpool';
import { exportAllToCsvByObjectTask } from '../services/adminExport/exportAllToCsvByObject';
import { exportInterviewLogTask } from '../services/adminExport/exportInterviewLogs';

// Worker pool for evolution backend tasks
const run = async () => {
    // create a worker and register public functions
    workerpool.worker({
        exportAllToCsvByObject: exportAllToCsvByObjectTask,
        exportInterviewLog: exportInterviewLogTask
    });
};

run();

export default workerpool;
