/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { NextFunction, Request, Response } from 'express';
import { subject } from '@casl/ability';
import Interviews from '../interviews/interviews';
import definePermissionsFor from 'chaire-lib-backend/lib/services/auth/userPermissions';
import { InterviewSubject } from './roleDefinition';
import { UserAttributes } from 'chaire-lib-backend/lib/services/users/user';
import { InterviewAttributes } from 'evolution-common/lib/services/interviews/interview';

export type permissionType = 'read' | 'update' | 'review' | 'correct'| 'export' | 'confirm' | 'delete' | 'create';

/**
 * Authorization middleware to authorize a user on an interview
 *
 * @param {{ [key: string ]: string}} permissions An object with the permissions
 * to verify
 */
const interviewUserIsAuthorized = (permissions: permissionType[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const userId = (req.user as any)?.id;
        // User ID invalid or absent, unauthorized
        if (!userId) {
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
            const allowed = isUserAllowed(req.user as any, interview, permissions);
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

export const isUserAllowed = (
    user: UserAttributes,
    interview: InterviewAttributes,
    permissions: permissionType[]
): boolean => {
    // TODO Have the permissions follow the user object instead of calculating it again
    const userPermissions = definePermissionsFor(user as any);
    const cant = permissions.find((perm) => !userPermissions.can(perm, subject(InterviewSubject, interview)));
    return cant ? false : true;
};

export default interviewUserIsAuthorized;
