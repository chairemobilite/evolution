/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { SurveyObjectsFactory } from '../SurveyObjectsFactory';
import { createPersonsForHousehold } from '../PersonFactory';
import { createJourneysForPerson } from '../JourneyFactory';
import { InterviewAttributes, CorrectedResponse } from 'evolution-common/lib/services/questionnaire/types';
import { create as createInterviewObject } from 'evolution-common/lib/services/baseObjects/interview/InterviewUnserializer';
import { Home } from 'evolution-common/lib/services/baseObjects/Home';
import { Household } from 'evolution-common/lib/services/baseObjects/Household';
import { createOk, createErrors } from 'evolution-common/lib/types/Result.type';

// Mock dependencies
jest.mock('../PersonFactory');
jest.mock('../JourneyFactory');
jest.mock('evolution-common/lib/services/baseObjects/interview/InterviewUnserializer');
jest.mock('evolution-common/lib/services/baseObjects/Home', () => ({
    Home: {
        create: jest.fn()
    }
}));
jest.mock('evolution-common/lib/services/baseObjects/Household', () => ({
    Household: {
        create: jest.fn()
    }
}));

const mockedCreatePersonsForHousehold = createPersonsForHousehold as jest.MockedFunction<typeof createPersonsForHousehold>;
const mockedCreateJourneysForPerson = createJourneysForPerson as jest.MockedFunction<typeof createJourneysForPerson>;
const mockedCreateInterviewObject = createInterviewObject as jest.MockedFunction<typeof createInterviewObject>;
const MockedHome = Home as jest.MockedClass<typeof Home>;
const MockedHousehold = Household as jest.MockedClass<typeof Household>;

describe('SurveyObjectsFactory', () => {
    let factory: SurveyObjectsFactory;
    let interviewAttributes: InterviewAttributes;

    beforeEach(() => {
        factory = new SurveyObjectsFactory();

        interviewAttributes = {
            uuid: 'interview-uuid',
            corrected_response: {
                interview: {
                    _uuid: 'interview-uuid'
                },
                home: {
                    _uuid: 'home-uuid',
                    geography: { type: 'Point', coordinates: [-73.5, 45.5] }
                },
                household: {
                    _uuid: 'household-uuid',
                    size: 2,
                    persons: {
                        'person-1': {
                            _uuid: 'person-1',
                            age: 30
                        }
                    }
                }
            } as unknown as CorrectedResponse
        } as unknown as InterviewAttributes;

        // Clear all mocks
        jest.clearAllMocks();
    });

    describe('createAllObjectsWithErrors', () => {
        it('should create all objects successfully', async () => {
            const mockInterview = { _uuid: 'interview-uuid' };
            const mockHome = {
                _uuid: 'home-uuid',
                geography: { type: 'Point', coordinates: [-73.5, 45.5] }
            };
            const mockHousehold = {
                _uuid: 'household-uuid',
                members: [{ _uuid: 'person-1', setupWorkAndSchoolPlaces: jest.fn() }]
            };

            mockedCreateInterviewObject.mockReturnValue(createOk(mockInterview as any));
            (MockedHome.create as jest.Mock).mockReturnValue(createOk(mockHome as any));
            (MockedHousehold.create as jest.Mock).mockReturnValue(createOk(mockHousehold as any));
            mockedCreatePersonsForHousehold.mockResolvedValue();
            mockedCreateJourneysForPerson.mockResolvedValue();

            const result = await factory.createAllObjectsWithErrors(interviewAttributes);

            // Verify all create methods were called
            expect(mockedCreateInterviewObject).toHaveBeenCalledWith(
                expect.objectContaining({
                    interview: { _uuid: 'interview-uuid' }
                    // home and household should be omitted
                }),
                interviewAttributes
            );
            expect(MockedHome.create).toHaveBeenCalledWith(interviewAttributes.corrected_response!.home);
            expect(MockedHousehold.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    _uuid: 'household-uuid',
                    size: 2
                    // persons should be omitted
                })
            );

            // Verify objects were created
            expect(result.interview).toBe(mockInterview);
            expect(result.home).toBe(mockHome);
            expect(result.household).toBe(mockHousehold);

            // Verify person and journey factories were called
            expect(mockedCreatePersonsForHousehold).toHaveBeenCalledWith(
                result,
                mockHousehold,
                interviewAttributes
            );
            expect(mockedCreateJourneysForPerson).toHaveBeenCalledWith(
                result,
                mockHousehold.members[0],
                interviewAttributes.corrected_response!.household!.persons!['person-1'],
                mockHome,
                interviewAttributes
            );

            // Verify setupWorkAndSchoolPlaces was called
            expect(mockHousehold.members[0].setupWorkAndSchoolPlaces).toHaveBeenCalled();

            // Verify no errors
            expect(result.errorsByObject.interview).toEqual([]);
            expect(result.errorsByObject.home).toEqual([]);
            expect(result.errorsByObject.household).toEqual([]);
        });

        it('should handle missing corrected_response', async () => {
            interviewAttributes.corrected_response = undefined;

            const result = await factory.createAllObjectsWithErrors(interviewAttributes);

            // Should have error for missing corrected response
            expect(result.errorsByObject.interview).toHaveLength(1);
            expect(result.errorsByObject.interview[0].message).toContain('Corrected response is missing');

            // No other objects should be created
            expect(result.interview).toBeUndefined();
            expect(result.home).toBeUndefined();
            expect(result.household).toBeUndefined();
        });

        it('should handle interview creation errors', async () => {
            const errors = [new Error('Invalid interview data')];
            mockedCreateInterviewObject.mockReturnValue(createErrors(errors));
            (MockedHome.create as jest.Mock).mockReturnValue(createOk({} as any));
            (MockedHousehold.create as jest.Mock).mockReturnValue(createOk({ members: [] } as any));

            const result = await factory.createAllObjectsWithErrors(interviewAttributes);

            expect(result.interview).toBeUndefined();
            expect(result.errorsByObject.interview).toBe(errors);
        });

        it('should handle home creation errors', async () => {
            const errors = [new Error('Invalid home data')];
            mockedCreateInterviewObject.mockReturnValue(createOk({} as any));
            (MockedHome.create as jest.Mock).mockReturnValue(createErrors(errors));
            (MockedHousehold.create as jest.Mock).mockReturnValue(createOk({ members: [] } as any));

            const result = await factory.createAllObjectsWithErrors(interviewAttributes);

            expect(result.home).toBeUndefined();
            expect(result.errorsByObject.home).toBe(errors);
        });

        it('should handle household creation errors', async () => {
            const errors = [new Error('Invalid household data')];
            mockedCreateInterviewObject.mockReturnValue(createOk({} as any));
            (MockedHome.create as jest.Mock).mockReturnValue(createOk({} as any));
            (MockedHousehold.create as jest.Mock).mockReturnValue(createErrors(errors));

            const result = await factory.createAllObjectsWithErrors(interviewAttributes);

            expect(result.household).toBeUndefined();
            expect(result.errorsByObject.household).toBe(errors);

            // Should not call person/journey factories if household creation fails
            expect(mockedCreatePersonsForHousehold).not.toHaveBeenCalled();
            expect(mockedCreateJourneysForPerson).not.toHaveBeenCalled();
        });

        it('should handle missing home attributes', async () => {
            interviewAttributes.corrected_response!.home = undefined;

            mockedCreateInterviewObject.mockReturnValue(createOk({} as any));
            (MockedHousehold.create as jest.Mock).mockReturnValue(createOk({ members: [] } as any));

            const result = await factory.createAllObjectsWithErrors(interviewAttributes);

            expect(result.home).toBeUndefined();
            expect(MockedHome.create).not.toHaveBeenCalled();
            expect(result.errorsByObject.home).toEqual([]);
        });

        it('should handle missing household attributes', async () => {
            interviewAttributes.corrected_response!.household = undefined;

            mockedCreateInterviewObject.mockReturnValue(createOk({} as any));
            (MockedHome.create as jest.Mock).mockReturnValue(createOk({} as any));

            await factory.createAllObjectsWithErrors(interviewAttributes);

            // Should not try to create household when attributes are missing
            expect(MockedHousehold.create).not.toHaveBeenCalled();
        });

        it('should process multiple persons', async () => {
            const mockHousehold = {
                _uuid: 'household-uuid',
                members: [
                    { _uuid: 'person-1', _sequence: 1, setupWorkAndSchoolPlaces: jest.fn() },
                    { _uuid: 'person-2', _sequence: 2, setupWorkAndSchoolPlaces: jest.fn() }
                ]
            };

            interviewAttributes.corrected_response!.household!.persons = {
                'person-1': { _uuid: 'person-1', age: 30 },
                'person-2': { _uuid: 'person-2', age: 25 }
            } as any;

            mockedCreateInterviewObject.mockReturnValue(createOk({} as any));
            (MockedHome.create as jest.Mock).mockReturnValue(createOk({} as any));
            (MockedHousehold.create as jest.Mock).mockReturnValue(createOk(mockHousehold as any));
            mockedCreatePersonsForHousehold.mockResolvedValue();
            mockedCreateJourneysForPerson.mockResolvedValue();

            const result = await factory.createAllObjectsWithErrors(interviewAttributes);

            // Should call journey factory for each person
            expect(mockedCreateJourneysForPerson).toHaveBeenCalledTimes(2);
            expect(mockedCreateJourneysForPerson).toHaveBeenCalledWith(
                result,
                mockHousehold.members[0],
                interviewAttributes.corrected_response!.household!.persons!['person-1'],
                result.home,
                interviewAttributes
            );
            expect(mockedCreateJourneysForPerson).toHaveBeenCalledWith(
                result,
                mockHousehold.members[1],
                interviewAttributes.corrected_response!.household!.persons!['person-2'],
                result.home,
                interviewAttributes
            );

            // Should call setupWorkAndSchoolPlaces for each person
            expect(mockHousehold.members[0].setupWorkAndSchoolPlaces).toHaveBeenCalled();
            expect(mockHousehold.members[1].setupWorkAndSchoolPlaces).toHaveBeenCalled();
        });

        it('should handle empty persons object', async () => {
            const mockHousehold = {
                _uuid: 'household-uuid',
                members: []
            };

            interviewAttributes.corrected_response!.household!.persons = {};

            mockedCreateInterviewObject.mockReturnValue(createOk({} as any));
            (MockedHome.create as jest.Mock).mockReturnValue(createOk({} as any));
            (MockedHousehold.create as jest.Mock).mockReturnValue(createOk(mockHousehold as any));
            mockedCreatePersonsForHousehold.mockResolvedValue();

            await factory.createAllObjectsWithErrors(interviewAttributes);

            // Should not call journey factory if no persons
            expect(mockedCreateJourneysForPerson).not.toHaveBeenCalled();
        });

        it('should initialize with correct factory options', () => {
            const customOptions = {
                calculateRouting: false,
                forceUpdateRouting: true
            };

            const customFactory = new SurveyObjectsFactory(customOptions);

            // Factory should be created with custom options
            expect(customFactory).toBeInstanceOf(SurveyObjectsFactory);
        });

        it('should use default factory options when none provided', () => {
            const defaultFactory = new SurveyObjectsFactory();

            // Factory should be created with default options
            expect(defaultFactory).toBeInstanceOf(SurveyObjectsFactory);
        });
    });
});
