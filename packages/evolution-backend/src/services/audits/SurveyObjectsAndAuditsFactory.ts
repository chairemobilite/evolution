/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { AuditForObject, SurveyObjectsWithAudits } from 'evolution-common/lib/services/audits/types';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import TrError from 'chaire-lib-common/lib/utils/TrError';
import auditsDbQueries from '../../models/audits.db.queries';
import { InterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import { AuditService } from './AuditService';
import { auditsArrayToAuditsByObject } from 'evolution-common/lib/services/audits/AuditUtils';
import { CORRECTED_RESPONSE_REQUIRED_ERROR_CODE } from '../reviews/reviewDecisionErrors';

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
     * Create survey objects and audits for an interview without persisting audits.
     * @param interview - The interview to create survey objects and audits for
     * @param runExtendedAuditChecks - Whether to run extended audit checks
     * @returns Survey objects and audits for the admin UI
     */
    static createSurveyObjectsAndAudits = async (
        interview: InterviewAttributes,
        runExtendedAuditChecks: boolean = false
    ): Promise<SurveyObjectsWithAudits> => {
        if (_isBlank(interview.corrected_response)) {
            throw new TrError(
                'Corrected response is required to create survey objects and audits',
                CORRECTED_RESPONSE_REQUIRED_ERROR_CODE,
                'CorrectedResponseRequired'
            );
        }

        return AuditService.auditInterview(interview, runExtendedAuditChecks);
    };

    /**
     * Create survey objects and audits for an interview then save audits to db
     * @param {InterviewAttributes} interview - The interview to create survey objects and audits for
     * @param {boolean} runExtendedAuditChecks - Whether to run extended audit checks
     * Some audit checks are special and would fetch data from external services or perform
     * long or complex calculations. we do not want to run these checks on each audit
     * call, especially during review, when any change to the data will refresh the audit checks.
     * @returns {Promise<SurveyObjectsWithAudits>} A promise that resolves with the survey objects and audits
     */
    static createSurveyObjectsAndSaveAuditsToDb = async (
        interview: InterviewAttributes,
        runExtendedAuditChecks: boolean = false
    ): Promise<SurveyObjectsWithAudits> => {
        const surveyObjectsWithAudits = await SurveyObjectsAndAuditsFactory.createSurveyObjectsAndAudits(
            interview,
            runExtendedAuditChecks
        );

        // Save audits to database and return updated structure
        const newAudits = await auditsDbQueries.setAuditsForInterview(interview.id, surveyObjectsWithAudits.audits);
        surveyObjectsWithAudits.audits = newAudits;
        surveyObjectsWithAudits.auditsByObject = auditsArrayToAuditsByObject(newAudits);
        return surveyObjectsWithAudits;
    };
}
