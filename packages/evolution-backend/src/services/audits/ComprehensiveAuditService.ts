/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { AuditForObject, SurveyObjectsWithAudits } from 'evolution-common/lib/services/audits/types';
import { InterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import { SurveyObjectAuditor } from './SurveyObjectAuditor';
import { AttributesToRestore } from './types';
import { restoreAttributes } from './RestoreAttributes';
import { SurveyObjectsFactory } from '../surveyObjects/SurveyObjectsFactory';
import { SurveyObjectsWithErrors } from 'evolution-common/lib/services/baseObjects/types';
import { convertParamsErrorsToAudits } from './AuditUtils';
import { AuditsByObject } from 'evolution-common/lib/services/audits/types';
import { auditsArrayToAuditsByObject } from 'evolution-common/lib/services/audits/AuditUtils';

/**
 * Service that handles the complete audit workflow:
 * 1. Create survey objects
 * 2. Convert parameter errors to audits
 * 3. Restore attributes from original responses
 * 4. Run comprehensive object audits
 */
export class ComprehensiveAuditService {
    /**
     * Execute the complete audit workflow for an interview
     * @param interview - Interview attributes to audit
     * @param attributesToRestore - Optional configuration for attribute restoration
     * @returns Promise<SurveyObjectsWithAudits> - Complete audit results
     */
    static async auditInterview(
        interview: InterviewAttributes,
        attributesToRestore?: AttributesToRestore
    ): Promise<SurveyObjectsWithAudits> {
        console.log(`Starting audit workflow for interview ${interview.uuid}`);

        // If the interview has no response or corrected response, return an empty survey objects with audits
        if (!interview.response || !interview.corrected_response) {
            return {
                audits: [],
                interview: undefined,
                household: undefined,
                home: undefined
            };
        }

        // Step 1: Restore attributes from original responses if configured
        if (attributesToRestore) {
            console.log('Step 1: Restoring attributes from original responses...');
            this.restoreAttributesForAllObjects(interview, attributesToRestore);
        }

        // Step 2: Create survey objects (this may produce parameter errors)
        console.log('Step 2: Creating survey objects...');
        const factory = new SurveyObjectsFactory();
        const surveyObjectsWithErrors = await factory.createAllObjectsWithErrors(interview);

        // Step 3: Convert parameter errors to audits (currently empty arrays in evolution-common)
        console.log('Step 3: Converting parameter errors to audits if present...');
        // Note: This step is currently handled during object creation in evolution-common
        // but the actual conversion happens here in the backend
        const parameterAudits = this.convertCreationErrorsToAudits(surveyObjectsWithErrors);
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

        // Step 4: Run comprehensive object audits
        console.log('Step 4: Running comprehensive object audits...');
        const objectAudits = SurveyObjectAuditor.auditSurveyObjects(surveyObjectsWithAudits, interview);
        surveyObjectsWithAudits.audits.push(...objectAudits);
        surveyObjectsWithAudits.auditsByObject = auditsArrayToAuditsByObject(surveyObjectsWithAudits.audits);

        console.log(`Comprehensive audit workflow completed. Total audits: ${surveyObjectsWithAudits.audits.length}`);

        return surveyObjectsWithAudits;
    }

    /**
     * Convert creation errors to audits for all objects
     * This handles the parameter validation errors that occurred during object creation
     */
    private static convertCreationErrorsToAudits(result: SurveyObjectsWithErrors): AuditForObject[] {
        const allAudits: AuditForObject[] = [];

        // Interview errors
        if (result.errorsByObject?.interview && result.errorsByObject.interview.length > 0) {
            const interviewAudits = convertParamsErrorsToAudits(result.errorsByObject.interview, {
                objectType: 'interview',
                objectUuid: result.errorsByObject.interviewUuid
            });
            allAudits.push(...interviewAudits);
        }

        // Household errors
        if (result.errorsByObject?.household && result.errorsByObject.household.length > 0) {
            const householdAudits = convertParamsErrorsToAudits(result.errorsByObject.household, {
                objectType: 'household',
                objectUuid: result.errorsByObject.householdUuid
            });
            allAudits.push(...householdAudits);
        }

        // Home errors
        if (result.errorsByObject?.home && result.errorsByObject.home.length > 0) {
            const homeAudits = convertParamsErrorsToAudits(result.errorsByObject.home, {
                objectType: 'home',
                objectUuid: result.errorsByObject.homeUuid
            });
            allAudits.push(...homeAudits);
        }

        // Person errors
        if (result.errorsByObject?.personsByUuid) {
            Object.entries(result.errorsByObject.personsByUuid).forEach(([personUuid, errors]) => {
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
        if (result.errorsByObject?.journeysByUuid) {
            Object.entries(result.errorsByObject.journeysByUuid).forEach(([journeyUuid, errors]) => {
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
        if (result.errorsByObject?.visitedPlacesByUuid) {
            Object.entries(result.errorsByObject.visitedPlacesByUuid).forEach(([visitedPlaceUuid, errors]) => {
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
        if (result.errorsByObject?.tripsByUuid) {
            Object.entries(result.errorsByObject.tripsByUuid).forEach(([tripUuid, errors]) => {
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
        if (result.errorsByObject?.segmentsByUuid) {
            Object.entries(result.errorsByObject.segmentsByUuid).forEach(([segmentUuid, errors]) => {
                if (errors && errors.length > 0) {
                    const segmentAudits = convertParamsErrorsToAudits(errors, {
                        objectType: 'segment',
                        objectUuid: segmentUuid
                    });
                    allAudits.push(...segmentAudits);
                }
            });
        }

        console.log(`Converted ${allAudits.length} parameter errors to audits`);
        return allAudits;
    }

    /**
     * Restore attributes for all created objects
     */
    private static restoreAttributesForAllObjects(
        interview: InterviewAttributes,
        attributesToRestore: AttributesToRestore
    ): void {
        const correctedResponse = interview.corrected_response!;
        const originalResponse = interview.response!;

        // Restore interview attributes
        if (attributesToRestore.interview) {
            restoreAttributes(attributesToRestore, 'interview', undefined, correctedResponse, originalResponse);
        }

        // Restore household attributes
        if (attributesToRestore.household && correctedResponse.household) {
            restoreAttributes(attributesToRestore, 'household', 'household', correctedResponse, originalResponse);
        }

        // Restore home attributes
        if (attributesToRestore.home && correctedResponse.home) {
            restoreAttributes(attributesToRestore, 'home', 'home', correctedResponse, originalResponse);
        }

        // Restore person attributes
        if (attributesToRestore.person && correctedResponse.persons) {
            Object.keys(correctedResponse.persons).forEach((personUuid) => {
                const personPath = `persons.${personUuid}`;
                restoreAttributes(attributesToRestore, 'person', personPath, correctedResponse, originalResponse);
            });
        }

        // Restore journey attributes
        if (attributesToRestore.journey && correctedResponse.journeys) {
            Object.keys(correctedResponse.journeys).forEach((journeyUuid) => {
                const journeyPath = `journeys.${journeyUuid}`;
                restoreAttributes(attributesToRestore, 'journey', journeyPath, correctedResponse, originalResponse);
            });
        }

        // Restore visited place attributes
        if (attributesToRestore.visitedPlace && correctedResponse.visitedPlaces) {
            Object.keys(correctedResponse.visitedPlaces).forEach((visitedPlaceUuid) => {
                const visitedPlacePath = `visitedPlaces.${visitedPlaceUuid}`;
                restoreAttributes(
                    attributesToRestore,
                    'visitedPlace',
                    visitedPlacePath,
                    correctedResponse,
                    originalResponse
                );
            });
        }

        // Restore trip attributes
        if (attributesToRestore.trip && correctedResponse.trips) {
            Object.keys(correctedResponse.trips).forEach((tripUuid) => {
                const tripPath = `trips.${tripUuid}`;
                restoreAttributes(attributesToRestore, 'trip', tripPath, correctedResponse, originalResponse);
            });
        }

        // Restore segment attributes
        if (attributesToRestore.segment && correctedResponse.segments) {
            Object.keys(correctedResponse.segments).forEach((segmentUuid) => {
                const segmentPath = `segments.${segmentUuid}`;
                restoreAttributes(attributesToRestore, 'segment', segmentPath, correctedResponse, originalResponse);
            });
        }
    }
}
