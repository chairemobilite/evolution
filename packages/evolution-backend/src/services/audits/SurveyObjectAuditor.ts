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
     * @returns Array of audit objects
     */
    static auditSurveyObjects(surveyObjectsWithAudits: SurveyObjectsWithAudits): AuditForObject[] {
        const allAudits: AuditForObject[] = [];

        // Run interview audit checks
        if (surveyObjectsWithAudits.interview) {
            const interviewContext: auditChecks.InterviewAuditCheckContext = {
                interview: surveyObjectsWithAudits.interview
            };
            allAudits.push(...auditChecks.runInterviewAuditChecks(interviewContext, auditChecks.interviewAuditChecks));
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
            allAudits.push(...auditChecks.runHouseholdAuditChecks(householdContext, auditChecks.householdAuditChecks));
        }

        // Audit home
        if (surveyObjectsWithAudits.home && surveyObjectsWithAudits.household) {
            const homeContext: auditChecks.HomeAuditCheckContext = {
                home: surveyObjectsWithAudits.home,
                household: surveyObjectsWithAudits.household,
                interview: surveyObjectsWithAudits.interview
            };
            allAudits.push(...auditChecks.runHomeAuditChecks(homeContext, auditChecks.homeAuditChecks));
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
                allAudits.push(...auditChecks.runPersonAuditChecks(personContext, auditChecks.personAuditChecks));

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
                        allAudits.push(
                            ...auditChecks.runJourneyAuditChecks(journeyContext, auditChecks.journeyAuditChecks)
                        );

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
                                allAudits.push(
                                    ...auditChecks.runVisitedPlaceAuditChecks(
                                        visitedPlaceContext,
                                        auditChecks.visitedPlaceAuditChecks
                                    )
                                );
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
                                allAudits.push(
                                    ...auditChecks.runTripAuditChecks(tripContext, auditChecks.tripAuditChecks)
                                );

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
                                        allAudits.push(
                                            ...auditChecks.runSegmentAuditChecks(
                                                segmentContext,
                                                auditChecks.segmentAuditChecks
                                            )
                                        );
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
