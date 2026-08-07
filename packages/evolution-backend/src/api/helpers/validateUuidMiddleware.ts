/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { NextFunction, Request, Response } from 'express';
import { validate as uuidValidate } from 'uuid';

// Middleware that validates that the interviewUuid request parameter is a valid
// uuid. The interview UUID should be in the request parameters under the key
// 'interviewUuid' or 'interviewId'.
const validateUuidMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const interviewUuid = req.params.interviewUuid || req.params.interviewId;
    if (!uuidValidate(interviewUuid)) {
        console.warn(`Received an invalid interview ID from client: ${interviewUuid}`);
        return res.status(400).json({ status: 'failed', error: 'Invalid interview ID' });
    }
    if (req.params.interviewId) {
        // We are using an interview UUID, it should be in the interviewUUID paramemeter. Just log an error if it is not the case, so we notice and fix
        console.error(
            'interviewUuid set in the interviewId parameter of the route, the parameter name should be updated to interviewUuid ',
            req.route.path
        );
    }
    next();
};

export default validateUuidMiddleware;
