/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { AuditForObject, SurveyObjectsWithAudits } from 'evolution-common/lib/services/audits/types';
import { InterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import { SurveyObjectAuditor } from './SurveyObjectAuditor';
import { SurveyObjectsFactory } from '../surveyObjects/SurveyObjectsFactory';
import { ErrorsBySurveyObject } from 'evolution-common/lib/services/baseObjects/types';
import { convertParamsErrorsToAudits } from './AuditUtils';
import { AuditsByObject } from 'evolution-common/lib/services/audits/types';
import { auditsArrayToAuditsByObject } from 'evolution-common/lib/services/audits/AuditUtils';

/**
 * Service that handles the complete audit workflow:
 * 1. Create survey objects
 * 2. Convert parameter errors to audits
 * 3. Run object audits
 */
export class AuditService {
    /**
     * Execute the complete audit workflow for an interview
     * This function must be called before reviewing and after any change
     * in the corrected response during review process.
     * It must also be called if corrected response is reset from original response.
     * The runExtendedAuditChecks parameter is used to control Whether to run extended audit checks.
     * Some audit checks are special and would fetch data from external services or perform
     * long or complex calculations. we do not want to run these checks on each audit
     * call, especially during review, when any change to the data will refresh the audit checks.
     * @param interviewAttributes - Interview attributes to audit
     * @param runExtendedAuditChecks - whether to run extended audit checks
     * @returns Promise<SurveyObjectsWithAudits> - Complete audit results
     */
    static async auditInterview(
        interviewAttributes: InterviewAttributes,
        runExtendedAuditChecks: boolean = false
    ): Promise<SurveyObjectsWithAudits> {
        console.log(`Starting audit workflow for interview ${interviewAttributes.uuid}`);

        // If the interview has no response or corrected response, return an empty survey objects with audits
        if (!interviewAttributes.response || !interviewAttributes.corrected_response) {
            return {
                audits: [],
                interview: undefined,
                household: undefined,
                home: undefined
            };
        }

        // Step 1: Create survey objects (this may produce parameter errors)
        console.log('Step 1: Creating survey objects...');
        const factory = new SurveyObjectsFactory();
        const surveyObjectsWithErrors = await factory.createAllObjectsWithErrors(interviewAttributes);

        // Step 2: Convert parameter errors to audits (currently empty arrays in evolution-common)
        console.log('Step 2: Converting parameter errors to audits if present...');
        // Note: This step is currently handled during object creation in evolution-common
        // but the actual conversion happens here in the backend
        const parameterAudits = this.convertCreationErrorsToAudits(surveyObjectsWithErrors.errorsByObject);
        const surveyObjectsWithAudits = {
            interview: surveyObjectsWithErrors.interview,
            household: surveyObjectsWithErrors.household,
            home: surveyObjectsWithErrors.home,
            audits: parameterAudits,
            auditsByObject: {
                interview: [],
                household: [],
                home: [],
                persons: {},
                journeys: {},
                visitedPlaces: {},
                trips: {},
                segments: {}
            } as AuditsByObject
        };

        // Step 3: Run object audits
        console.log('Step 3: Running object audits...');
        const objectAudits = await SurveyObjectAuditor.auditSurveyObjects(
            surveyObjectsWithAudits,
            runExtendedAuditChecks
        );
        surveyObjectsWithAudits.audits.push(...objectAudits);
        surveyObjectsWithAudits.auditsByObject = auditsArrayToAuditsByObject(surveyObjectsWithAudits.audits);

        console.log(`Auditing completed. Total audits: ${surveyObjectsWithAudits.audits.length}`);

        return surveyObjectsWithAudits;
    }

    /**
     * Convert creation errors to audits for all objects
     * This handles the parameter validation errors that occurred during object creation
     * @param errorsByObject - Errors by survey object type
     * @returns Array of audit objects
     */
    private static convertCreationErrorsToAudits(errorsByObject: ErrorsBySurveyObject): AuditForObject[] {
        const allAudits: AuditForObject[] = [];

        // Interview errors
        if (errorsByObject.interview.length > 0) {
            const interviewAudits = convertParamsErrorsToAudits(errorsByObject.interview, {
                objectType: 'interview',
                objectUuid: errorsByObject.interviewUuid
            });
            allAudits.push(...interviewAudits);
        }

        // Household errors
        if (errorsByObject.household.length > 0) {
            const householdAudits = convertParamsErrorsToAudits(errorsByObject.household, {
                objectType: 'household',
                objectUuid: errorsByObject.householdUuid
            });
            allAudits.push(...householdAudits);
        }

        // Home errors
        if (errorsByObject.home.length > 0) {
            const homeAudits = convertParamsErrorsToAudits(errorsByObject.home, {
                objectType: 'home',
                objectUuid: errorsByObject.homeUuid
            });
            allAudits.push(...homeAudits);
        }

        // Person errors
        if (errorsByObject.personsByUuid) {
            Object.entries(errorsByObject.personsByUuid).forEach(([personUuid, errors]) => {
                if (errors && errors.length > 0) {
                    const personAudits = convertParamsErrorsToAudits(errors, {
                        objectType: 'person',
                        objectUuid: personUuid
                    });
                    allAudits.push(...personAudits);
                }
            });
        }

        // Journey errors
        if (errorsByObject.journeysByUuid) {
            Object.entries(errorsByObject.journeysByUuid).forEach(([journeyUuid, errors]) => {
                if (errors && errors.length > 0) {
                    const journeyAudits = convertParamsErrorsToAudits(errors, {
                        objectType: 'journey',
                        objectUuid: journeyUuid
                    });
                    allAudits.push(...journeyAudits);
                }
            });
        }

        // VisitedPlace errors
        if (errorsByObject.visitedPlacesByUuid) {
            Object.entries(errorsByObject.visitedPlacesByUuid).forEach(([visitedPlaceUuid, errors]) => {
                if (errors && errors.length > 0) {
                    const visitedPlaceAudits = convertParamsErrorsToAudits(errors, {
                        objectType: 'visitedPlace',
                        objectUuid: visitedPlaceUuid
                    });
                    allAudits.push(...visitedPlaceAudits);
                }
            });
        }

        // Trip errors
        if (errorsByObject.tripsByUuid) {
            Object.entries(errorsByObject.tripsByUuid).forEach(([tripUuid, errors]) => {
                if (errors && errors.length > 0) {
                    const tripAudits = convertParamsErrorsToAudits(errors, {
                        objectType: 'trip',
                        objectUuid: tripUuid
                    });
                    allAudits.push(...tripAudits);
                }
            });
        }

        // Segment errors
        if (errorsByObject.segmentsByUuid) {
            Object.entries(errorsByObject.segmentsByUuid).forEach(([segmentUuid, errors]) => {
                if (errors && errors.length > 0) {
                    const segmentAudits = convertParamsErrorsToAudits(errors, {
                        objectType: 'segment',
                        objectUuid: segmentUuid
                    });
                    allAudits.push(...segmentAudits);
                }
            });
        }

        return allAudits;
    }
}
