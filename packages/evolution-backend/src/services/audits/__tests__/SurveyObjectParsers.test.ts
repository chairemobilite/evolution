/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';

import projectConfig, { setProjectConfig } from '../../../config/projectConfig';
import { SurveyObjectsFactory } from '../../surveyObjects/SurveyObjectsFactory';
import { populateJourneysForPerson } from '../../surveyObjects/JourneyFactory';
import { populatePersonsForHousehold } from '../../surveyObjects/PersonFactory';
import { populateSegmentsForTrip } from '../../surveyObjects/SegmentFactory';
import { populateVisitedPlacesForJourney } from '../../surveyObjects/VisitedPlaceFactory';
import { populateTripsForJourney } from '../../surveyObjects/TripFactory';
import { InterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import { ExtendedTripAttributes } from 'evolution-common/lib/services/baseObjects/Trip';
import { ExtendedPersonAttributes } from 'evolution-common/lib/services/baseObjects/Person';
import { ExtendedJourneyAttributes } from 'evolution-common/lib/services/baseObjects/Journey';
import { SurveyObjectsWithErrors } from 'evolution-common/lib/services/baseObjects/types';
import { Person } from 'evolution-common/lib/services/baseObjects/Person';
import { Journey } from 'evolution-common/lib/services/baseObjects/Journey';
import { Trip } from 'evolution-common/lib/services/baseObjects/Trip';
import { Household } from 'evolution-common/lib/services/baseObjects/Household';
import { CorrectedResponse } from 'evolution-common/lib/services/questionnaire/types';
import { SurveyObjectsRegistry } from 'evolution-common/lib/services/baseObjects/SurveyObjectsRegistry';

describe('SurveyObjectParsers Integration', () => {
    let originalConfig: any;
    let surveyObjectsRegistry: SurveyObjectsRegistry;

    beforeEach(() => {
        // Store original config to restore later
        originalConfig = { ...projectConfig };
        surveyObjectsRegistry = new SurveyObjectsRegistry();
    });

    afterEach(() => {
        // Restore original config
        setProjectConfig(originalConfig);
        surveyObjectsRegistry.clear();
    });

    describe('Parser Configuration Integration', () => {
        it('should call interview parser when configured in SurveyObjectsFactory', async () => {
            const mockInterviewParser = jest.fn();

            setProjectConfig({
                surveyObjectParsers: {
                    interview: mockInterviewParser
                }
            });

            const factory = new SurveyObjectsFactory();
            const interviewAttributes: InterviewAttributes = {
                uuid: uuidV4(),
                corrected_response: {
                    _language: 'en'
                }
            } as any;

            await factory.createAllObjectsWithErrors(interviewAttributes);

            expect(mockInterviewParser).toHaveBeenCalledWith(interviewAttributes.corrected_response);
            expect(mockInterviewParser).toHaveBeenCalledTimes(1);
        });

        it('should call home parser when configured in SurveyObjectsFactory', async () => {
            const mockHomeParser = jest.fn();

            setProjectConfig({
                surveyObjectParsers: {
                    home: mockHomeParser
                }
            });

            const factory = new SurveyObjectsFactory();
            const interviewAttributes: InterviewAttributes = {
                uuid: uuidV4(),
                corrected_response: {
                    home: {
                        _uuid: uuidV4(),
                        address: '123 Test St'
                    }
                }
            } as any;

            await factory.createAllObjectsWithErrors(interviewAttributes);

            expect(mockHomeParser).toHaveBeenCalledWith(
                interviewAttributes.corrected_response!.home,
                interviewAttributes.corrected_response
            );
            expect(mockHomeParser).toHaveBeenCalledTimes(1);
        });

        it('should call household parser when configured in SurveyObjectsFactory', async () => {
            const mockHouseholdParser = jest.fn();

            setProjectConfig({
                surveyObjectParsers: {
                    household: mockHouseholdParser
                }
            });

            const factory = new SurveyObjectsFactory();
            const interviewAttributes: InterviewAttributes = {
                uuid: uuidV4(),
                corrected_response: {
                    household: {
                        _uuid: uuidV4(),
                        size: 2
                    }
                }
            } as any;

            await factory.createAllObjectsWithErrors(interviewAttributes);

            expect(mockHouseholdParser).toHaveBeenCalledWith(
                interviewAttributes.corrected_response!.household,
                interviewAttributes.corrected_response
            );
            expect(mockHouseholdParser).toHaveBeenCalledTimes(1);
        });

        it('should call person parser when configured in PersonFactory', async () => {
            const mockPersonParser = jest.fn();

            setProjectConfig({
                surveyObjectParsers: {
                    person: mockPersonParser
                }
            });

            const personUuid = uuidV4();
            const householdUuid = uuidV4();

            // Create a household object first
            const household = Household.create({ _uuid: householdUuid, size: 2 }, surveyObjectsRegistry);
            if (!('result' in household)) {
                throw new Error('Failed to create household for test');
            }

            const surveyObjectsWithErrors: SurveyObjectsWithErrors = {
                interview: undefined,
                household: household.result, // Set the household here
                home: undefined,
                errorsByObject: {
                    interview: [],
                    interviewUuid: uuidV4(),
                    home: [],
                    homeUuid: uuidV4(),
                    household: [],
                    householdUuid: householdUuid,
                    personsByUuid: {},
                    journeysByUuid: {},
                    visitedPlacesByUuid: {},
                    tripsByUuid: {},
                    segmentsByUuid: {}
                }
            };

            const correctedResponse: CorrectedResponse = {
                household: {
                    persons: {
                        [personUuid]: {
                            _uuid: personUuid,
                            _sequence: 1,
                            age: 30
                        }
                    }
                }
            } as any;

            await populatePersonsForHousehold(
                surveyObjectsWithErrors,
                surveyObjectsWithErrors.household!,
                correctedResponse,
                surveyObjectsRegistry
            );

            expect(mockPersonParser).toHaveBeenCalledWith(
                correctedResponse.household!.persons![personUuid],
                correctedResponse
            );
            expect(mockPersonParser).toHaveBeenCalledTimes(1);
        });

        it('should call journey parser when configured in JourneyFactory', async () => {
            const mockJourneyParser = jest.fn();

            setProjectConfig({
                surveyObjectParsers: {
                    journey: mockJourneyParser
                }
            });

            const surveyObjectsWithErrors: SurveyObjectsWithErrors = {
                interview: undefined,
                household: undefined,
                home: undefined,
                errorsByObject: {
                    interview: [],
                    interviewUuid: 'test-uuid',
                    home: [],
                    homeUuid: 'test-uuid',
                    household: [],
                    householdUuid: 'test-uuid',
                    personsByUuid: {},
                    journeysByUuid: {},
                    visitedPlacesByUuid: {},
                    tripsByUuid: {},
                    segmentsByUuid: {}
                }
            };

            const person = Person.create({ _uuid: 'person-uuid', age: 30 }, surveyObjectsRegistry);
            if ('result' in person) {
                const personAttributes: ExtendedPersonAttributes = {
                    journeys: {
                        'journey-uuid': {
                            _uuid: 'journey-uuid',
                            _sequence: 1
                        }
                    }
                } as any;

                const correctedResponse: CorrectedResponse = {
                    _language: 'en'
                } as any;

                await populateJourneysForPerson(
                    surveyObjectsWithErrors,
                    person.result,
                    personAttributes,
                    undefined,
                    correctedResponse,
                    surveyObjectsRegistry
                );

                expect(mockJourneyParser).toHaveBeenCalledWith(
                    personAttributes.journeys!['journey-uuid'],
                    correctedResponse
                );
                expect(mockJourneyParser).toHaveBeenCalledTimes(1);
            }
        });

        it('should call trip parser when configured in TripFactory', async () => {
            const mockTripParser = jest.fn();

            setProjectConfig({
                surveyObjectParsers: {
                    trip: mockTripParser
                }
            });

            const surveyObjectsWithErrors: SurveyObjectsWithErrors = {
                interview: undefined,
                household: undefined,
                home: undefined,
                errorsByObject: {
                    interview: [],
                    interviewUuid: 'test-uuid',
                    home: [],
                    homeUuid: 'test-uuid',
                    household: [],
                    householdUuid: 'test-uuid',
                    personsByUuid: {},
                    journeysByUuid: {},
                    visitedPlacesByUuid: {},
                    tripsByUuid: {},
                    segmentsByUuid: {}
                }
            };

            const person = Person.create({ _uuid: 'person-uuid', age: 30 }, surveyObjectsRegistry);
            const journey = Journey.create({ _uuid: 'journey-uuid' }, surveyObjectsRegistry);

            if ('result' in person && 'result' in journey) {
                const journeyAttributes: ExtendedJourneyAttributes = {
                    trips: {
                        'trip-uuid': {
                            _uuid: 'trip-uuid',
                            _sequence: 1
                        }
                    }
                } as any;

                const correctedResponse: CorrectedResponse = {
                    _language: 'en'
                } as any;

                await populateTripsForJourney(
                    surveyObjectsWithErrors,
                    person.result,
                    journey.result,
                    journeyAttributes,
                    correctedResponse,
                    surveyObjectsRegistry
                );

                expect(mockTripParser).toHaveBeenCalledWith(
                    journeyAttributes.trips!['trip-uuid'],
                    correctedResponse
                );
                expect(mockTripParser).toHaveBeenCalledTimes(1);
            }
        });

        it('should call segment parser when configured in SegmentFactory', async () => {
            const mockSegmentParser = jest.fn();

            setProjectConfig({
                surveyObjectParsers: {
                    segment: mockSegmentParser
                }
            });

            const surveyObjectsWithErrors: SurveyObjectsWithErrors = {
                interview: undefined,
                household: undefined,
                home: undefined,
                errorsByObject: {
                    interview: [],
                    interviewUuid: 'test-uuid',
                    home: [],
                    homeUuid: 'test-uuid',
                    household: [],
                    householdUuid: 'test-uuid',
                    personsByUuid: {},
                    journeysByUuid: {},
                    visitedPlacesByUuid: {},
                    tripsByUuid: {},
                    segmentsByUuid: {}
                }
            };

            const trip = Trip.create({ _uuid: 'trip-uuid' }, surveyObjectsRegistry);

            if ('result' in trip) {
                const tripAttributes: ExtendedTripAttributes = {
                    segments: {
                        'segment-uuid': {
                            _uuid: 'segment-uuid',
                            _sequence: 1,
                            mode: 'walk'
                        }
                    }
                } as any;

                const correctedResponse: CorrectedResponse = {
                    _language: 'en'
                } as any;

                await populateSegmentsForTrip(
                    surveyObjectsWithErrors,
                    trip.result,
                    tripAttributes,
                    correctedResponse,
                    surveyObjectsRegistry
                );

                expect(mockSegmentParser).toHaveBeenCalledWith(
                    tripAttributes.segments!['segment-uuid'],
                    correctedResponse
                );
                expect(mockSegmentParser).toHaveBeenCalledTimes(1);
            }
        });

        it('should call visitedPlace parser when configured in VisitedPlaceFactory', async () => {
            const mockVisitedPlaceParser = jest.fn();

            setProjectConfig({
                surveyObjectParsers: {
                    visitedPlace: mockVisitedPlaceParser
                }
            });

            const surveyObjectsWithErrors: SurveyObjectsWithErrors = {
                interview: undefined,
                household: undefined,
                home: undefined,
                errorsByObject: {
                    interview: [],
                    interviewUuid: 'test-uuid',
                    home: [],
                    homeUuid: 'test-uuid',
                    household: [],
                    householdUuid: 'test-uuid',
                    personsByUuid: {},
                    journeysByUuid: {},
                    visitedPlacesByUuid: {},
                    tripsByUuid: {},
                    segmentsByUuid: {}
                }
            };

            const person = Person.create({ _uuid: 'person-uuid', age: 30 }, surveyObjectsRegistry);
            const journey = Journey.create({ _uuid: 'journey-uuid' }, surveyObjectsRegistry);

            if ('result' in person && 'result' in journey) {
                const journeyAttributes: ExtendedJourneyAttributes = {
                    visitedPlaces: {
                        'place-uuid': {
                            _uuid: 'place-uuid',
                            _sequence: 1,
                            activity: 'home'
                        }
                    }
                } as any;

                const correctedResponse: CorrectedResponse = {
                    _language: 'en'
                } as any;

                await populateVisitedPlacesForJourney(
                    surveyObjectsWithErrors,
                    person.result,
                    journey.result,
                    journeyAttributes,
                    undefined,
                    correctedResponse,
                    surveyObjectsRegistry
                );

                expect(mockVisitedPlaceParser).toHaveBeenCalledWith(
                    journeyAttributes.visitedPlaces!['place-uuid'],
                    correctedResponse
                );
                expect(mockVisitedPlaceParser).toHaveBeenCalledTimes(1);
            }
        });

        it('should not call parsers when not configured', async () => {
            // Set empty parser configuration
            setProjectConfig({
                surveyObjectParsers: {}
            });

            const factory = new SurveyObjectsFactory();
            const interviewAttributes: InterviewAttributes = {
                uuid: uuidV4(),
                corrected_response: {
                    _language: 'en',
                    home: {
                        _uuid: uuidV4(),
                        address: '123 Test St'
                    },
                    household: {
                        _uuid: uuidV4(),
                        size: 2
                    }
                }
            } as any;

            // This should not throw errors even without parsers configured
            const result = await factory.createAllObjectsWithErrors(interviewAttributes);
            expect(result).toBeDefined();
        });

        it('should handle undefined parser configuration gracefully', async () => {
            // Set no parser configuration
            setProjectConfig({
                surveyObjectParsers: undefined
            });

            const factory = new SurveyObjectsFactory();
            const interviewAttributes: InterviewAttributes = {
                uuid: uuidV4(),
                corrected_response: {
                    _language: 'en'
                }
            } as any;

            // This should not throw errors even without parsers configured
            const result = await factory.createAllObjectsWithErrors(interviewAttributes);
            expect(result).toBeDefined();
        });
    });
});
