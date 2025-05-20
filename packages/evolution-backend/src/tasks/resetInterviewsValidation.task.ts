/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import '../config/projectConfig'; // Unused, but must be imported
import 'chaire-lib-backend/lib/config/dotenv.config';
import Interviews from '../services/interviews/interviews';

// this task will remove all validated data from every valid interviews and replace validated data with original response (not modified by validators/admins)
// You must provide this argument to confirm reset: I WANT TO DELETE ALL VALIDATION WORK
const confirm = process.argv[2];

if (confirm !== 'I WANT TO DELETE ALL VALIDATION WORK') {
    console.error(
        'WARNING!!! This task will remove all validations from the database. To confirm, relaunch the task with this argument: I WANT TO DELETE ALL VALIDATION WORK'
    );
    // eslint-disable-next-line n/no-process-exit
    process.exit();
}

const run = async function () {
    await Interviews.resetInterviews(confirm);
};

run()
    .then(() => {
        console.log('Completed task resetInterviewValidation');
        // eslint-disable-next-line n/no-process-exit
        process.exit();
    })
    .catch((err) => {
        console.error('Error executing task resetInterviewValidation', err);
        // eslint-disable-next-line n/no-process-exit
        process.exit();
    });
