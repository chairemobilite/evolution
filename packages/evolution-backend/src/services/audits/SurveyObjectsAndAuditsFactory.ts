/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { AuditForObject, SurveyObjectsWithAudits } from 'evolution-common/lib/services/audits/types';
import auditsDbQueries from '../../models/audits.db.queries';
import { InterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import { AuditService } from './AuditService';
import { auditsArrayToAuditsByObject } from 'evolution-common/lib/services/audits/AuditUtils';

/**
 * Static class to manage various survey objects creation and audits operations
 */
export class SurveyObjectsAndAuditsFactory {
    /**
     * Update audits for an interview and save them to db
     * @param {number} interviewId - The id of the interview
     * @param {AuditForObject[]} audits - The audits to update
     * @returns {Promise<void>} A promise that resolves when the audits are updated
     */
    static updateAudits = async (interviewId: number, audits: AuditForObject[]): Promise<void> => {
        await Promise.all(audits.map((audit) => auditsDbQueries.updateAudit(interviewId, audit)));
    };

    /**
     * Create survey objects and audits for an interview then save audits to db
     * @param {InterviewAttributes} interview - The interview to create survey objects and audits for
     * @returns {Promise<SurveyObjectsWithAudits>} A promise that resolves with the survey objects and audits
     */
    static createSurveyObjectsAndSaveAuditsToDb = async (
        interview: InterviewAttributes
    ): Promise<SurveyObjectsWithAudits> => {
        /**
         * corrected_response is required to create survey objects and audits.
         * It must have been created on a previous review or copied from response
         * in the frontend if it is the first review.
         */
        if (!interview.corrected_response) {
            throw new Error('Corrected response is required to create survey objects and audits');
        }

        // Create survey objects, check errors and get audits:
        const surveyObjectsWithAudits = await AuditService.auditInterview(interview);

        // Save audits to database and return updated structure
        const newAudits = await auditsDbQueries.setAuditsForInterview(interview.id, surveyObjectsWithAudits.audits);
        surveyObjectsWithAudits.audits = newAudits;
        surveyObjectsWithAudits.auditsByObject = auditsArrayToAuditsByObject(newAudits);
        return surveyObjectsWithAudits;
    };
}
