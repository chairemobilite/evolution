/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import knex from 'chaire-lib-backend/lib/config/shared/db.config';
import fs from 'fs';
import taskWrapper from 'chaire-lib-backend/lib/tasks/taskWrapper';
import { fileManager } from 'chaire-lib-backend/lib/utils/filesystem/fileManager';

const exportJsonFileDirectory = 'exports/interviewsJson';

/**
 * Export interviews in json files. One json file per interview. No filter (includes invalid/test interviews)
 */
const exportInterviews = function (exportJsonFileDirectory) {
    return knex
        .select('id', 'uuid', 'response', 'validated_data')
        .from('sv_interviews')
        .orderBy('id')
        .then((rows) => {
            for (let i = 0, count = rows.length; i < count; i++) {
                const interview = rows[i];
                const response = interview.response;
                response.id = interview.id;
                response.uuid = interview.uuid;

                fileManager.directoryManager.createDirectoryIfNotExists(exportJsonFileDirectory);
                fs.writeFileSync(
                    exportJsonFileDirectory + '/' + interview.id + '__' + interview.uuid + '.json',
                    JSON.stringify(response, null, 2) // add linefeeds for readability
                );
            }
        });
};

class ExportInterviewsJSON {
    async run(_argv) {
        // TODO Support options from the command line
        await exportInterviews(exportJsonFileDirectory);

        console.log('Interviews JSON exported to:', fileManager.getAbsolutePath(exportJsonFileDirectory));
    }
}

taskWrapper(new ExportInterviewsJSON())
    .then(() => {
        // eslint-disable-next-line n/no-process-exit
        process.exit();
    })
    .catch((err) => {
        console.error('Error executing task exportInterviewsJson', err);
        // eslint-disable-next-line n/no-process-exit
        process.exit();
    });
