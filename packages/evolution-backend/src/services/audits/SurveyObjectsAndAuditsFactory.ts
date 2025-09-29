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
import { ComprehensiveAuditService } from './ComprehensiveAuditService';

/**
 * Static class to manage various survey objects creation and audits operations
 */
export class SurveyObjectsAndAuditsFactory {
    /**
     * Update audits for an interview
     * @param {number} interviewId - The id of the interview
     * @param {AuditForObject[]} audits - The audits to update
     * @returns {Promise<void>} A promise that resolves when the audits are updated
     */
    static updateAudits = async (interviewId: number, audits: AuditForObject[]): Promise<void> => {
        for (let i = 0; i < audits.length; i++) {
            await auditsDbQueries.updateAudit(interviewId, audits[i]);
        }
    };

    /**
     * Create survey objects and audits for an interview
     * @param {InterviewAttributes} interview - The interview to create survey objects and audits for
     * @returns {Promise<SurveyObjectsWithAudits>} A promise that resolves with the survey objects and audits
     */
    static createSurveyObjectsAndAudit = async (interview: InterviewAttributes): Promise<SurveyObjectsWithAudits> => {
        /**
         * corrected_response is required to create survey objects and audits.
         * It must have been created on a previous review or copied from response
         * in the frontend if it is the first review.
         */
        if (!interview.corrected_response) {
            return {
                audits: [],
                auditsByObject: {
                    interview: [],
                    household: [],
                    home: [],
                    persons: {},
                    journeys: {},
                    visitedPlaces: {},
                    trips: {},
                    segments: {}
                },
                interview: undefined,
                household: undefined,
                home: undefined
            };
        }

        // Use custom audit function if provided, otherwise use default implementation
        const surveyObjectsWithAudits = await ComprehensiveAuditService.auditInterview(
            interview,
            serverConfig.attributesToRestore
        );

        // Save audits to database and return updated structure
        const newAudits = await auditsDbQueries.setAuditsForInterview(interview.id, surveyObjectsWithAudits.audits);
        surveyObjectsWithAudits.audits = newAudits;
        return surveyObjectsWithAudits;
    };
}
