/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { NextFunction, Request, Response } from 'express';
import Interviews from '../interviews/interviews';

export type permissionType = 'read' | 'update' | 'validate' | 'confirm' | 'delete' | 'create';

/**
 * Authorization middleware to make sure a participant is allowed to access the
 * interview, ie the interview is his own
 */
const interviewParticipantIsAuthorized = () => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const participantId = (req.user as any)?.id;
        // User ID invalid or absent, unauthorized
        if (!participantId) {
            res.status(401).json({ status: 'Unauthorized' });
            return;
        }
        // Get the interview
        const interviewId = req.params?.interviewId || req.body?.interviewId;
        // No interview specified, let the request do what must be done
        if (!interviewId) {
            next();
            return;
        }
        if (req.params?.interviewId && req.body?.interviewId && req.params.interviewId !== req.body.interviewId) {
            // Ambiguous query, 3 interview IDs are specified
            console.error(
                'Ambiguous query: 2 different interviews have been specified in query string and body. Bailing out'
            );
            res.status(400).json({ status: 'BadRequest' });
            return;
        }

        try {
            const interview = await Interviews.getInterviewByUuid(interviewId);
            // The interview is not found
            if (!interview) {
                res.status(404).json({ status: 'NotFound' });
                return;
            }
            const allowed = interview.participant_id === participantId && interview.is_active && !interview.is_frozen;
            if (!allowed) {
                res.status(401).json({ status: 'Unauthorized' });
                return;
            }
            next();
        } catch (error) {
            console.error('Error verifying user authorization: ', error);
            res.status(500).json({ status: 'Error' });
        }
    };
};

export default interviewParticipantIsAuthorized;
