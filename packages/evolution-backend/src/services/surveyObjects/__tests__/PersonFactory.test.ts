/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { populatePersonsForHousehold } from '../PersonFactory';
import { populateJourneysForPerson } from '../JourneyFactory';
import { SurveyObjectsWithErrors } from 'evolution-common/lib/services/baseObjects/types';
import { Household } from 'evolution-common/lib/services/baseObjects/Household';
import { Person } from 'evolution-common/lib/services/baseObjects/Person';
import { CorrectedResponse } from 'evolution-common/lib/services/questionnaire/types';
import { createOk, createErrors } from 'evolution-common/lib/types/Result.type';
import { SurveyObjectsRegistry } from 'evolution-common/lib/services/baseObjects/SurveyObjectsRegistry';

// Mock Person.create
jest.mock('evolution-common/lib/services/baseObjects/Person', () => ({
    Person: {
        create: jest.fn()
    }
}));
jest.mock('../JourneyFactory');
const MockedPerson = Person as jest.MockedClass<typeof Person>;
const mockedPopulateJourneysForPerson = populateJourneysForPerson as jest.MockedFunction<
    typeof populateJourneysForPerson
>;

describe('PersonFactory', () => {
    let surveyObjectsRegistry: SurveyObjectsRegistry;
    let surveyObjectsWithErrors: SurveyObjectsWithErrors;
    let household: Household;
    let correctedResponse: CorrectedResponse;

    beforeEach(() => {
        surveyObjectsRegistry = new SurveyObjectsRegistry();
        surveyObjectsWithErrors = {
            interview: undefined,
            household: undefined,
            home: undefined,
            errorsByObject: {
                interview: [],
                interviewUuid: '123',
                home: [],
                homeUuid: '123',
                household: [],
                householdUuid: '123',
                personsByUuid: {},
                journeysByUuid: {},
                visitedPlacesByUuid: {},
                tripsByUuid: {},
                segmentsByUuid: {}
            }
        };

        household = new Household({
            _uuid: uuidV4(),
            size: 2
        }, surveyObjectsRegistry);
        household.members = [];

        correctedResponse = {
            household: {
                persons: {
                    'person-1': {
                        _uuid: 'person-1',
                        _sequence: 1,
                        age: 30,
                        gender: 'male'
                    },
                    'person-2': {
                        _uuid: 'person-2',
                        _sequence: 2,
                        age: 25,
                        gender: 'female'
                    }
                }
            }
        } as unknown as CorrectedResponse;

        surveyObjectsWithErrors.household = household;

        // Clear all mocks
        jest.clearAllMocks();
        mockedPopulateJourneysForPerson.mockResolvedValue();
    });

    describe('populatePersonsForHousehold', () => {
        it('should create persons successfully and add them to household', async () => {
            // Mock successful person creation
            const mockPerson1 = {
                _uuid: 'person-1',
                age: 30,
                assignColor: jest.fn(),
                setupWorkAndSchoolPlaces: jest.fn()
            } as unknown as Person;

            const mockPerson2 = {
                _uuid: 'person-2',
                age: 25,
                assignColor: jest.fn(),
                setupWorkAndSchoolPlaces: jest.fn()
            } as unknown as Person;

            (MockedPerson.create as jest.Mock)
                .mockReturnValueOnce(createOk(mockPerson1))
                .mockReturnValueOnce(createOk(mockPerson2));

            await populatePersonsForHousehold(surveyObjectsWithErrors, household, undefined, correctedResponse, surveyObjectsRegistry);

            // Verify Person.create was called with correct attributes
            expect(MockedPerson.create).toHaveBeenCalledTimes(2);
            expect(MockedPerson.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    _uuid: 'person-1',
                    _sequence: 1,
                    age: 30,
                    gender: 'male'
                }),
                surveyObjectsRegistry
            );
            expect(MockedPerson.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    _uuid: 'person-2',
                    _sequence: 2,
                    age: 25,
                    gender: 'female'
                }),
                surveyObjectsRegistry
            );

            // Verify persons were added to household in correct order
            expect(household.members).toHaveLength(2);
            expect(household.members?.[0]).toBe(mockPerson1);
            expect(household.members?.[1]).toBe(mockPerson2);

            // Verify colors were assigned
            expect(mockPerson1.assignColor).toHaveBeenCalledWith(0);
            expect(mockPerson2.assignColor).toHaveBeenCalledWith(1);

            // Verify no errors
            expect(surveyObjectsWithErrors.errorsByObject.personsByUuid).toEqual({});
        });

        it('should omit journeys from Person.create attributes', async () => {
            correctedResponse.household!.persons = {
                'person-1': {
                    _uuid: 'person-1',
                    _sequence: 1,
                    age: 30,
                    journeys: {
                        'journey-1': { _uuid: 'journey-1', _sequence: 1 }
                    }
                }
            };

            (MockedPerson.create as jest.Mock).mockReturnValue(createOk({
                _uuid: 'person-1',
                assignColor: jest.fn(),
                setupWorkAndSchoolPlaces: jest.fn()
            } as unknown as Person));

            await populatePersonsForHousehold(surveyObjectsWithErrors, household, undefined, correctedResponse, surveyObjectsRegistry);

            expect(MockedPerson.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    _uuid: 'person-1',
                    _sequence: 1,
                    age: 30
                }),
                surveyObjectsRegistry
            );
            expect(MockedPerson.create).toHaveBeenCalledWith(
                expect.not.objectContaining({
                    journeys: expect.anything()
                }),
                surveyObjectsRegistry
            );
            expect(household.members).toHaveLength(1);
        });

        it('should populate journeys and setup work/school places for each successfully created person', async () => {
            const home = { _uuid: 'home-uuid' } as any;
            const mockPerson1 = {
                _uuid: 'person-1',
                assignColor: jest.fn(),
                setupWorkAndSchoolPlaces: jest.fn()
            } as unknown as Person;
            const mockPerson2 = {
                _uuid: 'person-2',
                assignColor: jest.fn(),
                setupWorkAndSchoolPlaces: jest.fn()
            } as unknown as Person;

            (MockedPerson.create as jest.Mock)
                .mockReturnValueOnce(createOk(mockPerson1))
                .mockReturnValueOnce(createOk(mockPerson2));

            await populatePersonsForHousehold(surveyObjectsWithErrors, household, home, correctedResponse, surveyObjectsRegistry);

            expect(mockedPopulateJourneysForPerson).toHaveBeenCalledTimes(2);
            expect(mockedPopulateJourneysForPerson).toHaveBeenNthCalledWith(
                1,
                surveyObjectsWithErrors,
                mockPerson1,
                expect.objectContaining({ _uuid: 'person-1' }),
                home,
                correctedResponse,
                surveyObjectsRegistry
            );
            expect(mockedPopulateJourneysForPerson).toHaveBeenNthCalledWith(
                2,
                surveyObjectsWithErrors,
                mockPerson2,
                expect.objectContaining({ _uuid: 'person-2' }),
                home,
                correctedResponse,
                surveyObjectsRegistry
            );

            expect(mockPerson1.setupWorkAndSchoolPlaces).toHaveBeenCalledTimes(1);
            expect(mockPerson2.setupWorkAndSchoolPlaces).toHaveBeenCalledTimes(1);
        });

        it('should not populate journeys or setup work/school places for persons that failed to be created', async () => {
            const errors = [new Error('Invalid age')];
            const mockPerson2 = {
                _uuid: 'person-2',
                assignColor: jest.fn(),
                setupWorkAndSchoolPlaces: jest.fn()
            } as unknown as Person;

            (MockedPerson.create as jest.Mock)
                .mockReturnValueOnce(createErrors(errors))
                .mockReturnValueOnce(createOk(mockPerson2));

            await populatePersonsForHousehold(surveyObjectsWithErrors, household, undefined, correctedResponse, surveyObjectsRegistry);

            expect(mockedPopulateJourneysForPerson).toHaveBeenCalledTimes(1);
            expect(mockedPopulateJourneysForPerson).toHaveBeenCalledWith(
                surveyObjectsWithErrors,
                mockPerson2,
                expect.objectContaining({ _uuid: 'person-2' }),
                undefined,
                correctedResponse,
                surveyObjectsRegistry
            );
            expect(mockPerson2.setupWorkAndSchoolPlaces).toHaveBeenCalledTimes(1);
        });

        it('should handle person creation errors', async () => {
            const errors = [new Error('Invalid age')];

            (MockedPerson.create as jest.Mock)
                .mockReturnValueOnce(createErrors(errors))
                .mockReturnValueOnce(createOk({
                    _uuid: 'person-2',
                    assignColor: jest.fn(),
                    setupWorkAndSchoolPlaces: jest.fn()
                } as unknown as Person));

            await populatePersonsForHousehold(surveyObjectsWithErrors, household, undefined, correctedResponse, surveyObjectsRegistry);

            // Verify error was stored
            expect(surveyObjectsWithErrors.errorsByObject.personsByUuid['person-1']).toEqual(errors);

            // Verify only successful person was added
            expect(household.members).toHaveLength(1);
            expect(household.members?.[0]._uuid).toBe('person-2');
        });

        it('should skip persons with undefined uuid', async () => {
            correctedResponse.household!.persons = {
                'undefined': {
                    _sequence: 1,
                    _uuid: 'undefined',
                    age: 30
                },
                'person-1': {
                    _sequence: 1,
                    _uuid: 'person-1',
                    age: 25
                }
            };

            (MockedPerson.create as jest.Mock).mockReturnValue(createOk({
                _uuid: 'person-1',
                assignColor: jest.fn(),
                setupWorkAndSchoolPlaces: jest.fn()
            } as unknown as Person));

            await populatePersonsForHousehold(surveyObjectsWithErrors, household, undefined, correctedResponse, surveyObjectsRegistry);

            // Should only create one person (skip undefined)
            expect(MockedPerson.create).toHaveBeenCalledTimes(1);
            expect(household.members).toHaveLength(1);
        });

        it('should handle missing household', async () => {
            surveyObjectsWithErrors.household = undefined;

            await populatePersonsForHousehold(surveyObjectsWithErrors, household, undefined, correctedResponse, surveyObjectsRegistry);

            expect(MockedPerson.create).not.toHaveBeenCalled();
        });

        it('should handle missing persons attributes', async () => {
            correctedResponse.household!.persons = undefined;

            await populatePersonsForHousehold(surveyObjectsWithErrors, household, undefined, correctedResponse, surveyObjectsRegistry);

            expect(MockedPerson.create).not.toHaveBeenCalled();
            expect(household.members).toHaveLength(0);
        });

        it('should sort persons by sequence', async () => {
            // Create persons with mixed sequence order
            correctedResponse.household!.persons = {
                'person-3': {
                    _uuid: 'person-3',
                    _sequence: 3,
                    age: 40
                },
                'person-1': {
                    _uuid: 'person-1',
                    _sequence: 1,
                    age: 30
                },
                'person-2': {
                    _uuid: 'person-2',
                    _sequence: 2,
                    age: 25
                }
            };

            (MockedPerson.create as jest.Mock)
                .mockReturnValueOnce(createOk({ _uuid: 'person-1', assignColor: jest.fn(), setupWorkAndSchoolPlaces: jest.fn() } as unknown as Person))
                .mockReturnValueOnce(createOk({ _uuid: 'person-2', assignColor: jest.fn(), setupWorkAndSchoolPlaces: jest.fn() } as unknown as Person))
                .mockReturnValueOnce(createOk({ _uuid: 'person-3', assignColor: jest.fn(), setupWorkAndSchoolPlaces: jest.fn() } as unknown as Person));

            await populatePersonsForHousehold(surveyObjectsWithErrors, household, undefined, correctedResponse, surveyObjectsRegistry);

            // Verify persons were created in sequence order (1, 2, 3)
            expect(MockedPerson.create).toHaveBeenNthCalledWith(1, expect.objectContaining({ _sequence: 1 }), surveyObjectsRegistry);
            expect(MockedPerson.create).toHaveBeenNthCalledWith(2, expect.objectContaining({ _sequence: 2 }), surveyObjectsRegistry);
            expect(MockedPerson.create).toHaveBeenNthCalledWith(3, expect.objectContaining({ _sequence: 3 }), surveyObjectsRegistry);
        });
    });
});
