/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { SurveyObjectsWithAudits, AuditForObject, AuditsByObject } from 'evolution-common/lib/services/audits/types';
import {
    ReviewDecision,
    ReviewDecisionsByObject,
    ReviewDecisionStatusByObject,
    SurveyObjectsWithAuditsAndReviewDecisions
} from 'evolution-common/lib/services/reviews/types';
import { Home } from 'evolution-common/lib/services/baseObjects/Home';
import { Household } from 'evolution-common/lib/services/baseObjects/Household';
import { Interview } from 'evolution-common/lib/services/baseObjects/interview/Interview';
import { SurveyObjectsRegistry } from 'evolution-common/lib/services/baseObjects/SurveyObjectsRegistry';

/** Shared empty uuid-keyed buckets for grouped review maps. */
const emptyUuidKeyedGroupedReviewBuckets = () => ({
    persons: {},
    journeys: {},
    visitedPlaces: {},
    trips: {},
    segments: {},
    organizations: {},
    vehicles: {},
    tripChains: {},
    junctions: {},
    workPlaces: {},
    schoolPlaces: {}
});

const emptyReviewDecisionsByObject = (): ReviewDecisionsByObject => ({
    interview: [],
    household: [],
    home: [],
    ...emptyUuidKeyedGroupedReviewBuckets()
});

const emptyReviewDecisionStatusByObject = (): ReviewDecisionStatusByObject => emptyUuidKeyedGroupedReviewBuckets();

const mergeWithDefaultGroupedReviewBuckets = <T extends Record<string, unknown>>(
    createDefaults: () => T,
    incoming: Partial<T> | undefined
): T => {
    const defaults = createDefaults();
    if (!incoming) {
        return defaults;
    }

    const merged = { ...defaults, ...incoming } as T;
    for (const key of Object.keys(defaults)) {
        const defaultValue = defaults[key];
        const incomingValue = incoming[key];
        if (
            defaultValue &&
            typeof defaultValue === 'object' &&
            !Array.isArray(defaultValue) &&
            incomingValue &&
            typeof incomingValue === 'object' &&
            !Array.isArray(incomingValue)
        ) {
            (merged as Record<string, unknown>)[key] = { ...defaultValue, ...incomingValue };
        }
    }

    return merged;
};

/**
 * Utility class to unserialize survey objects from their serialized form
 * This is used when receiving surveyObjectsAndAuditsAndReviewDecisions from the backend
 */
export class SurveyObjectsUnserializer {
    /**
     * Unserialize surveyObjectsAndAuditsAndReviewDecisions from the backend
     * @param serializedData - The serialized survey objects payload from the backend
     * @returns Unserialized survey objects with proper object instances
     */
    static unserialize(serializedData: unknown): SurveyObjectsWithAuditsAndReviewDecisions | undefined {
        if (!serializedData) {
            return undefined;
        }

        // clear first, especially when dealing with mulitple interviews,
        // otherwise the registry will fill out with previous interview objects
        const registry = new SurveyObjectsRegistry();

        try {
            const data = serializedData as Record<string, unknown>;
            const result: SurveyObjectsWithAuditsAndReviewDecisions = {
                audits: (data.audits as AuditForObject[]) || [],
                auditsByObject: (data.auditsByObject as AuditsByObject) || {
                    interview: [],
                    household: [],
                    home: [],
                    persons: {},
                    journeys: {},
                    visitedPlaces: {},
                    trips: {},
                    segments: {}
                },
                reviewDecisions: (data.reviewDecisions as ReviewDecision[]) || [],
                reviewDecisionsByObject: mergeWithDefaultGroupedReviewBuckets(
                    emptyReviewDecisionsByObject,
                    data.reviewDecisionsByObject as ReviewDecisionsByObject | undefined
                ),
                reviewDecisionStatusByObject: mergeWithDefaultGroupedReviewBuckets(
                    emptyReviewDecisionStatusByObject,
                    data.reviewDecisionStatusByObject as ReviewDecisionStatusByObject | undefined
                ),
                interview: undefined,
                household: undefined,
                home: undefined
            };

            // Unserialize Interview - now using Interview.unserialize method
            if (data.interview) {
                try {
                    const interviewData = data.interview as Record<string, unknown>;
                    result.interview = Interview.unserialize(interviewData, registry);
                } catch (error) {
                    console.error('Failed to unserialize interview:', error);
                }
            }

            // Unserialize Home - this will handle any nested Place objects
            if (data.home) {
                try {
                    result.home = Home.unserialize(data.home as Record<string, unknown>, registry);
                } catch (error) {
                    console.error('Failed to unserialize home:', error);
                }
            }

            // Unserialize Household - this will automatically handle all nested objects:
            // - members (persons) -> journeys -> visitedPlaces, trips -> segments
            if (data.household) {
                try {
                    const householdData = data.household as Record<string, unknown>;
                    result.household = Household.unserialize(householdData, registry);
                } catch (error) {
                    console.error('Failed to unserialize household:', error);
                }
            }

            return result;
        } catch (error) {
            console.error('Failed to unserialize surveyObjectsAndAuditsAndReviewDecisions:', error);
            return undefined;
        }
    }

    /**
     * Check if surveyObjectsAndAuditsAndReviewDecisions data is present and valid
     * @param data - The data to check
     * @returns boolean indicating if data is present
     */
    static hasValidData(data: unknown): boolean {
        if (!data || typeof data !== 'object') {
            return false;
        }
        const obj = data as Record<string, unknown>;
        return !!(
            obj.interview ||
            obj.household ||
            obj.home ||
            (Array.isArray(obj.audits) && obj.audits.length > 0) ||
            (Array.isArray(obj.reviewDecisions) && obj.reviewDecisions.length > 0)
        );
    }

    /**
     * Set up parent-child UUID relationships for unserialized objects
     * Note: Objects register themselves in the registry via their constructors
     * @param surveyObjects - The unserialized survey objects
     */
    private static registerObjectsInRegistry(surveyObjects: SurveyObjectsWithAudits): void {
        // Set up household parent UUIDs
        if (surveyObjects.household) {
            if (surveyObjects.interview) {
                surveyObjects.household.interviewUuid = surveyObjects.interview._uuid;
            }
            if (surveyObjects.home) {
                surveyObjects.household.homeUuid = surveyObjects.home._uuid;
            }

            // Set up person parent UUIDs
            if (surveyObjects.household.members) {
                for (const person of surveyObjects.household.members) {
                    person.householdUuid = surveyObjects.household._uuid;

                    // Set up journey parent UUIDs
                    if (person.journeys) {
                        for (const journey of person.journeys) {
                            journey.personUuid = person._uuid;

                            // Set up visited place parent UUIDs
                            if (journey.visitedPlaces) {
                                for (const visitedPlace of journey.visitedPlaces) {
                                    visitedPlace.journeyUuid = journey._uuid;
                                }
                            }

                            // Set up trip parent UUIDs
                            if (journey.trips) {
                                for (const trip of journey.trips) {
                                    trip.journeyUuid = journey._uuid;

                                    // Set up segment parent UUIDs
                                    if (trip.segments) {
                                        for (const segment of trip.segments) {
                                            segment.tripUuid = trip._uuid;
                                        }
                                    }

                                    // Set up junction parent UUIDs
                                    if (trip.junctions) {
                                        for (const junction of trip.junctions) {
                                            junction.tripUuid = trip._uuid;
                                        }
                                    }
                                }
                            }

                            // Set up trip chain parent UUIDs
                            if (journey.tripChains) {
                                for (const tripChain of journey.tripChains) {
                                    tripChain.journeyUuid = journey._uuid;
                                }
                            }
                        }
                    }

                    // Set up vehicle parent UUIDs
                    if (person.vehicles) {
                        for (const vehicle of person.vehicles) {
                            vehicle.ownerUuid = person._uuid;
                        }
                    }
                }
            }
        }
    }
}
