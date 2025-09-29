/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { createTripsForJourney } from '../TripFactory';
import { createSegmentsForTrip } from '../SegmentFactory';
import { SurveyObjectsWithErrors } from 'evolution-common/lib/services/baseObjects/types';
import { Person } from 'evolution-common/lib/services/baseObjects/Person';
import { Journey, ExtendedJourneyAttributes } from 'evolution-common/lib/services/baseObjects/Journey';
import { Trip } from 'evolution-common/lib/services/baseObjects/Trip';
import { VisitedPlace } from 'evolution-common/lib/services/baseObjects/VisitedPlace';
import { createOk, createErrors } from 'evolution-common/lib/types/Result.type';

// Mock dependencies
jest.mock('evolution-common/lib/services/baseObjects/Trip', () => ({
    Trip: {
        create: jest.fn()
    }
}));
jest.mock('../SegmentFactory');

const MockedTrip = Trip as jest.MockedClass<typeof Trip>;
const mockedCreateSegmentsForTrip = createSegmentsForTrip as jest.MockedFunction<typeof createSegmentsForTrip>;

describe('TripFactory', () => {
    let surveyObjectsWithErrors: SurveyObjectsWithErrors;
    let person: Person;
    let journey: Journey;
    let journeyAttributes: ExtendedJourneyAttributes;

    beforeEach(() => {
        surveyObjectsWithErrors = {
            interview: undefined,
            household: undefined,
            home: undefined,
            errorsByObject: {
                interview: [],
                interviewUuid: '123',
                homeUuid: '123',
                householdUuid: '123',
                home: [],
                household: [],
                personsByUuid: {},
                journeysByUuid: {},
                visitedPlacesByUuid: {},
                tripsByUuid: {},
                segmentsByUuid: {}
            }
        };

        const mockOrigin = {
            _uuid: 'origin-vp-uuid'
        } as VisitedPlace;

        const mockDestination = {
            _uuid: 'destination-vp-uuid'
        } as VisitedPlace;

        person = {
            _uuid: 'person-uuid',
            findVisitedPlaceByUuid: jest.fn()
                .mockImplementation((uuid: string) => {
                    if (uuid === 'origin-vp-uuid') return mockOrigin;
                    if (uuid === 'destination-vp-uuid') return mockDestination;
                    return undefined;
                })
        } as unknown as Person;

        journey = {
            _uuid: 'journey-uuid',
            addTrip: jest.fn()
        } as unknown as Journey;

        journeyAttributes = {
            _uuid: 'journey-uuid',
            trips: {
                'trip-1': {
                    _uuid: 'trip-1',
                    _sequence: 1,
                    _originVisitedPlaceUuid: 'origin-vp-uuid',
                    _destinationVisitedPlaceUuid: 'destination-vp-uuid',
                    segments: {}
                },
                'trip-2': {
                    _uuid: 'trip-2',
                    _sequence: 2,
                    _originVisitedPlaceUuid: 'destination-vp-uuid',
                    _destinationVisitedPlaceUuid: 'origin-vp-uuid',
                    segments: {}
                }
            }
        } as unknown as ExtendedJourneyAttributes;

        // Clear all mocks
        jest.clearAllMocks();
    });

    describe('createTripsForJourney', () => {
        it('should create trips successfully and add them to journey', async () => {
            const mockTrip1 = {
                _uuid: 'trip-1',
                origin: null,
                destination: null,
                segments: [],
                getSegmentsWithoutWalkingInMultimode: jest.fn().mockReturnValue([]),
                setupStartAndEndTimes: jest.fn()
            } as unknown as Trip;

            const mockTrip2 = {
                _uuid: 'trip-2',
                origin: null,
                destination: null,
                segments: [],
                getSegmentsWithoutWalkingInMultimode: jest.fn().mockReturnValue([]),
                setupStartAndEndTimes: jest.fn()
            } as unknown as Trip;

            (MockedTrip.create as jest.Mock).mockReturnValueOnce(createOk(mockTrip1))
                .mockReturnValueOnce(createOk(mockTrip2));

            mockedCreateSegmentsForTrip.mockResolvedValue();

            await createTripsForJourney(surveyObjectsWithErrors, person, journey, journeyAttributes, { uuid: 'test' } as any);

            // Verify Trip.create was called with correct attributes (segments are omitted)
            expect(MockedTrip.create).toHaveBeenCalledTimes(2);
            expect(MockedTrip.create).toHaveBeenCalledWith({
                _uuid: 'trip-1',
                _sequence: 1,
                _originVisitedPlaceUuid: 'origin-vp-uuid',
                _destinationVisitedPlaceUuid: 'destination-vp-uuid'
            });
            expect(MockedTrip.create).toHaveBeenCalledWith({
                _uuid: 'trip-2',
                _sequence: 2,
                _originVisitedPlaceUuid: 'destination-vp-uuid',
                _destinationVisitedPlaceUuid: 'origin-vp-uuid'
            });

            // Verify trips were added to journey
            expect(journey.addTrip).toHaveBeenCalledTimes(2);
            expect(journey.addTrip).toHaveBeenCalledWith(mockTrip1);
            expect(journey.addTrip).toHaveBeenCalledWith(mockTrip2);

            // Verify segments were created for each trip
            expect(mockedCreateSegmentsForTrip).toHaveBeenCalledTimes(2);

            // Verify no errors
            expect(surveyObjectsWithErrors.errorsByObject.tripsByUuid).toEqual({});
        });

        it('should set origin and destination visited places', async () => {
            const mockTrip = {
                _uuid: 'trip-1',
                origin: null,
                destination: null,
                getSegmentsWithoutWalkingInMultimode: jest.fn().mockReturnValue([]),
                setupStartAndEndTimes: jest.fn()
            } as unknown as Trip;

            (MockedTrip.create as jest.Mock).mockReturnValue(createOk(mockTrip));
            mockedCreateSegmentsForTrip.mockResolvedValue();

            await createTripsForJourney(surveyObjectsWithErrors, person, journey, journeyAttributes, { uuid: 'test' } as any);

            // Verify findVisitedPlaceByUuid was called for origin and destination
            expect(person.findVisitedPlaceByUuid).toHaveBeenCalledWith('origin-vp-uuid');
            expect(person.findVisitedPlaceByUuid).toHaveBeenCalledWith('destination-vp-uuid');

            // Verify origin and destination were set on trip
            expect(mockTrip.origin).toBeDefined();
            expect(mockTrip.destination).toBeDefined();
        });

        it('should handle missing origin/destination visited places', async () => {
            const mockTrip = {
                _uuid: 'trip-1',
                origin: null,
                destination: null,
                getSegmentsWithoutWalkingInMultimode: jest.fn().mockReturnValue([]),
                setupStartAndEndTimes: jest.fn()
            } as unknown as Trip;

            // Mock person to return undefined for visited places
            (person.findVisitedPlaceByUuid as jest.Mock).mockReturnValue(undefined);

            (MockedTrip.create as jest.Mock).mockReturnValue(createOk(mockTrip));
            mockedCreateSegmentsForTrip.mockResolvedValue();

            await createTripsForJourney(surveyObjectsWithErrors, person, journey, journeyAttributes, { uuid: 'test' } as any);

            // Verify origin and destination remain null
            expect(mockTrip.origin).toBeNull();
            expect(mockTrip.destination).toBeNull();

            // Should still add trip to journey
            expect(journey.addTrip).toHaveBeenCalledWith(mockTrip);
        });

        it('should call getSegmentsWithoutWalkingInMultimode', async () => {
            const mockTrip = {
                _uuid: 'trip-1',
                origin: null,
                destination: null,
                segments: ['original-segment'],
                getSegmentsWithoutWalkingInMultimode: jest.fn().mockReturnValue(['filtered-segment']),
                setupStartAndEndTimes: jest.fn()
            } as unknown as Trip;

            (MockedTrip.create as jest.Mock).mockReturnValue(createOk(mockTrip));
            mockedCreateSegmentsForTrip.mockResolvedValue();

            await createTripsForJourney(surveyObjectsWithErrors, person, journey, journeyAttributes, { uuid: 'test' } as any);

            // Verify the method was called
            expect(mockTrip.getSegmentsWithoutWalkingInMultimode).toHaveBeenCalled();

            // Verify segments were updated
            expect(mockTrip.segments).toEqual(['filtered-segment']);
        });

        it('should handle trip creation errors', async () => {
            const errors = [new Error('Invalid trip data')];

            (MockedTrip.create as jest.Mock).mockReturnValueOnce(createErrors(errors))
                .mockReturnValueOnce(createOk({
                    _uuid: 'trip-2',
                    origin: null,
                    destination: null,
                    segments: [],
                    getSegmentsWithoutWalkingInMultimode: jest.fn().mockReturnValue([]),
                    setupStartAndEndTimes: jest.fn()
                } as unknown as Trip));

            mockedCreateSegmentsForTrip.mockResolvedValue();

            await createTripsForJourney(surveyObjectsWithErrors, person, journey, journeyAttributes, { uuid: 'test' } as any);

            // Verify error was stored
            expect(surveyObjectsWithErrors.errorsByObject.tripsByUuid['trip-1']).toEqual(errors);

            // Verify only successful trip was added to journey
            expect(journey.addTrip).toHaveBeenCalledTimes(1);

            // Verify segments were only created for successful trip
            expect(mockedCreateSegmentsForTrip).toHaveBeenCalledTimes(1);
        });

        it('should skip trips with undefined uuid', async () => {
            journeyAttributes.trips = {
                'undefined': {
                    _uuid: 'undefined',
                    _sequence: 1
                },
                'trip-1': {
                    _uuid: 'trip-1',
                    _sequence: 2
                }
            } as any;

            (MockedTrip.create as jest.Mock).mockReturnValue(createOk({
                _uuid: 'trip-1',
                getSegmentsWithoutWalkingInMultimode: jest.fn().mockReturnValue([]),
                setupStartAndEndTimes: jest.fn()
            } as unknown as Trip));

            mockedCreateSegmentsForTrip.mockResolvedValue();

            await createTripsForJourney(surveyObjectsWithErrors, person, journey, journeyAttributes, { uuid: 'test' } as any);

            // Should only create one trip (skip undefined)
            expect(MockedTrip.create).toHaveBeenCalledTimes(1);
            expect(journey.addTrip).toHaveBeenCalledTimes(1);
        });

        it('should handle missing trips attributes', async () => {
            journeyAttributes.trips = undefined;

            await createTripsForJourney(surveyObjectsWithErrors, person, journey, journeyAttributes, { uuid: 'test' } as any);

            expect(MockedTrip.create).not.toHaveBeenCalled();
            expect(journey.addTrip).not.toHaveBeenCalled();
        });

        it('should sort trips by sequence', async () => {
            // Create trips with mixed sequence order
            journeyAttributes.trips = {
                'trip-3': {
                    _uuid: 'trip-3',
                    _sequence: 3
                },
                'trip-1': {
                    _uuid: 'trip-1',
                    _sequence: 1
                },
                'trip-2': {
                    _uuid: 'trip-2',
                    _sequence: 2
                }
            } as any;

            (MockedTrip.create as jest.Mock).mockReturnValueOnce(createOk({
                _uuid: 'trip-1',
                getSegmentsWithoutWalkingInMultimode: jest.fn().mockReturnValue([]),
                setupStartAndEndTimes: jest.fn()
            } as unknown as Trip))
                .mockReturnValueOnce(createOk({
                    _uuid: 'trip-2',
                    getSegmentsWithoutWalkingInMultimode: jest.fn().mockReturnValue([]),
                    setupStartAndEndTimes: jest.fn()
                } as unknown as Trip))
                .mockReturnValueOnce(createOk({
                    _uuid: 'trip-3',
                    getSegmentsWithoutWalkingInMultimode: jest.fn().mockReturnValue([]),
                    setupStartAndEndTimes: jest.fn()
                } as unknown as Trip));

            mockedCreateSegmentsForTrip.mockResolvedValue();

            await createTripsForJourney(surveyObjectsWithErrors, person, journey, journeyAttributes, { uuid: 'test' } as any);

            // Verify trips were created in sequence order (1, 2, 3)
            expect(MockedTrip.create).toHaveBeenNthCalledWith(1, expect.objectContaining({ _sequence: 1 }));
            expect(MockedTrip.create).toHaveBeenNthCalledWith(2, expect.objectContaining({ _sequence: 2 }));
            expect(MockedTrip.create).toHaveBeenNthCalledWith(3, expect.objectContaining({ _sequence: 3 }));
        });

        it('should pass correct parameters to segment factory', async () => {
            const mockTrip = {
                _uuid: 'trip-1',
                origin: null,
                destination: null,
                segments: [],
                getSegmentsWithoutWalkingInMultimode: jest.fn().mockReturnValue([]),
                setupStartAndEndTimes: jest.fn()
            } as unknown as Trip;

            (MockedTrip.create as jest.Mock).mockReturnValue(createOk(mockTrip));
            mockedCreateSegmentsForTrip.mockResolvedValue();

            await createTripsForJourney(surveyObjectsWithErrors, person, journey, journeyAttributes, { uuid: 'test' } as any);

            // Verify segment factory was called with correct parameters
            expect(mockedCreateSegmentsForTrip).toHaveBeenCalledWith(
                surveyObjectsWithErrors,
                mockTrip,
                journeyAttributes.trips!['trip-1'],
                { uuid: 'test' }
            );
        });
    });
});
