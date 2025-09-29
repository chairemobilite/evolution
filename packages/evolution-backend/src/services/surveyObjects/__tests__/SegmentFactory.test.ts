/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { populateSegmentsForTrip } from '../SegmentFactory';
import { SurveyObjectsWithErrors } from 'evolution-common/lib/services/baseObjects/types';
import { Trip, ExtendedTripAttributes } from 'evolution-common/lib/services/baseObjects/Trip';
import { Segment } from 'evolution-common/lib/services/baseObjects/Segment';
import { createOk, createErrors } from 'evolution-common/lib/types/Result.type';
import { SurveyObjectsRegistry } from 'evolution-common/lib/services/baseObjects/SurveyObjectsRegistry';

// Mock Segment.create
jest.mock('evolution-common/lib/services/baseObjects/Segment', () => ({
    Segment: {
        create: jest.fn()
    }
}));
const MockedSegment = Segment as jest.MockedClass<typeof Segment>;

describe('SegmentFactory', () => {
    let surveyObjectsRegistry: SurveyObjectsRegistry;
    let surveyObjectsWithErrors: SurveyObjectsWithErrors;
    let trip: Trip;
    let tripAttributes: ExtendedTripAttributes;

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

        trip = {
            _uuid: 'trip-uuid',
            addSegment: jest.fn()
        } as unknown as Trip;

        tripAttributes = {
            _uuid: 'trip-uuid',
            segments: {
                'segment-1': {
                    _uuid: 'segment-1',
                    _sequence: 1,
                    mode: 'walk',
                    distanceMeters: 500
                },
                'segment-2': {
                    _uuid: 'segment-2',
                    _sequence: 2,
                    mode: 'bus',
                    distanceMeters: 2000
                }
            }
        } as unknown as ExtendedTripAttributes;

        // Clear all mocks
        jest.clearAllMocks();
    });

    describe('populateSegmentsForTrip', () => {
        it('should create segments successfully and add them to trip', async () => {
            const mockSegment1 = {
                _uuid: 'segment-1',
                mode: 'walk'
            } as Segment;

            const mockSegment2 = {
                _uuid: 'segment-2',
                mode: 'bus'
            } as unknown as Segment;

            (MockedSegment.create as jest.Mock).mockReturnValueOnce(createOk(mockSegment1))
                .mockReturnValueOnce(createOk(mockSegment2));

            await populateSegmentsForTrip(surveyObjectsWithErrors, trip, tripAttributes, { uuid: 'test' } as any, surveyObjectsRegistry);

            // Verify Segment.create was called with correct attributes
            expect(MockedSegment.create).toHaveBeenCalledTimes(2);
            expect(MockedSegment.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    _uuid: 'segment-1',
                    _sequence: 1,
                    mode: 'walk',
                    distanceMeters: 500
                }),
                surveyObjectsRegistry
            );
            expect(MockedSegment.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    _uuid: 'segment-2',
                    _sequence: 2,
                    mode: 'bus',
                    distanceMeters: 2000
                }),
                surveyObjectsRegistry
            );

            // Verify segments were added to trip
            expect(trip.addSegment).toHaveBeenCalledTimes(2);
            expect(trip.addSegment).toHaveBeenCalledWith(mockSegment1);
            expect(trip.addSegment).toHaveBeenCalledWith(mockSegment2);

            // Verify no errors
            expect(surveyObjectsWithErrors.errorsByObject.segmentsByUuid).toEqual({});
        });

        it('should handle segment creation errors', async () => {
            const errors = [new Error('Invalid segment data')];

            (MockedSegment.create as jest.Mock).mockReturnValueOnce(createErrors(errors))
                .mockReturnValueOnce(createOk({
                    _uuid: 'segment-2'
                } as unknown as Segment));

            await populateSegmentsForTrip(surveyObjectsWithErrors, trip, tripAttributes, { uuid: 'test' } as any, surveyObjectsRegistry);

            // Verify error was stored
            expect(surveyObjectsWithErrors.errorsByObject.segmentsByUuid['segment-1']).toEqual(errors);

            // Verify only successful segment was added to trip
            expect(trip.addSegment).toHaveBeenCalledTimes(1);
        });

        it('should skip segments with undefined uuid', async () => {
            tripAttributes.segments = {
                'undefined': {
                    _uuid: 'undefined',
                    mode: 'walk'
                },
                'segment-1': {
                    _uuid: 'segment-1',
                    mode: 'bus'
                }
            } as any;

            (MockedSegment.create as jest.Mock).mockReturnValue(createOk({
                _uuid: 'segment-1'
            } as Segment));

            await populateSegmentsForTrip(surveyObjectsWithErrors, trip, tripAttributes, { uuid: 'test' } as any, surveyObjectsRegistry);

            // Should only create one segment (skip undefined)
            expect(MockedSegment.create).toHaveBeenCalledTimes(1);
            expect(trip.addSegment).toHaveBeenCalledTimes(1);
        });

        it('should handle missing segments attributes', async () => {
            tripAttributes.segments = undefined;

            await populateSegmentsForTrip(surveyObjectsWithErrors, trip, tripAttributes, { uuid: 'test' } as any, surveyObjectsRegistry);

            expect(MockedSegment.create).not.toHaveBeenCalled();
            expect(trip.addSegment).not.toHaveBeenCalled();
        });

        it('should handle empty segments object', async () => {
            tripAttributes.segments = {} as any;

            await populateSegmentsForTrip(surveyObjectsWithErrors, trip, tripAttributes, { uuid: 'test' } as any, surveyObjectsRegistry);

            expect(MockedSegment.create).not.toHaveBeenCalled();
            expect(trip.addSegment).not.toHaveBeenCalled();
        });

        it('should sort segments by sequence', async () => {
            // Create segments with mixed sequence order
            tripAttributes.segments = {
                'segment-3': {
                    _uuid: 'segment-3',
                    _sequence: 3,
                    mode: 'car'
                },
                'segment-1': {
                    _uuid: 'segment-1',
                    _sequence: 1,
                    mode: 'walk'
                },
                'segment-2': {
                    _uuid: 'segment-2',
                    _sequence: 2,
                    mode: 'bus'
                }
            } as any;

            (MockedSegment.create as jest.Mock).mockReturnValueOnce(createOk({ _uuid: 'segment-1' } as Segment))
                .mockReturnValueOnce(createOk({ _uuid: 'segment-2' } as Segment))
                .mockReturnValueOnce(createOk({ _uuid: 'segment-3' } as Segment));

            await populateSegmentsForTrip(surveyObjectsWithErrors, trip, tripAttributes, { uuid: 'test' } as any, surveyObjectsRegistry);

            // Verify segments were created in sequence order (1, 2, 3)
            expect(MockedSegment.create).toHaveBeenNthCalledWith(1, expect.objectContaining({ _sequence: 1 }), surveyObjectsRegistry);
            expect(MockedSegment.create).toHaveBeenNthCalledWith(2, expect.objectContaining({ _sequence: 2 }), surveyObjectsRegistry);
            expect(MockedSegment.create).toHaveBeenNthCalledWith(3, expect.objectContaining({ _sequence: 3 }), surveyObjectsRegistry);
        });

        it('should handle segments with zero or missing sequence', async () => {
            tripAttributes.segments = {
                'segment-no-seq': {
                    _uuid: 'segment-no-seq',
                    mode: 'walk'
                    // No _sequence property
                },
                'segment-zero': {
                    _uuid: 'segment-zero',
                    _sequence: 0,
                    mode: 'bus'
                },
                'segment-1': {
                    _uuid: 'segment-1',
                    _sequence: 1,
                    mode: 'car'
                }
            } as any;

            (MockedSegment.create as jest.Mock).mockReturnValueOnce(createOk({ _uuid: 'segment-no-seq' } as Segment))
                .mockReturnValueOnce(createOk({ _uuid: 'segment-zero' } as Segment))
                .mockReturnValueOnce(createOk({ _uuid: 'segment-1' } as Segment));

            await populateSegmentsForTrip(surveyObjectsWithErrors, trip, tripAttributes, { uuid: 'test' } as any, surveyObjectsRegistry);

            // Verify all segments were created (missing sequence defaults to 0)
            expect(MockedSegment.create).toHaveBeenCalledTimes(3);
            expect(trip.addSegment).toHaveBeenCalledTimes(3);
        });

        it('should handle segments with various transport modes', async () => {
            tripAttributes.segments = {
                'walk-segment': {
                    _uuid: 'walk-segment',
                    _sequence: 1,
                    mode: 'walk'
                },
                'transit-segment': {
                    _uuid: 'transit-segment',
                    _sequence: 2,
                    mode: 'transit'
                },
                'car-segment': {
                    _uuid: 'car-segment',
                    _sequence: 3,
                    mode: 'carDriver'
                },
                'bike-segment': {
                    _uuid: 'bike-segment',
                    _sequence: 4,
                    mode: 'bicycle'
                }
            } as any;

            (MockedSegment.create as jest.Mock).mockReturnValue(createOk({} as Segment));

            await populateSegmentsForTrip(surveyObjectsWithErrors, trip, tripAttributes, { uuid: 'test' } as any, surveyObjectsRegistry);

            // Verify all different modes were processed
            expect(MockedSegment.create).toHaveBeenCalledWith(expect.objectContaining({ mode: 'walk' }), surveyObjectsRegistry);
            expect(MockedSegment.create).toHaveBeenCalledWith(expect.objectContaining({ mode: 'transit' }), surveyObjectsRegistry);
            expect(MockedSegment.create).toHaveBeenCalledWith(expect.objectContaining({ mode: 'carDriver' }), surveyObjectsRegistry);
            expect(MockedSegment.create).toHaveBeenCalledWith(expect.objectContaining({ mode: 'bicycle' }), surveyObjectsRegistry);

            expect(MockedSegment.create).toHaveBeenCalledTimes(4);
            expect(trip.addSegment).toHaveBeenCalledTimes(4);
        });
    });
});
