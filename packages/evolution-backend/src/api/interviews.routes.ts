/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import express from 'express';
import { participantAuthModel } from '../services/auth/participantAuthModel';
import Interviews from '../services/interviews/interviews';
import isAuthorized from 'chaire-lib-backend/lib/services/auth/authorization';
import { InterviewsSubject } from '../services/auth/roleDefinition';

const router = express.Router();

router.use(isAuthorized({ [InterviewsSubject]: ['read', 'update'] }));

router.get('/interviewByCode', async (req, res) => {
    try {
        const { accessCode } = req.query;
        if (typeof accessCode !== 'string') {
            res.status(400).json({ status: 'Invalid query string' });
        }

        // TODO Do not send the complete interviews at this point
        const interviews = await Interviews.findByAccessCode(accessCode as string);
        return res.status(200).json({
            status: 'success',
            interviews
        });
    } catch (error) {
        console.error(`Error getting interviews: ${error}`);
        return res.status(500).json({ status: 'Error' });
    }
});

router.post('/createNew', async (req, res) => {
    try {
        let userName = req.body.createUser;
        const initialResponses = req.body.responses || {};
        let suffixCount = 0;
        while ((await participantAuthModel.find({ username: userName })) !== undefined) {
            userName = `${req.body.createUser}_${suffixCount++}`;
        }
        if (req.user && (req.user as any).id) {
            initialResponses['_editingUsers'] = [(req.user as any).id];
        }
        const participant = await participantAuthModel.createAndSave({ username: userName });
        const interview = await Interviews.createInterviewForUser(participant.attributes.id, initialResponses);

        return res.status(200).json({
            status: 'success',
            interviewUuid: interview.uuid
        });
    } catch (error) {
        console.error(`Error creating new interview: ${error}`);
        return res.status(500).json({ status: 'Error' });
    }
});

export default router;
