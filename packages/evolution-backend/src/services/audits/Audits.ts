/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { AuditForObject, SurveyObjectsWithAudits } from 'evolution-common/lib/services/audits/types';
import auditsDbQueries from '../../models/audits.db.queries';
import serverConfig from '../../config/projectConfig';
import { InterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';

/**
 * Static class to manage various audits operations
 */
export class Audits {
    static updateAudits = async (interviewId: number, audits: AuditForObject[]): Promise<void> => {
        for (let i = 0; i < audits.length; i++) {
            await auditsDbQueries.updateAudit(interviewId, audits[i]);
        }
    };

    static runAndSaveInterviewAudits = async (interview: InterviewAttributes): Promise<SurveyObjectsWithAudits> => {
        if (!serverConfig.auditInterview || !interview.corrected_response) {
            return {
                audits: []
            };
        }
        const surveyObjectsWithAudits = await serverConfig.auditInterview(interview as InterviewAttributes);
        const newAudits = await auditsDbQueries.setAuditsForInterview(interview.id, surveyObjectsWithAudits.audits);
        surveyObjectsWithAudits.audits = newAudits;
        return surveyObjectsWithAudits;
    };
}
