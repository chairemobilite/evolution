/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { Application } from 'express';

import router from '../../api/interviews.routes';
import getSurveyRouter from '../../api/survey.user.routes';
import validationSurveyRouter from '../../api/survey.validation.routes';
import userIsAuthorized from '../../services/auth/userAuthorization';
import { logUserAccessesMiddleware } from '../../services/logging/queryLoggingMiddleware';

export default (app: Application) => {
    const userSurveyRouter = getSurveyRouter(userIsAuthorized, logUserAccessesMiddleware);
    app.use('/api/interviews/', router);
    app.use('/api', userSurveyRouter);
    app.use('/api', validationSurveyRouter);
};
