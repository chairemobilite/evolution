/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { auditsArrayToAuditsByObject, auditArrayToAudits, auditsToAuditArray } from '../AuditUtils';
import { AuditForObject } from '../types';

describe('AuditUtils', () => {
    describe('auditsArrayToAuditsByObject', () => {
        const mockAudits: AuditForObject[] = [
            {
                version: 1,
                level: 'error',
                errorCode: 'INTERVIEW_001',
                message: 'Interview validation error',
                objectType: 'interview',
                objectUuid: 'interview-uuid-123'
            },
            {
                version: 1,
                level: 'warning',
                errorCode: 'HOME_001',
                message: 'Home validation warning',
                objectType: 'home',
                objectUuid: 'home-uuid-456'
            },
            {
                version: 1,
                level: 'error',
                errorCode: 'HOUSEHOLD_001',
                message: 'Household validation error',
                objectType: 'household',
                objectUuid: 'household-uuid-789'
            },
            {
                version: 1,
                level: 'info',
                errorCode: 'PERSON_001',
                message: 'Person validation info',
                objectType: 'person',
                objectUuid: 'person-uuid-111'
            },
            {
                version: 1,
                level: 'error',
                errorCode: 'PERSON_002',
                message: 'Another person validation error',
                objectType: 'person',
                objectUuid: 'person-uuid-222'
            },
            {
                version: 1,
                level: 'warning',
                errorCode: 'PERSON_003',
                message: 'Same person different error',
                objectType: 'person',
                objectUuid: 'person-uuid-111'
            },
            {
                version: 1,
                level: 'error',
                errorCode: 'JOURNEY_001',
                message: 'Journey validation error',
                objectType: 'journey',
                objectUuid: 'journey-uuid-333'
            },
            {
                version: 1,
                level: 'warning',
                errorCode: 'VISITED_PLACE_001',
                message: 'Visited place validation warning',
                objectType: 'visitedPlace',
                objectUuid: 'visited-place-uuid-444'
            },
            {
                version: 1,
                level: 'error',
                errorCode: 'TRIP_001',
                message: 'Trip validation error',
                objectType: 'trip',
                objectUuid: 'trip-uuid-555'
            },
            {
                version: 1,
                level: 'info',
                errorCode: 'SEGMENT_001',
                message: 'Segment validation info',
                objectType: 'segment',
                objectUuid: 'segment-uuid-666'
            }
        ];

        it('should convert audits array to AuditsByObject structure', () => {
            const result = auditsArrayToAuditsByObject(mockAudits);

            expect(result).toHaveProperty('interview');
            expect(result).toHaveProperty('household');
            expect(result).toHaveProperty('home');
            expect(result).toHaveProperty('persons');
            expect(result).toHaveProperty('journeys');
            expect(result).toHaveProperty('visitedPlaces');
            expect(result).toHaveProperty('trips');
            expect(result).toHaveProperty('segments');
        });

        it('should group interview audits correctly', () => {
            const result = auditsArrayToAuditsByObject(mockAudits);

            expect(result.interview).toHaveLength(1);
            expect(result.interview[0]).toEqual({
                version: 1,
                level: 'error',
                errorCode: 'INTERVIEW_001',
                message: 'Interview validation error',
                objectType: 'interview',
                objectUuid: 'interview-uuid-123'
            });
        });

        it('should group household audits correctly', () => {
            const result = auditsArrayToAuditsByObject(mockAudits);

            expect(result.household).toHaveLength(1);
            expect(result.household[0]).toEqual({
                version: 1,
                level: 'error',
                errorCode: 'HOUSEHOLD_001',
                message: 'Household validation error',
                objectType: 'household',
                objectUuid: 'household-uuid-789'
            });
        });

        it('should group home audits correctly', () => {
            const result = auditsArrayToAuditsByObject(mockAudits);

            expect(result.home).toHaveLength(1);
            expect(result.home[0]).toEqual({
                version: 1,
                level: 'warning',
                errorCode: 'HOME_001',
                message: 'Home validation warning',
                objectType: 'home',
                objectUuid: 'home-uuid-456'
            });
        });

        it('should group person audits by UUID', () => {
            const result = auditsArrayToAuditsByObject(mockAudits);

            expect(Object.keys(result.persons)).toHaveLength(2);
            expect(result.persons['person-uuid-111']).toHaveLength(2);
            expect(result.persons['person-uuid-222']).toHaveLength(1);

            // Check first person has both audits
            expect(result.persons['person-uuid-111']).toContainEqual({
                version: 1,
                level: 'info',
                errorCode: 'PERSON_001',
                message: 'Person validation info',
                objectType: 'person',
                objectUuid: 'person-uuid-111'
            });
            expect(result.persons['person-uuid-111']).toContainEqual({
                version: 1,
                level: 'warning',
                errorCode: 'PERSON_003',
                message: 'Same person different error',
                objectType: 'person',
                objectUuid: 'person-uuid-111'
            });

            // Check second person has one audit
            expect(result.persons['person-uuid-222']).toContainEqual({
                version: 1,
                level: 'error',
                errorCode: 'PERSON_002',
                message: 'Another person validation error',
                objectType: 'person',
                objectUuid: 'person-uuid-222'
            });
        });

        it('should group journey audits by UUID', () => {
            const result = auditsArrayToAuditsByObject(mockAudits);

            expect(Object.keys(result.journeys)).toHaveLength(1);
            expect(result.journeys['journey-uuid-333']).toHaveLength(1);
            expect(result.journeys['journey-uuid-333'][0]).toEqual({
                version: 1,
                level: 'error',
                errorCode: 'JOURNEY_001',
                message: 'Journey validation error',
                objectType: 'journey',
                objectUuid: 'journey-uuid-333'
            });
        });

        it('should group visited place audits by UUID', () => {
            const result = auditsArrayToAuditsByObject(mockAudits);

            expect(Object.keys(result.visitedPlaces)).toHaveLength(1);
            expect(result.visitedPlaces['visited-place-uuid-444']).toHaveLength(1);
            expect(result.visitedPlaces['visited-place-uuid-444'][0]).toEqual({
                version: 1,
                level: 'warning',
                errorCode: 'VISITED_PLACE_001',
                message: 'Visited place validation warning',
                objectType: 'visitedPlace',
                objectUuid: 'visited-place-uuid-444'
            });
        });

        it('should group trip audits by UUID', () => {
            const result = auditsArrayToAuditsByObject(mockAudits);

            expect(Object.keys(result.trips)).toHaveLength(1);
            expect(result.trips['trip-uuid-555']).toHaveLength(1);
            expect(result.trips['trip-uuid-555'][0]).toEqual({
                version: 1,
                level: 'error',
                errorCode: 'TRIP_001',
                message: 'Trip validation error',
                objectType: 'trip',
                objectUuid: 'trip-uuid-555'
            });
        });

        it('should group segment audits by UUID', () => {
            const result = auditsArrayToAuditsByObject(mockAudits);

            expect(Object.keys(result.segments)).toHaveLength(1);
            expect(result.segments['segment-uuid-666']).toHaveLength(1);
            expect(result.segments['segment-uuid-666'][0]).toEqual({
                version: 1,
                level: 'info',
                errorCode: 'SEGMENT_001',
                message: 'Segment validation info',
                objectType: 'segment',
                objectUuid: 'segment-uuid-666'
            });
        });

        it('should handle empty array', () => {
            const result = auditsArrayToAuditsByObject([]);

            expect(result.interview).toHaveLength(0);
            expect(result.household).toHaveLength(0);
            expect(result.home).toHaveLength(0);
            expect(Object.keys(result.persons)).toHaveLength(0);
            expect(Object.keys(result.journeys)).toHaveLength(0);
            expect(Object.keys(result.visitedPlaces)).toHaveLength(0);
            expect(Object.keys(result.trips)).toHaveLength(0);
            expect(Object.keys(result.segments)).toHaveLength(0);
        });

        it('should handle unknown object types', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            const auditsWithUnknown: AuditForObject[] = [
                {
                    version: 1,
                    level: 'error',
                    errorCode: 'UNKNOWN_001',
                    message: 'Unknown object type',
                    objectType: 'unknownType',
                    objectUuid: 'unknown-uuid-123'
                }
            ];

            const result = auditsArrayToAuditsByObject(auditsWithUnknown);

            expect(consoleSpy).toHaveBeenCalledWith('Unknown audit object type: unknownType');
            expect(result.interview).toHaveLength(0);
            expect(result.household).toHaveLength(0);
            expect(result.home).toHaveLength(0);
            expect(Object.keys(result.persons)).toHaveLength(0);
            expect(Object.keys(result.journeys)).toHaveLength(0);
            expect(Object.keys(result.visitedPlaces)).toHaveLength(0);
            expect(Object.keys(result.trips)).toHaveLength(0);
            expect(Object.keys(result.segments)).toHaveLength(0);

            consoleSpy.mockRestore();
        });

        it('should handle audits with optional properties', () => {
            const auditsWithOptionalProps: AuditForObject[] = [
                {
                    version: 1,
                    errorCode: 'MINIMAL_001',
                    objectType: 'interview',
                    objectUuid: 'interview-uuid-minimal'
                },
                {
                    version: 2,
                    level: 'info',
                    errorCode: 'FULL_001',
                    message: 'Full audit with all properties',
                    ignore: true,
                    objectType: 'person',
                    objectUuid: 'person-uuid-full'
                }
            ];

            const result = auditsArrayToAuditsByObject(auditsWithOptionalProps);

            expect(result.interview).toHaveLength(1);
            expect(result.interview[0]).toEqual({
                version: 1,
                errorCode: 'MINIMAL_001',
                objectType: 'interview',
                objectUuid: 'interview-uuid-minimal'
            });

            expect(result.persons['person-uuid-full']).toHaveLength(1);
            expect(result.persons['person-uuid-full'][0]).toEqual({
                version: 2,
                level: 'info',
                errorCode: 'FULL_001',
                message: 'Full audit with all properties',
                ignore: true,
                objectType: 'person',
                objectUuid: 'person-uuid-full'
            });
        });

        it('should maintain audit object integrity', () => {
            const originalAudit: AuditForObject = {
                version: 1,
                level: 'error',
                errorCode: 'INTEGRITY_001',
                message: 'Integrity test',
                ignore: false,
                objectType: 'person',
                objectUuid: 'person-uuid-integrity'
            };

            const result = auditsArrayToAuditsByObject([originalAudit]);

            expect(result.persons['person-uuid-integrity'][0]).toEqual(originalAudit);
            expect(result.persons['person-uuid-integrity'][0]).toBe(originalAudit); // Should be the same reference
        });
    });

    // Test existing functions to ensure they still work
    describe('existing functions', () => {
        it('should test auditArrayToAudits function', () => {
            const auditsArr: AuditForObject[] = [
                {
                    version: 1,
                    level: 'error',
                    errorCode: 'TEST_001',
                    message: 'Test audit',
                    objectType: 'interview',
                    objectUuid: 'interview-uuid-test'
                }
            ];

            const result = auditArrayToAudits(auditsArr);
            const objectKey = 'interview.interview-uuid-test';
            expect(result[objectKey]).toBeDefined();
            expect(result[objectKey]['TEST_001']).toBeDefined();
            expect(result[objectKey]['TEST_001']).toEqual({
                version: 1,
                level: 'error',
                errorCode: 'TEST_001',
                message: 'Test audit',
                ignore: undefined
            });
        });

        it('should test auditsToAuditArray function', () => {
            const audits = {
                TEST_001: {
                    version: 1,
                    level: 'error' as const,
                    errorCode: 'TEST_001',
                    message: 'Test audit'
                }
            };

            const objectData = {
                objectType: 'interview',
                objectUuid: 'interview-uuid-test'
            };

            const result = auditsToAuditArray(audits, objectData);
            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                version: 1,
                level: 'error',
                errorCode: 'TEST_001',
                message: 'Test audit',
                objectType: 'interview',
                objectUuid: 'interview-uuid-test'
            });
        });
    });
});
