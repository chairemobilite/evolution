/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import '../config/projectConfig'; // Unused, but must be imported
import taskWrapper from 'chaire-lib-backend/lib/tasks/taskWrapper';
import { fileManager } from 'chaire-lib-backend/lib/utils/filesystem/fileManager';
import { exportInterviewLogTask } from '../services/adminExport/exportInterviewLogs';

class ExportInterviewLogs {
    async run(argv) {
        const withValues = argv.withValues === true;
        const participantResponsesOnly = argv.participantResponsesOnly === true;
        // TODO Support options from the command line
        const csvFilePath = await exportInterviewLogTask({ withValues, participantResponsesOnly });

        console.log('Interview logs exported to:', fileManager.getAbsolutePath(csvFilePath));
    }
}

taskWrapper(new ExportInterviewLogs())
    .then(() => {
        // eslint-disable-next-line n/no-process-exit
        process.exit();
    })
    .catch((err) => {
        console.error('Error executing task', err);
        // eslint-disable-next-line n/no-process-exit
        process.exit();
    });
