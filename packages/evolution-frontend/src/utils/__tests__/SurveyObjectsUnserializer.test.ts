/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';

import { SurveyObjectsUnserializer } from '../SurveyObjectsUnserializer';
import { Home } from 'evolution-common/lib/services/baseObjects/Home';
import { Household } from 'evolution-common/lib/services/baseObjects/Household';
import { Interview } from 'evolution-common/lib/services/baseObjects/interview/Interview';
import { Person } from 'evolution-common/lib/services/baseObjects/Person';
import { Journey } from 'evolution-common/lib/services/baseObjects/Journey';
import { VisitedPlace } from 'evolution-common/lib/services/baseObjects/VisitedPlace';
import { Trip } from 'evolution-common/lib/services/baseObjects/Trip';
import { Segment } from 'evolution-common/lib/services/baseObjects/Segment';

describe('SurveyObjectsUnserializer', () => {
    describe('unserialize', () => {
        it('should return undefined for null or undefined data', () => {
            expect(SurveyObjectsUnserializer.unserialize(null)).toBeUndefined();
            expect(SurveyObjectsUnserializer.unserialize(undefined)).toBeUndefined();
        });

        it('should handle empty object', () => {
            const result = SurveyObjectsUnserializer.unserialize({});

            expect(result).toBeDefined();
            expect(result?.interview).toBeUndefined();
            expect(result?.household).toBeUndefined();
            expect(result?.home).toBeUndefined();
            expect(result?.audits).toEqual([]);
        });

        it('should unserialize interview', () => {
            const interviewUuid = uuidV4();
            const serializedData = {
                interview: {
                    _uuid: interviewUuid,
                    _isValid: true,
                    _responses: {},
                    _validations: {},
                    _isCompleted: false,
                    _isStarted: true,
                    _startedAt: new Date().toISOString(),
                    _activeSection: 'home'
                },
                audits: [],
                auditsByObject: {
                    interview: [],
                    household: [],
                    home: [],
                    persons: {},
                    journeys: {},
                    visitedPlaces: {},
                    trips: {},
                    segments: {}
                }
            };

            const result = SurveyObjectsUnserializer.unserialize(serializedData);

            expect(result).toBeDefined();
            expect(result?.interview).toBeInstanceOf(Interview);
            expect(result?.interview?._uuid).toBe(interviewUuid);
        });

        it('should unserialize home', () => {
            const homeUuid = uuidV4();
            const serializedData = {
                home: {
                    _uuid: homeUuid,
                    _isValid: true,
                    name: 'My Home',
                    geography: {
                        type: 'Feature',
                        geometry: {
                            type: 'Point',
                            coordinates: [-73.5, 45.5]
                        },
                        properties: {}
                    }
                },
                audits: []
            };

            const result = SurveyObjectsUnserializer.unserialize(serializedData);

            expect(result).toBeDefined();
            expect(result?.home).toBeInstanceOf(Home);
            expect(result?.home?._uuid).toBe(homeUuid);
            expect(result?.home?.name).toBe('My Home');
        });

        it('should unserialize household with nested members', () => {
            const householdUuid = uuidV4();
            const person1Uuid = uuidV4();
            const person2Uuid = uuidV4();

            const serializedData = {
                household: {
                    _uuid: householdUuid,
                    _isValid: true,
                    size: 2,
                    _members: [
                        {
                            _uuid: person1Uuid,
                            _sequence: 1,
                            age: 30,
                            _isValid: true
                        },
                        {
                            _uuid: person2Uuid,
                            _sequence: 2,
                            age: 25,
                            _isValid: true
                        }
                    ]
                },
                audits: []
            };

            const result = SurveyObjectsUnserializer.unserialize(serializedData);

            expect(result).toBeDefined();
            expect(result?.household).toBeInstanceOf(Household);
            expect(result?.household?._uuid).toBe(householdUuid);
            expect(result?.household?.members).toHaveLength(2);
            expect(result?.household?.members?.[0]).toBeInstanceOf(Person);
            expect(result?.household?.members?.[0]._uuid).toBe(person1Uuid);
            expect(result?.household?.members?.[1]).toBeInstanceOf(Person);
            expect(result?.household?.members?.[1]._uuid).toBe(person2Uuid);
        });

        it('should unserialize complete hierarchy: household > persons > journeys > visitedPlaces and trips > segments', () => {
            const householdUuid = uuidV4();
            const personUuid = uuidV4();
            const journeyUuid = uuidV4();
            const visitedPlaceUuid = uuidV4();
            const tripUuid = uuidV4();
            const segmentUuid = uuidV4();

            const serializedData = {
                household: {
                    _uuid: householdUuid,
                    _isValid: true,
                    size: 1,
                    _members: [
                        {
                            _uuid: personUuid,
                            _sequence: 1,
                            age: 30,
                            _isValid: true,
                            _journeys: [
                                {
                                    _uuid: journeyUuid,
                                    _isValid: true,
                                    name: 'Daily Commute',
                                    _visitedPlaces: [
                                        {
                                            _uuid: visitedPlaceUuid,
                                            _sequence: 1,
                                            activity: 'work',
                                            _isValid: true
                                        }
                                    ],
                                    _trips: [
                                        {
                                            _uuid: tripUuid,
                                            _sequence: 1,
                                            _isValid: true,
                                            _segments: [
                                                {
                                                    _uuid: segmentUuid,
                                                    _sequence: 1,
                                                    mode: 'walk',
                                                    _isValid: true
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                },
                audits: []
            };

            const result = SurveyObjectsUnserializer.unserialize(serializedData);

            expect(result).toBeDefined();
            expect(result?.household).toBeInstanceOf(Household);

            // Check person
            const person = result?.household?.members?.[0];
            expect(person).toBeInstanceOf(Person);
            expect(person?._uuid).toBe(personUuid);

            // Check journey
            const journey = person?.journeys?.[0];
            expect(journey).toBeInstanceOf(Journey);
            expect(journey?._uuid).toBe(journeyUuid);

            // Check visited place
            const visitedPlace = journey?.visitedPlaces?.[0];
            expect(visitedPlace).toBeInstanceOf(VisitedPlace);
            expect(visitedPlace?._uuid).toBe(visitedPlaceUuid);

            // Check trip
            const trip = journey?.trips?.[0];
            expect(trip).toBeInstanceOf(Trip);
            expect(trip?._uuid).toBe(tripUuid);

            // Check segment
            const segment = trip?.segments?.[0];
            expect(segment).toBeInstanceOf(Segment);
            expect(segment?._uuid).toBe(segmentUuid);
        });

        it('should set up parent-child UUID relationships', () => {
            const interviewUuid = uuidV4();
            const homeUuid = uuidV4();
            const householdUuid = uuidV4();
            const personUuid = uuidV4();
            const journeyUuid = uuidV4();
            const visitedPlaceUuid = uuidV4();
            const tripUuid = uuidV4();
            const segmentUuid = uuidV4();

            const serializedData = {
                interview: {
                    _uuid: interviewUuid,
                    _isValid: true
                },
                home: {
                    _uuid: homeUuid,
                    _isValid: true,
                    _interviewUuid: interviewUuid
                },
                household: {
                    _uuid: householdUuid,
                    _isValid: true,
                    size: 1,
                    _interviewUuid: interviewUuid,
                    _homeUuid: homeUuid,
                    _members: [
                        {
                            _uuid: personUuid,
                            _sequence: 1,
                            age: 30,
                            _isValid: true,
                            _householdUuid: householdUuid,
                            _journeys: [
                                {
                                    _uuid: journeyUuid,
                                    _isValid: true,
                                    _personUuid: personUuid,
                                    _visitedPlaces: [
                                        {
                                            _uuid: visitedPlaceUuid,
                                            _sequence: 1,
                                            activity: 'home',
                                            _isValid: true,
                                            _journeyUuid: journeyUuid
                                        }
                                    ],
                                    _trips: [
                                        {
                                            _uuid: tripUuid,
                                            _sequence: 1,
                                            _isValid: true,
                                            _journeyUuid: journeyUuid,
                                            _segments: [
                                                {
                                                    _uuid: segmentUuid,
                                                    _sequence: 1,
                                                    mode: 'walk',
                                                    _isValid: true,
                                                    _tripUuid: tripUuid
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                },
                audits: []
            };

            const result = SurveyObjectsUnserializer.unserialize(serializedData);

            expect(result).toBeDefined();

            // Check household parent UUIDs
            expect(result?.household?.interviewUuid).toBe(interviewUuid);
            expect(result?.household?.homeUuid).toBe(homeUuid);

            // Check person parent UUID
            const person = result?.household?.members?.[0];
            expect(person?.householdUuid).toBe(householdUuid);

            // Check journey parent UUID
            const journey = person?.journeys?.[0];
            expect(journey?.personUuid).toBe(personUuid);

            // Check visited place parent UUID
            const visitedPlace = journey?.visitedPlaces?.[0];
            expect(visitedPlace?.journeyUuid).toBe(journeyUuid);

            // Check trip parent UUID
            const trip = journey?.trips?.[0];
            expect(trip?.journeyUuid).toBe(journeyUuid);

            // Check segment parent UUID
            const segment = trip?.segments?.[0];
            expect(segment?.tripUuid).toBe(tripUuid);
        });

        it('should unserialize audits', () => {
            const interviewUuid = uuidV4();
            const serializedData = {
                interview: {
                    _uuid: interviewUuid,
                    _isValid: true
                },
                audits: [
                    {
                        objectType: 'interview',
                        objectUuid: interviewUuid,
                        errorCode: 'I_M_StartedAt',
                        version: 1,
                        level: 'error',
                        message: 'Interview startedAt is missing',
                        ignore: false
                    }
                ],
                auditsByObject: {
                    interview: [
                        {
                            objectType: 'interview',
                            objectUuid: interviewUuid,
                            errorCode: 'I_M_StartedAt',
                            version: 1,
                            level: 'error',
                            message: 'Interview startedAt is missing',
                            ignore: false
                        }
                    ],
                    household: [],
                    home: [],
                    persons: {},
                    journeys: {},
                    visitedPlaces: {},
                    trips: {},
                    segments: {}
                }
            };

            const result = SurveyObjectsUnserializer.unserialize(serializedData);

            expect(result).toBeDefined();
            expect(result?.audits).toHaveLength(1);
            expect(result?.audits[0].errorCode).toBe('I_M_StartedAt');
            expect(result?.auditsByObject?.interview).toHaveLength(1);
        });

        it('should handle errors gracefully when unserializing fails', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            const invalidData = {
                interview: {
                    _uuid: 'invalid-uuid', // This might cause validation issues
                    _isValid: 'not-a-boolean' // Invalid type
                }
            };

            const result = SurveyObjectsUnserializer.unserialize(invalidData);

            // Should still return a result with default structure
            expect(result).toBeDefined();
            expect(consoleSpy).toHaveBeenCalled();

            consoleSpy.mockRestore();
        });

        it('should handle household without members', () => {
            const householdUuid = uuidV4();
            const serializedData = {
                household: {
                    _uuid: householdUuid,
                    _isValid: true,
                    size: 0
                },
                audits: []
            };

            const result = SurveyObjectsUnserializer.unserialize(serializedData);

            expect(result).toBeDefined();
            expect(result?.household).toBeInstanceOf(Household);
            expect(result?.household?.members).toHaveLength(0);
        });

        it('should handle person with vehicles', () => {
            const householdUuid = uuidV4();
            const personUuid = uuidV4();
            const vehicleUuid = uuidV4();

            const serializedData = {
                household: {
                    _uuid: householdUuid,
                    _isValid: true,
                    size: 1,
                    _members: [
                        {
                            _uuid: personUuid,
                            _sequence: 1,
                            age: 30,
                            _isValid: true,
                            _householdUuid: householdUuid,
                            _vehicles: [
                                {
                                    _uuid: vehicleUuid,
                                    make: 'Toyota',
                                    model: 'Camry',
                                    _isValid: true,
                                    _ownerUuid: personUuid
                                }
                            ]
                        }
                    ]
                },
                audits: []
            };

            const result = SurveyObjectsUnserializer.unserialize(serializedData);

            expect(result).toBeDefined();
            const person = result?.household?.members?.[0];
            expect(person?.vehicles).toHaveLength(1);
            expect(person?.vehicles?.[0]._uuid).toBe(vehicleUuid);
            expect(person?.vehicles?.[0].ownerUuid).toBe(personUuid);
        });

        it('should handle trip with junctions', () => {
            const householdUuid = uuidV4();
            const personUuid = uuidV4();
            const journeyUuid = uuidV4();
            const tripUuid = uuidV4();
            const junctionUuid = uuidV4();

            const serializedData = {
                household: {
                    _uuid: householdUuid,
                    _isValid: true,
                    size: 1,
                    _members: [
                        {
                            _uuid: personUuid,
                            _sequence: 1,
                            age: 30,
                            _isValid: true,
                            _householdUuid: householdUuid,
                            _journeys: [
                                {
                                    _uuid: journeyUuid,
                                    _isValid: true,
                                    _personUuid: personUuid,
                                    _trips: [
                                        {
                                            _uuid: tripUuid,
                                            _sequence: 1,
                                            _isValid: true,
                                            _journeyUuid: journeyUuid,
                                            _junctions: [
                                                {
                                                    _uuid: junctionUuid,
                                                    parkingType: 'exterior',
                                                    _isValid: true,
                                                    _tripUuid: tripUuid
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                },
                audits: []
            };

            const result = SurveyObjectsUnserializer.unserialize(serializedData);

            expect(result).toBeDefined();
            const person = result?.household?.members?.[0];
            const journey = person?.journeys?.[0];
            const trip = journey?.trips?.[0];
            expect(trip?.junctions).toHaveLength(1);
            expect(trip?.junctions?.[0]._uuid).toBe(junctionUuid);
            expect(trip?.junctions?.[0].tripUuid).toBe(tripUuid);
        });

        it('should handle journey with trip chains', () => {
            const householdUuid = uuidV4();
            const personUuid = uuidV4();
            const journeyUuid = uuidV4();
            const tripChainUuid = uuidV4();

            const serializedData = {
                household: {
                    _uuid: householdUuid,
                    _isValid: true,
                    size: 1,
                    _members: [
                        {
                            _uuid: personUuid,
                            _sequence: 1,
                            age: 30,
                            _isValid: true,
                            _householdUuid: householdUuid,
                            _journeys: [
                                {
                                    _uuid: journeyUuid,
                                    _isValid: true,
                                    _personUuid: personUuid,
                                    _tripChains: [
                                        {
                                            _uuid: tripChainUuid,
                                            category: 'work',
                                            _isValid: true,
                                            _journeyUuid: journeyUuid
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                },
                audits: []
            };

            const result = SurveyObjectsUnserializer.unserialize(serializedData);

            expect(result).toBeDefined();
            const person = result?.household?.members?.[0];
            const journey = person?.journeys?.[0];
            expect(journey?.tripChains).toHaveLength(1);
            expect(journey?.tripChains?.[0]._uuid).toBe(tripChainUuid);
            expect(journey?.tripChains?.[0].journeyUuid).toBe(journeyUuid);
        });
    });

    describe('hasValidData', () => {
        it('should return false for null or undefined', () => {
            expect(SurveyObjectsUnserializer.hasValidData(null)).toBe(false);
            expect(SurveyObjectsUnserializer.hasValidData(undefined)).toBe(false);
        });

        it('should return false for non-object types', () => {
            expect(SurveyObjectsUnserializer.hasValidData('string')).toBe(false);
            expect(SurveyObjectsUnserializer.hasValidData(123)).toBe(false);
            expect(SurveyObjectsUnserializer.hasValidData(true)).toBe(false);
        });

        it('should return false for empty object', () => {
            expect(SurveyObjectsUnserializer.hasValidData({})).toBe(false);
        });

        it('should return true when interview is present', () => {
            expect(SurveyObjectsUnserializer.hasValidData({ interview: {} })).toBe(true);
        });

        it('should return true when household is present', () => {
            expect(SurveyObjectsUnserializer.hasValidData({ household: {} })).toBe(true);
        });

        it('should return true when home is present', () => {
            expect(SurveyObjectsUnserializer.hasValidData({ home: {} })).toBe(true);
        });

        it('should return true when audits array has items', () => {
            expect(SurveyObjectsUnserializer.hasValidData({ audits: [{}] })).toBe(true);
        });

        it('should return false when audits array is empty', () => {
            expect(SurveyObjectsUnserializer.hasValidData({ audits: [] })).toBe(false);
        });

        it('should return true when any valid data is present', () => {
            expect(
                SurveyObjectsUnserializer.hasValidData({
                    interview: {},
                    household: {},
                    home: {},
                    audits: []
                })
            ).toBe(true);
        });
    });
});

