/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import getSurveyRouter from 'evolution-backend/lib/api/survey.user.routes';
import participantIsAuthorized from 'evolution-backend/lib/services/auth/participantAuthorization';

module.exports = function(app) {
    const userSurveyRouter = getSurveyRouter(participantIsAuthorized);
    app.use('/api', userSurveyRouter);
};