/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';

import projectConfig, { setProjectConfig } from '../../../config/projectConfig';
import { SurveyObjectsFactory } from '../../surveyObjects/SurveyObjectsFactory';
import { InterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import { SurveyObjectsRegistry } from 'evolution-common/lib/services/baseObjects/SurveyObjectsRegistry';

describe('SurveyObjectParsers Integration', () => {
    let originalConfig: typeof projectConfig;
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
            const mockInterviewParser = jest.fn().mockReturnValue({ _language: 'en' });

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

            expect(mockInterviewParser).toHaveBeenCalledTimes(1);
            expect(mockInterviewParser.mock.calls[0][0]).toEqual(interviewAttributes.corrected_response);
            expect(mockInterviewParser.mock.calls[0][0]).not.toBe(interviewAttributes.corrected_response);
        });

        it('should call home parser when configured in SurveyObjectsFactory', async () => {
            const mockHomeParser = jest.fn().mockReturnValue({
                _uuid: uuidV4(),
                address: '123 Test St'
            });

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

            const correctedResponse = interviewAttributes.corrected_response!;
            const home = correctedResponse.home;
            await factory.createAllObjectsWithErrors(interviewAttributes);

            expect(mockHomeParser).toHaveBeenCalledTimes(1);
            expect(mockHomeParser.mock.calls[0][0]).toEqual(home);
            expect(mockHomeParser.mock.calls[0][0]).not.toBe(home);
            expect(mockHomeParser.mock.calls[0][1]).not.toBe(correctedResponse);
            expect(mockHomeParser.mock.calls[0][1]).toMatchObject({
                home: expect.objectContaining({ address: '123 Test St' })
            });
        });

        it('should call household parser when configured in SurveyObjectsFactory', async () => {
            const mockHouseholdParser = jest.fn().mockReturnValue({
                _uuid: uuidV4(),
                size: 2
            });

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

            const correctedResponse = interviewAttributes.corrected_response!;
            const household = correctedResponse.household;
            await factory.createAllObjectsWithErrors(interviewAttributes);

            expect(mockHouseholdParser).toHaveBeenCalledTimes(1);
            expect(mockHouseholdParser.mock.calls[0][0]).toEqual(household);
            expect(mockHouseholdParser.mock.calls[0][0]).not.toBe(household);
            expect(mockHouseholdParser.mock.calls[0][1]).not.toBe(correctedResponse);
            expect(mockHouseholdParser.mock.calls[0][1]).toMatchObject({
                household: expect.objectContaining({ size: 2 })
            });
        });

        it('should run each configured parser once before creating objects', async () => {
            const personUuid = uuidV4();
            const journeyUuid = uuidV4();
            const visitedPlaceUuid = uuidV4();
            const tripUuid = uuidV4();
            const segmentUuid = uuidV4();
            const parsers = {
                interview: jest.fn((response) => ({ ...response })),
                home: jest.fn((home) => ({ ...home })),
                household: jest.fn((household) => ({ ...household })),
                person: jest.fn((person) => ({ ...person })),
                journey: jest.fn((journey) => ({ ...journey })),
                visitedPlace: jest.fn((visitedPlace) => ({ ...visitedPlace })),
                trip: jest.fn((trip) => ({ ...trip })),
                segment: jest.fn((segment) => ({ ...segment }))
            };

            setProjectConfig({
                surveyObjectParsers: parsers
            });

            const factory = new SurveyObjectsFactory();
            const interviewAttributes: InterviewAttributes = {
                uuid: uuidV4(),
                corrected_response: {
                    _language: 'en',
                    home: {
                        address: '123 Test St'
                    },
                    household: {
                        size: 1,
                        persons: {
                            [personUuid]: {
                                _uuid: personUuid,
                                _sequence: 1,
                                age: 30,
                                journeys: {
                                    [journeyUuid]: {
                                        _uuid: journeyUuid,
                                        _sequence: 1,
                                        visitedPlaces: {
                                            [visitedPlaceUuid]: {
                                                _uuid: visitedPlaceUuid,
                                                _sequence: 1,
                                                activity: 'home'
                                            }
                                        },
                                        trips: {
                                            [tripUuid]: {
                                                _uuid: tripUuid,
                                                _sequence: 1,
                                                segments: {
                                                    [segmentUuid]: {
                                                        _uuid: segmentUuid,
                                                        _sequence: 1,
                                                        mode: 'walk'
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            } as any;

            await factory.createAllObjectsWithErrors(interviewAttributes);

            expect(parsers.interview).toHaveBeenCalledTimes(1);
            expect(parsers.home).toHaveBeenCalledTimes(1);
            expect(parsers.household).toHaveBeenCalledTimes(1);
            expect(parsers.person).toHaveBeenCalledTimes(1);
            expect(parsers.journey).toHaveBeenCalledTimes(1);
            expect(parsers.visitedPlace).toHaveBeenCalledTimes(1);
            expect(parsers.trip).toHaveBeenCalledTimes(1);
            expect(parsers.segment).toHaveBeenCalledTimes(1);
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
