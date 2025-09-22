/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { SurveyObjectsWithAudits, AuditForObject, AuditsByObject } from 'evolution-common/lib/services/audits/types';
import { Home } from 'evolution-common/lib/services/baseObjects/Home';
import { Household } from 'evolution-common/lib/services/baseObjects/Household';
import { Interview } from 'evolution-common/lib/services/baseObjects/interview/Interview';

/**
 * Utility class to unserialize survey objects from their serialized form
 * This is used when receiving surveyObjectsAndAudits from the backend
 */
export class SurveyObjectsUnserializer {
    /**
     * Unserialize surveyObjectsAndAudits from the backend
     * @param serializedData - The serialized SurveyObjectsWithAudits data
     * @returns Unserialized SurveyObjectsWithAudits with proper object instances
     */
    static unserialize(serializedData: unknown): SurveyObjectsWithAudits | undefined {
        if (!serializedData) {
            return undefined;
        }

        try {
            const data = serializedData as Record<string, unknown>;
            const result: SurveyObjectsWithAudits = {
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
                interview: undefined,
                household: undefined,
                home: undefined
            };

            // Unserialize Interview - now using Interview.unserialize method
            if (data.interview) {
                try {
                    const interviewData = data.interview as Record<string, unknown>;
                    result.interview = Interview.unserialize(interviewData);
                } catch (error) {
                    console.warn('Failed to unserialize interview:', error);
                }
            }

            // Unserialize Home - this will handle any nested Place objects
            if (data.home) {
                try {
                    result.home = Home.unserialize(data.home as Record<string, unknown>);
                } catch (error) {
                    console.warn('Failed to unserialize home:', error);
                }
            }

            // Unserialize Household - this will automatically handle all nested objects:
            // - members (persons) -> journeys -> visitedPlaces, trips -> segments
            if (data.household) {
                try {
                    const householdData = data.household as Record<string, unknown>;
                    console.log('🔍 Household data before unserialization:', {
                        hasMembers: !!householdData.members,
                        membersType: Array.isArray(householdData.members) ? 'array' : typeof householdData.members,
                        membersLength: Array.isArray(householdData.members) ? householdData.members.length : 'N/A',
                        householdKeys: Object.keys(householdData)
                    });

                    result.household = Household.unserialize(householdData);

                    console.log('✅ Household after unserialization:', {
                        hasMembers: !!result.household.members,
                        membersLength: result.household.members?.length || 0,
                        householdUuid: result.household._uuid
                    });
                } catch (error) {
                    console.warn('Failed to unserialize household:', error);
                }
            }

            return result;
        } catch (error) {
            console.error('Failed to unserialize surveyObjectsAndAudits:', error);
            return undefined;
        }
    }

    /**
     * Check if surveyObjectsAndAudits data is present and valid
     * @param data - The data to check
     * @returns boolean indicating if data is present
     */
    static hasValidData(data: unknown): boolean {
        if (!data || typeof data !== 'object') {
            return false;
        }
        const obj = data as Record<string, unknown>;
        return !!(obj.interview || obj.household || obj.home || (Array.isArray(obj.audits) && obj.audits.length > 0));
    }
}
