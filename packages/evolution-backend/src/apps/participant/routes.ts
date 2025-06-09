/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { Application } from 'express';

import getSurveyRouter, { getPublicParticipantRoutes } from '../../api/survey.participant.routes';
import participantIsAuthorized from '../../services/auth/participantAuthorization';
import { defaultMiddlewares } from '../../services/logging/queryLoggingMiddleware';

export default (app: Application) => {
    const userSurveyRouter = getSurveyRouter(participantIsAuthorized, defaultMiddlewares);
    app.use('/api', userSurveyRouter);

    // Add public routes for the participant
    const participantPublicRouter = getPublicParticipantRoutes();
    app.use('/public', participantPublicRouter);
};
