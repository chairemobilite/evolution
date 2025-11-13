/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { AuditForObject, SurveyObjectsWithAudits } from 'evolution-common/lib/services/audits/types';
import * as auditChecks from './auditChecks';

/**
 * The auditor can audit all survey objects in a single run.
 */
export class SurveyObjectAuditor {
    /**
     * Run audits on all survey objects
     * @param surveyObjectsWithAudits - Survey objects with audits
     * @returns Promise resolving to array of audit objects
     */
    static async auditSurveyObjects(surveyObjectsWithAudits: SurveyObjectsWithAudits): Promise<AuditForObject[]> {
        const allAudits: AuditForObject[] = [];

        // Run interview audit checks
        if (surveyObjectsWithAudits.interview) {
            const interviewContext: auditChecks.InterviewAuditCheckContext = {
                interview: surveyObjectsWithAudits.interview
            };
            const interviewAudits = await auditChecks.runInterviewAuditChecks(
                interviewContext,
                auditChecks.interviewAuditChecks
            );
            allAudits.push(...interviewAudits);
        } else {
            console.warn('Interview not found or invalid, skipping survey objects audit checks');
            return allAudits;
        }

        // Run household audit checks
        if (surveyObjectsWithAudits.household) {
            const householdContext: auditChecks.HouseholdAuditCheckContext = {
                household: surveyObjectsWithAudits.household,
                interview: surveyObjectsWithAudits.interview
            };
            const householdAudits = await auditChecks.runHouseholdAuditChecks(
                householdContext,
                auditChecks.householdAuditChecks
            );
            allAudits.push(...householdAudits);
        }

        // Audit home
        if (surveyObjectsWithAudits.home && surveyObjectsWithAudits.household) {
            const homeContext: auditChecks.HomeAuditCheckContext = {
                home: surveyObjectsWithAudits.home,
                household: surveyObjectsWithAudits.household,
                interview: surveyObjectsWithAudits.interview
            };
            const homeAudits = await auditChecks.runHomeAuditChecks(homeContext, auditChecks.homeAuditChecks);
            allAudits.push(...homeAudits);
        }

        // Audit persons and their nested objects
        if (surveyObjectsWithAudits.household?.members) {
            for (const person of surveyObjectsWithAudits.household.members) {
                const personContext: auditChecks.PersonAuditCheckContext = {
                    person,
                    household: surveyObjectsWithAudits.household,
                    home: surveyObjectsWithAudits.home,
                    interview: surveyObjectsWithAudits.interview
                };
                const personAudits = await auditChecks.runPersonAuditChecks(
                    personContext,
                    auditChecks.personAuditChecks
                );
                allAudits.push(...personAudits);

                // Audit journeys for this person
                if (person.journeys) {
                    for (const journey of person.journeys) {
                        const journeyContext: auditChecks.JourneyAuditCheckContext = {
                            journey,
                            person,
                            household: surveyObjectsWithAudits.household,
                            home: surveyObjectsWithAudits.home,
                            interview: surveyObjectsWithAudits.interview
                        };
                        const journeyAudits = await auditChecks.runJourneyAuditChecks(
                            journeyContext,
                            auditChecks.journeyAuditChecks
                        );
                        allAudits.push(...journeyAudits);

                        // Run visited place audit checks for this journey
                        if (journey.visitedPlaces) {
                            for (const visitedPlace of journey.visitedPlaces) {
                                const visitedPlaceContext: auditChecks.VisitedPlaceAuditCheckContext = {
                                    visitedPlace,
                                    person,
                                    journey,
                                    household: surveyObjectsWithAudits.household,
                                    home: surveyObjectsWithAudits.home,
                                    interview: surveyObjectsWithAudits.interview
                                };
                                const visitedPlaceAudits = await auditChecks.runVisitedPlaceAuditChecks(
                                    visitedPlaceContext,
                                    auditChecks.visitedPlaceAuditChecks
                                );
                                allAudits.push(...visitedPlaceAudits);
                            }
                        }

                        // Audit trips for this journey
                        if (journey.trips) {
                            for (const trip of journey.trips) {
                                const tripContext: auditChecks.TripAuditCheckContext = {
                                    trip,
                                    person,
                                    journey,
                                    household: surveyObjectsWithAudits.household,
                                    home: surveyObjectsWithAudits.home,
                                    interview: surveyObjectsWithAudits.interview
                                };
                                const tripAudits = await auditChecks.runTripAuditChecks(
                                    tripContext,
                                    auditChecks.tripAuditChecks
                                );
                                allAudits.push(...tripAudits);

                                // Run segment audit checks for this trip
                                if (trip.segments) {
                                    for (const segment of trip.segments) {
                                        const segmentContext: auditChecks.SegmentAuditCheckContext = {
                                            segment,
                                            trip,
                                            person,
                                            journey,
                                            household: surveyObjectsWithAudits.household,
                                            home: surveyObjectsWithAudits.home,
                                            interview: surveyObjectsWithAudits.interview
                                        };
                                        const segmentAudits = await auditChecks.runSegmentAuditChecks(
                                            segmentContext,
                                            auditChecks.segmentAuditChecks
                                        );
                                        allAudits.push(...segmentAudits);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        return allAudits;
    }
}
