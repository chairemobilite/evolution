/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { createPersonsForHousehold } from '../PersonFactory';
import { SurveyObjectsWithErrors } from 'evolution-common/lib/services/baseObjects/types';
import { Household } from 'evolution-common/lib/services/baseObjects/Household';
import { Person } from 'evolution-common/lib/services/baseObjects/Person';
import { InterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import { createOk, createErrors } from 'evolution-common/lib/types/Result.type';

// Mock Person.create
jest.mock('evolution-common/lib/services/baseObjects/Person', () => ({
    Person: {
        create: jest.fn()
    }
}));
const MockedPerson = Person as jest.MockedClass<typeof Person>;

describe('PersonFactory', () => {
    let surveyObjectsWithErrors: SurveyObjectsWithErrors;
    let household: Household;
    let interviewAttributes: InterviewAttributes;

    beforeEach(() => {
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
        });
        household.members = [];

        interviewAttributes = {
            uuid: 'interview-uuid',
            corrected_response: {
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
            }
        } as unknown as InterviewAttributes;

        surveyObjectsWithErrors.household = household;

        // Clear all mocks
        jest.clearAllMocks();
    });

    describe('createPersonsForHousehold', () => {
        it('should create persons successfully and add them to household', async () => {
            // Mock successful person creation
            const mockPerson1 = {
                _uuid: 'person-1',
                age: 30,
                assignColor: jest.fn()
            } as unknown as Person;

            const mockPerson2 = {
                _uuid: 'person-2',
                age: 25,
                assignColor: jest.fn()
            } as unknown as Person;

            (MockedPerson.create as jest.Mock)
                .mockReturnValueOnce(createOk(mockPerson1))
                .mockReturnValueOnce(createOk(mockPerson2));

            await createPersonsForHousehold(surveyObjectsWithErrors, household, interviewAttributes);

            // Verify Person.create was called with correct attributes
            expect(MockedPerson.create).toHaveBeenCalledTimes(2);
            expect(MockedPerson.create).toHaveBeenCalledWith({
                _uuid: 'person-1',
                _sequence: 1,
                age: 30,
                gender: 'male'
            });
            expect(MockedPerson.create).toHaveBeenCalledWith({
                _uuid: 'person-2',
                _sequence: 2,
                age: 25,
                gender: 'female'
            });

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

        it('should handle person creation errors', async () => {
            const errors = [new Error('Invalid age')];

            (MockedPerson.create as jest.Mock)
                .mockReturnValueOnce(createErrors(errors))
                .mockReturnValueOnce(createOk({
                    _uuid: 'person-2',
                    assignColor: jest.fn()
                } as unknown as Person));

            await createPersonsForHousehold(surveyObjectsWithErrors, household, interviewAttributes);

            // Verify error was stored
            expect(surveyObjectsWithErrors.errorsByObject.personsByUuid['person-1']).toEqual(errors);

            // Verify only successful person was added
            expect(household.members).toHaveLength(1);
            expect(household.members?.[0]._uuid).toBe('person-2');
        });

        it('should skip persons with undefined uuid', async () => {
            interviewAttributes.corrected_response!.household!.persons = {
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
                assignColor: jest.fn()
            } as unknown as Person));

            await createPersonsForHousehold(surveyObjectsWithErrors, household, interviewAttributes);

            // Should only create one person (skip undefined)
            expect(MockedPerson.create).toHaveBeenCalledTimes(1);
            expect(household.members).toHaveLength(1);
        });

        it('should handle missing household', async () => {
            surveyObjectsWithErrors.household = undefined;

            await createPersonsForHousehold(surveyObjectsWithErrors, household, interviewAttributes);

            expect(MockedPerson.create).not.toHaveBeenCalled();
        });

        it('should handle missing persons attributes', async () => {
            interviewAttributes.corrected_response!.household!.persons = undefined;

            await createPersonsForHousehold(surveyObjectsWithErrors, household, interviewAttributes);

            expect(MockedPerson.create).not.toHaveBeenCalled();
            expect(household.members).toHaveLength(0);
        });

        it('should sort persons by sequence', async () => {
            // Create persons with mixed sequence order
            interviewAttributes.corrected_response!.household!.persons = {
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
                .mockReturnValueOnce(createOk({ _uuid: 'person-1', assignColor: jest.fn() } as unknown as Person))
                .mockReturnValueOnce(createOk({ _uuid: 'person-2', assignColor: jest.fn() } as unknown as Person))
                .mockReturnValueOnce(createOk({ _uuid: 'person-3', assignColor: jest.fn() } as unknown as Person));

            await createPersonsForHousehold(surveyObjectsWithErrors, household, interviewAttributes);

            // Verify persons were created in sequence order (1, 2, 3)
            expect(MockedPerson.create).toHaveBeenNthCalledWith(1, expect.objectContaining({ _sequence: 1 }));
            expect(MockedPerson.create).toHaveBeenNthCalledWith(2, expect.objectContaining({ _sequence: 2 }));
            expect(MockedPerson.create).toHaveBeenNthCalledWith(3, expect.objectContaining({ _sequence: 3 }));
        });
    });
});
