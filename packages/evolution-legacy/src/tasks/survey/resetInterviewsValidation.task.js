/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import '../../config/shared/dotenv.config';
import Interviews from 'evolution-backend/lib/services/interviews/interviews';

// this task will remove all validated data from every valid interviews and replace validated data with original responses (not modified by validators/admins)

// You must provide this argument to confirm reset: I WANT TO DELETE ALL VALIDATION WORK
const confirm = process.argv[2];

if (confirm !== 'I WANT TO DELETE ALL VALIDATION WORK') {
    console.error('WARNING!!! This task will remove all validations from the database. To confirm, relaunch the task with this argument: I WANT TO DELETE ALL VALIDATION WORK');
    process.exit();
}

const run = function () {
    Interviews.resetInterviews(confirm).then(function() {
        console.log('complete!');
        process.exit();
    });
};

run();