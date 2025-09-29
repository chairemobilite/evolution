/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { populateJourneysForPerson } from '../JourneyFactory';
import { populateVisitedPlacesForJourney } from '../VisitedPlaceFactory';
import { populateTripsForJourney } from '../TripFactory';
import { SurveyObjectsWithErrors } from 'evolution-common/lib/services/baseObjects/types';
import { Person, ExtendedPersonAttributes } from 'evolution-common/lib/services/baseObjects/Person';
import { Journey } from 'evolution-common/lib/services/baseObjects/Journey';
import { Home } from 'evolution-common/lib/services/baseObjects/Home';
import { createOk, createErrors } from 'evolution-common/lib/types/Result.type';
import { SurveyObjectsRegistry } from 'evolution-common/lib/services/baseObjects/SurveyObjectsRegistry';

// Mock dependencies
jest.mock('evolution-common/lib/services/baseObjects/Journey', () => ({
    Journey: {
        create: jest.fn()
    }
}));
jest.mock('../VisitedPlaceFactory');
jest.mock('../TripFactory');

const MockedJourney = Journey as jest.MockedClass<typeof Journey>;
const mockedpopulateVisitedPlacesForJourney = populateVisitedPlacesForJourney as jest.MockedFunction<typeof populateVisitedPlacesForJourney>;
const mockedpopulateTripsForJourney = populateTripsForJourney as jest.MockedFunction<typeof populateTripsForJourney>;

describe('JourneyFactory', () => {
    let surveyObjectsRegistry: SurveyObjectsRegistry;
    let surveyObjectsWithErrors: SurveyObjectsWithErrors;
    let person: Person;
    let personAttributes: ExtendedPersonAttributes;
    let home: Home;

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

    describe('populateJourneysForPerson', () => {
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

            mockedpopulateVisitedPlacesForJourney.mockResolvedValue();
            mockedpopulateTripsForJourney.mockResolvedValue();

            await populateJourneysForPerson(surveyObjectsWithErrors, person, personAttributes, home, { uuid: 'test' } as any, surveyObjectsRegistry);

            // Verify Journey.create was called with correct attributes (visitedPlaces and trips are omitted)
            expect(MockedJourney.create).toHaveBeenCalledTimes(2);
            expect(MockedJourney.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    _uuid: 'journey-1',
                    _sequence: 1,
                    name: 'Work Day'
                }),
                surveyObjectsRegistry
            );
            expect(MockedJourney.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    _uuid: 'journey-2',
                    _sequence: 2,
                    name: 'Weekend'
                }),
                surveyObjectsRegistry
            );

            // Verify journeys were added to person
            expect(person.addJourney).toHaveBeenCalledTimes(2);
            expect(person.addJourney).toHaveBeenCalledWith(mockJourney1);
            expect(person.addJourney).toHaveBeenCalledWith(mockJourney2);

            // Verify visited places and trips were created for each journey
            expect(mockedpopulateVisitedPlacesForJourney).toHaveBeenCalledTimes(2);
            expect(mockedpopulateTripsForJourney).toHaveBeenCalledTimes(2);

            // Verify no errors
            expect(surveyObjectsWithErrors.errorsByObject.journeysByUuid).toEqual({});
        });

        it('should handle journey creation errors', async () => {
            const errors = [new Error('Invalid journey data')];

            (MockedJourney.create as jest.Mock).mockReturnValueOnce(createErrors(errors))
                .mockReturnValueOnce(createOk({
                    _uuid: 'journey-2'
                } as Journey));

            mockedpopulateVisitedPlacesForJourney.mockResolvedValue();
            mockedpopulateTripsForJourney.mockResolvedValue();

            await populateJourneysForPerson(surveyObjectsWithErrors, person, personAttributes, home, { uuid: 'test' } as any, surveyObjectsRegistry);

            // Verify error was stored
            expect(surveyObjectsWithErrors.errorsByObject.journeysByUuid['journey-1']).toEqual(errors);

            // Verify only successful journey was added to person
            expect(person.addJourney).toHaveBeenCalledTimes(1);

            // Verify visited places and trips were only created for successful journey
            expect(mockedpopulateVisitedPlacesForJourney).toHaveBeenCalledTimes(1);
            expect(mockedpopulateTripsForJourney).toHaveBeenCalledTimes(1);
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

            mockedpopulateVisitedPlacesForJourney.mockResolvedValue();
            mockedpopulateTripsForJourney.mockResolvedValue();

            await populateJourneysForPerson(surveyObjectsWithErrors, person, personAttributes, home, { uuid: 'test' } as any, surveyObjectsRegistry);

            // Should only create one journey (skip undefined)
            expect(MockedJourney.create).toHaveBeenCalledTimes(1);
            expect(person.addJourney).toHaveBeenCalledTimes(1);
        });

        it('should handle missing journeys attributes', async () => {
            personAttributes.journeys = undefined;

            await populateJourneysForPerson(surveyObjectsWithErrors, person, personAttributes, home, { uuid: 'test' } as any, surveyObjectsRegistry);

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

            mockedpopulateVisitedPlacesForJourney.mockResolvedValue();
            mockedpopulateTripsForJourney.mockResolvedValue();

            await populateJourneysForPerson(surveyObjectsWithErrors, person, personAttributes, home, { uuid: 'test' } as any, surveyObjectsRegistry);

            // Verify journeys were created in sequence order (1, 2, 3)
            expect(MockedJourney.create).toHaveBeenNthCalledWith(1, expect.objectContaining({ _sequence: 1 }), surveyObjectsRegistry);
            expect(MockedJourney.create).toHaveBeenNthCalledWith(2, expect.objectContaining({ _sequence: 2 }), surveyObjectsRegistry);
            expect(MockedJourney.create).toHaveBeenNthCalledWith(3, expect.objectContaining({ _sequence: 3 }), surveyObjectsRegistry);
        });

        it('should pass correct parameters to nested factory functions', async () => {
            const mockJourney = {
                _uuid: 'journey-1'
            } as Journey;

            (MockedJourney.create as jest.Mock).mockReturnValue(createOk(mockJourney));
            mockedpopulateVisitedPlacesForJourney.mockResolvedValue();
            mockedpopulateTripsForJourney.mockResolvedValue();

            await populateJourneysForPerson(surveyObjectsWithErrors, person, personAttributes, home, { uuid: 'test' } as any, surveyObjectsRegistry);

            // Verify visited places factory was called with correct parameters
            expect(mockedpopulateVisitedPlacesForJourney).toHaveBeenCalledWith(
                surveyObjectsWithErrors,
                person,
                mockJourney,
                personAttributes.journeys!['journey-1'],
                home,
                { uuid: 'test' },
                surveyObjectsRegistry
            );

            // Verify trips factory was called with correct parameters
            expect(mockedpopulateTripsForJourney).toHaveBeenCalledWith(
                surveyObjectsWithErrors,
                person,
                mockJourney,
                personAttributes.journeys!['journey-1'],
                { uuid: 'test' },
                surveyObjectsRegistry
            );
        });
    });
});
