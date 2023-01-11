/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import router from 'evolution-backend/lib/api/interviews.routes';
import userSurveyRouter from 'evolution-backend/lib/api/survey.user.routes';
import validationSurveyRouter from 'evolution-backend/lib/api/survey.validation.routes';

module.exports = function(app){
  app.use('/api/interviews/', router);
  app.use('/api', userSurveyRouter);
  app.use('/api', validationSurveyRouter);
};