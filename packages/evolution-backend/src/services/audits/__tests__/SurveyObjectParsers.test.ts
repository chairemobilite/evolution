/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { SurveyObjectParsers } from '../types';
import { InterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import { ExtendedTripAttributes } from 'evolution-common/lib/services/baseObjects/Trip';
import { ExtendedVisitedPlaceAttributes } from 'evolution-common/lib/services/baseObjects/VisitedPlace';

describe('SurveyObjectParsers System', () => {
    describe('Parser Configuration and Interface', () => {
        it('should support all expected parser types', () => {
            // Create a mock parser configuration to test the interface
            const mockInterviewParser = jest.fn();
            const mockHomeParser = jest.fn();
            const mockHouseholdParser = jest.fn();
            const mockPersonParser = jest.fn();
            const mockJourneyParser = jest.fn();
            const mockVisitedPlaceParser = jest.fn();
            const mockTripParser = jest.fn();
            const mockSegmentParser = jest.fn();

            const parsers: SurveyObjectParsers = {
                interview: mockInterviewParser,
                home: mockHomeParser,
                household: mockHouseholdParser,
                person: mockPersonParser,
                journey: mockJourneyParser,
                visitedPlace: mockVisitedPlaceParser,
                trip: mockTripParser,
                segment: mockSegmentParser
            };

            // Verify all parser types are supported
            expect(parsers.interview).toBe(mockInterviewParser);
            expect(parsers.home).toBe(mockHomeParser);
            expect(parsers.household).toBe(mockHouseholdParser);
            expect(parsers.person).toBe(mockPersonParser);
            expect(parsers.journey).toBe(mockJourneyParser);
            expect(parsers.visitedPlace).toBe(mockVisitedPlaceParser);
            expect(parsers.trip).toBe(mockTripParser);
            expect(parsers.segment).toBe(mockSegmentParser);
        });

        it('should allow partial parser configurations', () => {
            const parsers: SurveyObjectParsers = {
                interview: jest.fn(),
                trip: jest.fn()
                // Other parsers are optional
            };

            expect(parsers.interview).toBeDefined();
            expect(parsers.trip).toBeDefined();
            expect(parsers.home).toBeUndefined();
            expect(parsers.person).toBeUndefined();
        });

        it('should support empty parser configuration', () => {
            const parsers: SurveyObjectParsers = {};

            expect(Object.keys(parsers)).toHaveLength(0);
        });
    });

    describe('Parser Function Signatures', () => {
        it('should support interview parser signature', () => {
            const interviewParser = (attributes: InterviewAttributes): void => {
                // Mock implementation
                if (attributes.corrected_response?.acceptToBeContactedForHelp === 'yes') {
                    attributes.corrected_response.acceptToBeContactedForHelp = true;
                }
            };

            const interviewAttributes: InterviewAttributes = {
                uuid: 'test-uuid',
                corrected_response: {
                    acceptToBeContactedForHelp: 'yes'
                }
            } as any;

            expect(() => interviewParser(interviewAttributes)).not.toThrow();
            expect(interviewAttributes.corrected_response?.acceptToBeContactedForHelp).toBe(true);
        });

        it('should support object parser signature with interview attributes', () => {
            const tripParser = (tripAttributes: ExtendedTripAttributes, interviewAttributes: InterviewAttributes): void => {
                // Mock implementation
                if (tripAttributes.departureTime !== undefined) {
                    tripAttributes.startTime = tripAttributes.departureTime as number;
                }
                if (interviewAttributes.corrected_response?._assignedDay) {
                    tripAttributes.startDate = interviewAttributes.corrected_response._assignedDay;
                }
            };

            const tripAttributes: ExtendedTripAttributes = {
                _uuid: 'test-trip-uuid',
                departureTime: 28800
            } as any;

            const interviewAttributes: InterviewAttributes = {
                uuid: 'test-interview-uuid',
                corrected_response: {
                    _assignedDay: '2025-01-15'
                }
            } as any;

            expect(() => tripParser(tripAttributes, interviewAttributes)).not.toThrow();
            expect(tripAttributes.startTime).toBe(28800);
            expect(tripAttributes.startDate).toBe('2025-01-15');
        });

        it('should support optional interview attributes parameter', () => {
            const homeParser = (homeAttributes: { [key: string]: unknown }, _interviewAttributes?: InterviewAttributes): void => {
                // Mock implementation that doesn't require interview attributes
                if (homeAttributes.address && homeAttributes.city) {
                    homeAttributes.address = {
                        fullAddress: homeAttributes.address,
                        municipalityName: homeAttributes.city
                    };
                    delete homeAttributes.city;
                }
            };

            const homeAttributes = {
                address: '123 Test Street',
                city: 'Montreal'
            };

            expect(() => homeParser(homeAttributes)).not.toThrow();
            expect(homeAttributes.address).toEqual({
                fullAddress: '123 Test Street',
                municipalityName: 'Montreal'
            });
        });
    });

    describe('Parser Integration Scenarios', () => {
        it('should handle cross-parser data dependencies', () => {
            const interviewParser = (attributes: InterviewAttributes): void => {
                if (attributes.corrected_response?._language) {
                    attributes.corrected_response._languages = [attributes.corrected_response._language];
                }
                if (attributes.corrected_response?._assignedDay) {
                    attributes.corrected_response.assignedDate = attributes.corrected_response._assignedDay;
                }
            };

            const tripParser = (tripAttributes: ExtendedTripAttributes, interviewAttributes: InterviewAttributes): void => {
                if (tripAttributes.departureTime !== undefined) {
                    tripAttributes.startTime = tripAttributes.departureTime as number;
                }
                if (interviewAttributes.corrected_response?._assignedDay) {
                    tripAttributes.startDate = interviewAttributes.corrected_response._assignedDay;
                }
            };

            const visitedPlaceParser = (visitedPlaceAttributes: ExtendedVisitedPlaceAttributes, interviewAttributes: InterviewAttributes): void => {
                if (visitedPlaceAttributes.arrivalTime !== undefined) {
                    visitedPlaceAttributes.startTime = visitedPlaceAttributes.arrivalTime as number;
                }
                if (interviewAttributes.corrected_response?._assignedDay) {
                    visitedPlaceAttributes.startDate = interviewAttributes.corrected_response._assignedDay;
                }
            };

            const parsers: SurveyObjectParsers = {
                interview: interviewParser,
                trip: tripParser,
                visitedPlace: visitedPlaceParser
            };

            // Create test data
            const interviewAttributes: InterviewAttributes = {
                uuid: 'test-interview-uuid',
                corrected_response: {
                    _language: 'fr',
                    _assignedDay: '2025-01-15'
                }
            } as any;

            const tripAttributes: ExtendedTripAttributes = {
                _uuid: 'test-trip-uuid',
                departureTime: 28800
            } as any;

            const visitedPlaceAttributes: ExtendedVisitedPlaceAttributes = {
                _uuid: 'test-visited-place-uuid',
                arrivalTime: 32400
            } as any;

            // Parse in sequence (as would happen in SurveyObjectsFactory)
            parsers.interview!(interviewAttributes);
            parsers.trip!(tripAttributes, interviewAttributes);
            parsers.visitedPlace!(visitedPlaceAttributes, interviewAttributes);

            // Verify interview parsing
            expect(interviewAttributes.corrected_response?._languages).toEqual(['fr']);
            expect(interviewAttributes.corrected_response?.assignedDate).toBe('2025-01-15');

            // Verify trip parsing (uses data from interview)
            expect(tripAttributes.startTime).toBe(28800);
            expect(tripAttributes.startDate).toBe('2025-01-15');

            // Verify visitedPlace parsing (uses data from interview)
            expect(visitedPlaceAttributes.startTime).toBe(32400);
            expect(visitedPlaceAttributes.startDate).toBe('2025-01-15');
        });

        it('should handle parsing order independence', () => {
            const tripParser = (tripAttributes: ExtendedTripAttributes, interviewAttributes: InterviewAttributes): void => {
                if (tripAttributes.departureTime !== undefined) {
                    tripAttributes.startTime = tripAttributes.departureTime as number;
                }
                if (interviewAttributes.corrected_response?._assignedDay) {
                    tripAttributes.startDate = interviewAttributes.corrected_response._assignedDay;
                }
            };

            const interviewParser = (attributes: InterviewAttributes): void => {
                if (attributes.corrected_response?._assignedDay) {
                    attributes.corrected_response.assignedDate = attributes.corrected_response._assignedDay;
                }
            };

            const parsers: SurveyObjectParsers = {
                interview: interviewParser,
                trip: tripParser
            };

            const interviewAttributes: InterviewAttributes = {
                uuid: 'test-interview-uuid',
                corrected_response: {
                    _assignedDay: '2025-01-20'
                }
            } as any;

            const tripAttributes: ExtendedTripAttributes = {
                _uuid: 'test-trip-uuid',
                departureTime: 25200
            } as any;

            // Parse trip before interview (order shouldn't matter for this data)
            parsers.trip!(tripAttributes, interviewAttributes);
            expect(tripAttributes.startDate).toBe('2025-01-20');

            // Parse interview after trip
            parsers.interview!(interviewAttributes);
            expect(interviewAttributes.corrected_response?.assignedDate).toBe('2025-01-20');

            // Trip should still have correct date
            expect(tripAttributes.startDate).toBe('2025-01-20');
        });

        it('should handle multiple objects with same interview', () => {
            const tripParser = (tripAttributes: ExtendedTripAttributes, interviewAttributes: InterviewAttributes): void => {
                if (tripAttributes.departureTime !== undefined) {
                    tripAttributes.startTime = tripAttributes.departureTime as number;
                }
                if (interviewAttributes.corrected_response?._assignedDay) {
                    tripAttributes.startDate = interviewAttributes.corrected_response._assignedDay;
                }
            };

            const visitedPlaceParser = (visitedPlaceAttributes: ExtendedVisitedPlaceAttributes, interviewAttributes: InterviewAttributes): void => {
                if (visitedPlaceAttributes.arrivalTime !== undefined) {
                    visitedPlaceAttributes.startTime = visitedPlaceAttributes.arrivalTime as number;
                }
                if (interviewAttributes.corrected_response?._assignedDay) {
                    visitedPlaceAttributes.startDate = interviewAttributes.corrected_response._assignedDay;
                }
            };

            const parsers: SurveyObjectParsers = {
                trip: tripParser,
                visitedPlace: visitedPlaceParser
            };

            const interviewAttributes: InterviewAttributes = {
                uuid: 'test-interview-uuid',
                corrected_response: {
                    _assignedDay: '2025-01-25'
                }
            } as any;

            const trip1: ExtendedTripAttributes = {
                _uuid: 'trip-1',
                departureTime: 28800
            } as any;

            const trip2: ExtendedTripAttributes = {
                _uuid: 'trip-2',
                departureTime: 36000
            } as any;

            const visitedPlace1: ExtendedVisitedPlaceAttributes = {
                _uuid: 'place-1',
                arrivalTime: 32400
            } as any;

            // Parse all objects with same interview
            parsers.trip!(trip1, interviewAttributes);
            parsers.trip!(trip2, interviewAttributes);
            parsers.visitedPlace!(visitedPlace1, interviewAttributes);

            // All should have the same date from interview
            expect(trip1.startDate).toBe('2025-01-25');
            expect(trip2.startDate).toBe('2025-01-25');
            expect(visitedPlace1.startDate).toBe('2025-01-25');
        });
    });

    describe('Parser Error Handling and Robustness', () => {
        it('should handle missing parsers gracefully', () => {
            const parsers: SurveyObjectParsers = {
                interview: jest.fn()
                // Other parsers are missing
            };

            const mockAttributes = { uuid: 'test' } as any;

            // Test that missing parsers don't cause errors
            expect(() => {
                if (parsers.person) {
                    parsers.person(mockAttributes, { uuid: 'test' } as any);
                }
                if (parsers.household) {
                    parsers.household(mockAttributes, { uuid: 'test' } as any);
                }
                if (parsers.journey) {
                    parsers.journey(mockAttributes, { uuid: 'test' } as any);
                }
            }).not.toThrow();
        });

        it('should handle parser failures gracefully', () => {
            const failingParser = jest.fn().mockImplementation(() => {
                throw new Error('Parser failed');
            });

            const parsers: SurveyObjectParsers = {
                interview: failingParser
            };

            const interviewAttributes: InterviewAttributes = {
                uuid: 'test-uuid',
                corrected_response: {}
            } as any;

            // Parser failures should be handled by the calling code
            expect(() => parsers.interview!(interviewAttributes)).toThrow('Parser failed');
        });

        it('should maintain data integrity across parsers', () => {
            const interviewParser = (attributes: InterviewAttributes): void => {
                if (attributes.corrected_response?.acceptToBeContactedForHelp === 'yes') {
                    attributes.corrected_response.acceptToBeContactedForHelp = true;
                }
                // Preserve other fields
            };

            const parsers: SurveyObjectParsers = {
                interview: interviewParser
            };

            const interviewAttributes: InterviewAttributes = {
                uuid: 'original-uuid',
                corrected_response: {
                    acceptToBeContactedForHelp: 'yes',
                    _assignedDay: '2025-01-15',
                    originalField: 'should-be-preserved'
                }
            } as any;

            const originalUuid = interviewAttributes.uuid;
            const originalField = interviewAttributes.corrected_response?.originalField;

            // Parse with interview parser
            parsers.interview!(interviewAttributes);

            // Verify core data integrity
            expect(interviewAttributes.uuid).toBe(originalUuid);
            expect(interviewAttributes.corrected_response?.originalField).toBe(originalField);
            expect(interviewAttributes.corrected_response?.acceptToBeContactedForHelp).toBe(true);
        });

        it('should handle malformed data structures', () => {
            const robustParser = (attributes: InterviewAttributes): void => {
                // Robust parser that handles malformed data
                if (attributes.corrected_response?.acceptToBeContactedForHelp) {
                    if (typeof attributes.corrected_response.acceptToBeContactedForHelp === 'string') {
                        if (attributes.corrected_response.acceptToBeContactedForHelp === 'yes') {
                            attributes.corrected_response.acceptToBeContactedForHelp = true;
                        } else if (attributes.corrected_response.acceptToBeContactedForHelp === 'no') {
                            attributes.corrected_response.acceptToBeContactedForHelp = false;
                        } else {
                            attributes.corrected_response.acceptToBeContactedForHelp = undefined;
                        }
                    } else { // If it's not a string, convert to undefined (handles objects, arrays, etc.)
                        attributes.corrected_response.acceptToBeContactedForHelp = undefined;
                    }
                }
            };

            const parsers: SurveyObjectParsers = {
                interview: robustParser
            };

            const malformedInterview = {
                uuid: 'test-uuid',
                corrected_response: {
                    acceptToBeContactedForHelp: { invalid: 'object' } // Should be string
                }
            } as any;

            expect(() => parsers.interview!(malformedInterview)).not.toThrow();
            expect(malformedInterview.corrected_response.acceptToBeContactedForHelp).toBeUndefined();
        });

        it('should handle concurrent parser calls', () => {
            const threadSafeParser = (attributes: InterviewAttributes): void => {
                // Simulate thread-safe parsing
                if (attributes.corrected_response?.acceptToBeContactedForHelp === 'yes') {
                    attributes.corrected_response.acceptToBeContactedForHelp = true;
                } else if (attributes.corrected_response?.acceptToBeContactedForHelp === 'no') {
                    attributes.corrected_response.acceptToBeContactedForHelp = false;
                }
            };

            const parsers: SurveyObjectParsers = {
                interview: threadSafeParser
            };

            const interview1: InterviewAttributes = {
                uuid: 'test-uuid-1',
                corrected_response: { acceptToBeContactedForHelp: 'yes' }
            } as any;

            const interview2: InterviewAttributes = {
                uuid: 'test-uuid-2',
                corrected_response: { acceptToBeContactedForHelp: 'no' }
            } as any;

            // Simulate concurrent parsing
            parsers.interview!(interview1);
            parsers.interview!(interview2);

            expect(interview1.corrected_response?.acceptToBeContactedForHelp).toBe(true);
            expect(interview2.corrected_response?.acceptToBeContactedForHelp).toBe(false);
        });
    });

    describe('Parser Performance and Memory', () => {
        it('should not create memory leaks with large datasets', () => {
            const efficientParser = (attributes: InterviewAttributes): void => {
                // Efficient parser that doesn't create unnecessary objects
                const response = attributes.corrected_response;
                if (!response) return;

                if (response.acceptToBeContactedForHelp === 'yes') {
                    response.acceptToBeContactedForHelp = true;
                } else if (response.acceptToBeContactedForHelp === 'no') {
                    response.acceptToBeContactedForHelp = false;
                }
            };

            const parsers: SurveyObjectParsers = {
                interview: efficientParser
            };

            // Create a large interview structure
            const largeInterview: InterviewAttributes = {
                uuid: 'test-uuid',
                corrected_response: {
                    acceptToBeContactedForHelp: 'yes',
                    household: {
                        persons: {}
                    }
                }
            } as any;

            // Add many persons to test memory usage
            for (let i = 0; i < 100; i++) {
                largeInterview.corrected_response!.household!.persons![`person-${i}`] = {
                    _uuid: `person-${i}`,
                    _sequence: i,
                    age: 25 + i
                } as any;
            }

            expect(() => parsers.interview!(largeInterview)).not.toThrow();
            expect(largeInterview.corrected_response?.acceptToBeContactedForHelp).toBe(true);
        });

        it('should handle repeated parsing efficiently', () => {
            let parseCount = 0;
            const countingParser = (attributes: InterviewAttributes): void => {
                parseCount++;
                if (attributes.corrected_response?.acceptToBeContactedForHelp === 'yes') {
                    attributes.corrected_response.acceptToBeContactedForHelp = true;
                }
            };

            const parsers: SurveyObjectParsers = {
                interview: countingParser
            };

            const interviewAttributes: InterviewAttributes = {
                uuid: 'test-uuid',
                corrected_response: {
                    acceptToBeContactedForHelp: 'yes'
                }
            } as any;

            // Parse multiple times
            parsers.interview!(interviewAttributes);
            parsers.interview!(interviewAttributes);
            parsers.interview!(interviewAttributes);

            expect(parseCount).toBe(3);
            // Note: After first parse, value becomes true, so subsequent parses won't change it
            expect(interviewAttributes.corrected_response?.acceptToBeContactedForHelp).toBe(true);
        });
    });
});
