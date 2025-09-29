/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { createJourneysForPerson } from '../JourneyFactory';
import { createVisitedPlacesForJourney } from '../VisitedPlaceFactory';
import { createTripsForJourney } from '../TripFactory';
import { SurveyObjectsWithErrors } from 'evolution-common/lib/services/baseObjects/types';
import { Person, ExtendedPersonAttributes } from 'evolution-common/lib/services/baseObjects/Person';
import { Journey } from 'evolution-common/lib/services/baseObjects/Journey';
import { Home } from 'evolution-common/lib/services/baseObjects/Home';
import { createOk, createErrors } from 'evolution-common/lib/types/Result.type';

// Mock dependencies
jest.mock('evolution-common/lib/services/baseObjects/Journey', () => ({
    Journey: {
        create: jest.fn()
    }
}));
jest.mock('../VisitedPlaceFactory');
jest.mock('../TripFactory');

const MockedJourney = Journey as jest.MockedClass<typeof Journey>;
const mockedCreateVisitedPlacesForJourney = createVisitedPlacesForJourney as jest.MockedFunction<typeof createVisitedPlacesForJourney>;
const mockedCreateTripsForJourney = createTripsForJourney as jest.MockedFunction<typeof createTripsForJourney>;

describe('JourneyFactory', () => {
    let surveyObjectsWithErrors: SurveyObjectsWithErrors;
    let person: Person;
    let personAttributes: ExtendedPersonAttributes;
    let home: Home;

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

        person = {
            _uuid: 'person-uuid',
            addJourney: jest.fn()
        } as unknown as Person;

        personAttributes = {
            _uuid: 'person-uuid',
            journeys: {
                'journey-1': {
                    _uuid: 'journey-1',
                    _sequence: 1,
                    name: 'Work Day',
                    visitedPlaces: {},
                    trips: {}
                },
                'journey-2': {
                    _uuid: 'journey-2',
                    _sequence: 2,
                    name: 'Weekend',
                    visitedPlaces: {},
                    trips: {}
                }
            }
        } as unknown as ExtendedPersonAttributes;

        home = {
            _uuid: 'home-uuid',
            geography: { type: 'Point', coordinates: [0, 0] }
        } as unknown as Home;

        // Clear all mocks
        jest.clearAllMocks();
    });

    describe('createJourneysForPerson', () => {
        it('should create journeys successfully and add them to person', async () => {
            const mockJourney1 = {
                _uuid: 'journey-1',
                name: 'Work Day'
            } as Journey;

            const mockJourney2 = {
                _uuid: 'journey-2',
                name: 'Weekend'
            } as Journey;

            (MockedJourney.create as jest.Mock)
                .mockReturnValueOnce(createOk(mockJourney1))
                .mockReturnValueOnce(createOk(mockJourney2));

            mockedCreateVisitedPlacesForJourney.mockResolvedValue();
            mockedCreateTripsForJourney.mockResolvedValue();

            await createJourneysForPerson(surveyObjectsWithErrors, person, personAttributes, home, { uuid: 'test' } as any);

            // Verify Journey.create was called with correct attributes (visitedPlaces and trips are omitted)
            expect(MockedJourney.create).toHaveBeenCalledTimes(2);
            expect(MockedJourney.create).toHaveBeenCalledWith({
                _uuid: 'journey-1',
                _sequence: 1,
                name: 'Work Day'
            });
            expect(MockedJourney.create).toHaveBeenCalledWith({
                _uuid: 'journey-2',
                _sequence: 2,
                name: 'Weekend'
            });

            // Verify journeys were added to person
            expect(person.addJourney).toHaveBeenCalledTimes(2);
            expect(person.addJourney).toHaveBeenCalledWith(mockJourney1);
            expect(person.addJourney).toHaveBeenCalledWith(mockJourney2);

            // Verify visited places and trips were created for each journey
            expect(mockedCreateVisitedPlacesForJourney).toHaveBeenCalledTimes(2);
            expect(mockedCreateTripsForJourney).toHaveBeenCalledTimes(2);

            // Verify no errors
            expect(surveyObjectsWithErrors.errorsByObject.journeysByUuid).toEqual({});
        });

        it('should handle journey creation errors', async () => {
            const errors = [new Error('Invalid journey data')];

            (MockedJourney.create as jest.Mock).mockReturnValueOnce(createErrors(errors))
                .mockReturnValueOnce(createOk({
                    _uuid: 'journey-2'
                } as Journey));

            mockedCreateVisitedPlacesForJourney.mockResolvedValue();
            mockedCreateTripsForJourney.mockResolvedValue();

            await createJourneysForPerson(surveyObjectsWithErrors, person, personAttributes, home, { uuid: 'test' } as any);

            // Verify error was stored
            expect(surveyObjectsWithErrors.errorsByObject.journeysByUuid['journey-1']).toEqual(errors);

            // Verify only successful journey was added to person
            expect(person.addJourney).toHaveBeenCalledTimes(1);

            // Verify visited places and trips were only created for successful journey
            expect(mockedCreateVisitedPlacesForJourney).toHaveBeenCalledTimes(1);
            expect(mockedCreateTripsForJourney).toHaveBeenCalledTimes(1);
        });

        it('should skip journeys with undefined uuid', async () => {
            personAttributes.journeys = {
                'undefined': {
                    _uuid: 'undefined',
                    name: 'Invalid'
                },
                'journey-1': {
                    _uuid: 'journey-1',
                    name: 'Valid'
                }
            } as any;

            (MockedJourney.create as jest.Mock).mockReturnValue(createOk({
                _uuid: 'journey-1'
            } as Journey));

            mockedCreateVisitedPlacesForJourney.mockResolvedValue();
            mockedCreateTripsForJourney.mockResolvedValue();

            await createJourneysForPerson(surveyObjectsWithErrors, person, personAttributes, home, { uuid: 'test' } as any);

            // Should only create one journey (skip undefined)
            expect(MockedJourney.create).toHaveBeenCalledTimes(1);
            expect(person.addJourney).toHaveBeenCalledTimes(1);
        });

        it('should handle missing journeys attributes', async () => {
            personAttributes.journeys = undefined;

            await createJourneysForPerson(surveyObjectsWithErrors, person, personAttributes, home, { uuid: 'test' } as any);

            expect(MockedJourney.create).not.toHaveBeenCalled();
            expect(person.addJourney).not.toHaveBeenCalled();
        });

        it('should sort journeys by sequence', async () => {
            // Create journeys with mixed sequence order
            personAttributes.journeys = {
                'journey-3': {
                    _uuid: 'journey-3',
                    _sequence: 3,
                    name: 'Third'
                },
                'journey-1': {
                    _uuid: 'journey-1',
                    _sequence: 1,
                    name: 'First'
                },
                'journey-2': {
                    _uuid: 'journey-2',
                    _sequence: 2,
                    name: 'Second'
                }
            } as any;

            (MockedJourney.create as jest.Mock).mockReturnValueOnce(createOk({ _uuid: 'journey-1' } as Journey))
                .mockReturnValueOnce(createOk({ _uuid: 'journey-2' } as Journey))
                .mockReturnValueOnce(createOk({ _uuid: 'journey-3' } as Journey));

            mockedCreateVisitedPlacesForJourney.mockResolvedValue();
            mockedCreateTripsForJourney.mockResolvedValue();

            await createJourneysForPerson(surveyObjectsWithErrors, person, personAttributes, home, { uuid: 'test' } as any);

            // Verify journeys were created in sequence order (1, 2, 3)
            expect(MockedJourney.create).toHaveBeenNthCalledWith(1, expect.objectContaining({ _sequence: 1 }));
            expect(MockedJourney.create).toHaveBeenNthCalledWith(2, expect.objectContaining({ _sequence: 2 }));
            expect(MockedJourney.create).toHaveBeenNthCalledWith(3, expect.objectContaining({ _sequence: 3 }));
        });

        it('should pass correct parameters to nested factory functions', async () => {
            const mockJourney = {
                _uuid: 'journey-1'
            } as Journey;

            (MockedJourney.create as jest.Mock).mockReturnValue(createOk(mockJourney));
            mockedCreateVisitedPlacesForJourney.mockResolvedValue();
            mockedCreateTripsForJourney.mockResolvedValue();

            await createJourneysForPerson(surveyObjectsWithErrors, person, personAttributes, home, { uuid: 'test' } as any);

            // Verify visited places factory was called with correct parameters
            expect(mockedCreateVisitedPlacesForJourney).toHaveBeenCalledWith(
                surveyObjectsWithErrors,
                person,
                mockJourney,
                personAttributes.journeys!['journey-1'],
                home,
                { uuid: 'test' }
            );

            // Verify trips factory was called with correct parameters
            expect(mockedCreateTripsForJourney).toHaveBeenCalledWith(
                surveyObjectsWithErrors,
                person,
                mockJourney,
                personAttributes.journeys!['journey-1'],
                { uuid: 'test' }
            );
        });
    });
});
