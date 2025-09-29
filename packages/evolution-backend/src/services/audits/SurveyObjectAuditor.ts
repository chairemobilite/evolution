/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { AuditForObject, SurveyObjectsWithAudits } from 'evolution-common/lib/services/audits/types';
import { InterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import {
    InterviewAuditCheckContext,
    HouseholdAuditCheckContext,
    VisitedPlaceAuditCheckContext,
    SegmentAuditCheckContext,
    runInterviewAuditChecks,
    runHouseholdAuditChecks,
    runVisitedPlaceAuditChecks,
    runSegmentAuditChecks,
    interviewAuditChecks,
    householdAuditChecks,
    visitedPlaceAuditChecks,
    segmentAuditChecks,
    runHomeAuditChecks,
    homeAuditChecks,
    HomeAuditCheckContext,
    runPersonAuditChecks,
    personAuditChecks,
    PersonAuditCheckContext,
    JourneyAuditCheckContext,
    runJourneyAuditChecks,
    journeyAuditChecks,
    runTripAuditChecks,
    tripAuditChecks,
    TripAuditCheckContext
} from './auditChecks';

/**
 * Central orchestrator for running all survey object audits
 */
export class SurveyObjectAuditor {
    /**
     * Run audits on all survey objects
     */
    static auditSurveyObjects(
        surveyObjectsWithAudits: SurveyObjectsWithAudits,
        interviewAttributes: InterviewAttributes
    ): AuditForObject[] {
        const allAudits: AuditForObject[] = [];

        // Run interview audit checks
        if (surveyObjectsWithAudits.interview) {
            const interviewContext: InterviewAuditCheckContext = {
                interview: surveyObjectsWithAudits.interview,
                interviewAttributes
            };
            allAudits.push(...runInterviewAuditChecks(interviewContext, interviewAuditChecks));
        } else {
            console.warn('Interview not found or invalid, skipping survey objects audit checks');
            return allAudits;
        }

        // Run household audit checks
        if (surveyObjectsWithAudits.household) {
            const householdContext: HouseholdAuditCheckContext = {
                household: surveyObjectsWithAudits.household,
                interview: surveyObjectsWithAudits.interview,
                interviewAttributes
            };
            allAudits.push(...runHouseholdAuditChecks(householdContext, householdAuditChecks));
        }

        // Audit home
        if (surveyObjectsWithAudits.home && surveyObjectsWithAudits.household) {
            const homeContext: HomeAuditCheckContext = {
                home: surveyObjectsWithAudits.home,
                household: surveyObjectsWithAudits.household,
                interview: surveyObjectsWithAudits.interview,
                interviewAttributes
            };
            allAudits.push(...runHomeAuditChecks(homeContext, homeAuditChecks));
        }

        // Audit persons and their nested objects
        if (surveyObjectsWithAudits.household?.members) {
            for (const person of surveyObjectsWithAudits.household.members) {
                const personContext: PersonAuditCheckContext = {
                    person,
                    household: surveyObjectsWithAudits.household,
                    home: surveyObjectsWithAudits.home,
                    interview: surveyObjectsWithAudits.interview,
                    interviewAttributes
                };
                allAudits.push(...runPersonAuditChecks(personContext, personAuditChecks));

                // Audit journeys for this person
                if (person.journeys) {
                    for (const journey of person.journeys) {
                        const journeyContext: JourneyAuditCheckContext = {
                            journey,
                            person,
                            household: surveyObjectsWithAudits.household,
                            home: surveyObjectsWithAudits.home,
                            interview: surveyObjectsWithAudits.interview,
                            interviewAttributes
                        };
                        allAudits.push(...runJourneyAuditChecks(journeyContext, journeyAuditChecks));

                        // Run visited place audit checks for this journey
                        if (journey.visitedPlaces) {
                            for (const visitedPlace of journey.visitedPlaces) {
                                const visitedPlaceContext: VisitedPlaceAuditCheckContext = {
                                    visitedPlace,
                                    person,
                                    journey,
                                    household: surveyObjectsWithAudits.household,
                                    home: surveyObjectsWithAudits.home,
                                    interview: surveyObjectsWithAudits.interview,
                                    interviewAttributes
                                };
                                allAudits.push(
                                    ...runVisitedPlaceAuditChecks(visitedPlaceContext, visitedPlaceAuditChecks)
                                );
                            }
                        }

                        // Audit trips for this journey
                        if (journey.trips) {
                            for (const trip of journey.trips) {
                                const tripContext: TripAuditCheckContext = {
                                    trip,
                                    person,
                                    journey,
                                    household: surveyObjectsWithAudits.household,
                                    home: surveyObjectsWithAudits.home,
                                    interview: surveyObjectsWithAudits.interview,
                                    interviewAttributes
                                };
                                allAudits.push(...runTripAuditChecks(tripContext, tripAuditChecks));

                                // Run segment audit checks for this trip
                                if (trip.segments) {
                                    for (const segment of trip.segments) {
                                        const segmentContext: SegmentAuditCheckContext = {
                                            segment,
                                            trip,
                                            person,
                                            journey,
                                            household: surveyObjectsWithAudits.household,
                                            home: surveyObjectsWithAudits.home,
                                            interview: surveyObjectsWithAudits.interview,
                                            interviewAttributes
                                        };
                                        allAudits.push(...runSegmentAuditChecks(segmentContext, segmentAuditChecks));
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
