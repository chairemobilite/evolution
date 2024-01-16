/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import '../../config/shared/dotenv.config';
import Interviews from 'evolution-backend/lib/services/interviews/interviews';

import appConfig from 'evolution-frontend/lib/config/application.config';


const run = async function () {
    await Interviews.auditInterviews(appConfig.getAdminValidations(), appConfig.projectHelpers, appConfig.getParsers());
};

run().then(function() {
  console.log('complete');
  process.exit();
});