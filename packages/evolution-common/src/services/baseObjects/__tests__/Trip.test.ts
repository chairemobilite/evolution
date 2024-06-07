/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Trip, TripAttributes, ExtendedTripAttributes, tripAttributes } from '../Trip';
import { VisitedPlace, VisitedPlaceAttributes, ExtendedVisitedPlaceAttributes } from '../VisitedPlace';
import { Segment, SegmentAttributes } from '../Segment';
import { Junction, JunctionAttributes } from '../Junction';
import { v4 as uuidV4 } from 'uuid';
import { WeightMethod, WeightMethodAttributes } from '../WeightMethod';
import { isOk, hasErrors, unwrap } from '../../../types/Result.type';
import { startEndDateAndTimesAttributes } from '../StartEndable';
import { Mode, ModeCategory } from '../attributeTypes/SegmentAttributes';

describe('Trip', () => {
    const weightMethodAttributes: WeightMethodAttributes = {
        _uuid: uuidV4(),
        shortname: 'sample-shortname',
        name: 'Sample Weight Method',
        description: 'Sample weight method description',
    };

    const validAttributes: TripAttributes = {
        _uuid: uuidV4(),
        startDate: '2023-05-21',
        endDate: '2023-05-21',
        startTime: 3600,
        endTime: 6420,
        startTimePeriod: 'am',
        endTimePeriod: 'pm',
        _weights: [{ weight: 1.5, method: new WeightMethod(weightMethodAttributes) }],
        _isValid: true,
    };

    const extendedAttributes: ExtendedTripAttributes = {
        ...validAttributes,
        customAttribute: 'Custom Value',
        startPlace: {
            _uuid: uuidV4(),
            geography: {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [0, 0],
                },
                properties: {},
            },
            _isValid: true,
        },
        endPlace: {
            _uuid: uuidV4(),
            geography: {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [1, 1],
                },
                properties: {},
            },
            _isValid: true,
        },
        segments: [
            {
                _uuid: uuidV4(),
                mode: 'walk',
                _isValid: true,
            },
            {
                _uuid: uuidV4(),
                mode: 'bicycle',
                _isValid: true,
            },
        ],
        junctions: [
            {
                _uuid: uuidV4(),
                geography: {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [0, 0],
                    },
                    properties: {},
                },
                _isValid: true,
            },
            {
                _uuid: uuidV4(),
                geography: {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [1, 1],
                    },
                    properties: {},
                },
                _isValid: true,
            },
        ],
    };

    test('should create a Trip instance with valid attributes', () => {
        const trip = new Trip(validAttributes);
        expect(trip).toBeInstanceOf(Trip);
        expect(trip.attributes).toEqual(validAttributes);
    });

    test('should have a validateParams section for each attribute', () => {
        const validateParamsCode = Trip.validateParams.toString();
        tripAttributes.filter((attribute) => attribute !== '_uuid' && attribute !== '_weights' && !(startEndDateAndTimesAttributes as unknown as string[]).includes(attribute)).forEach((attributeName) => {
            expect(validateParamsCode).toContain('\'' + attributeName + '\'');
        });
    });

    test('should get uuid', () => {
        const trip = new Trip({ ...validAttributes, _uuid: '11b78eb3-a5d8-484d-805d-1f947160bb9e' });
        expect(trip._uuid).toBe('11b78eb3-a5d8-484d-805d-1f947160bb9e');
    });

    test('should create a Trip instance with valid attributes', () => {
        const result = Trip.create(validAttributes);
        expect(isOk(result)).toBe(true);
        expect(unwrap(result)).toBeInstanceOf(Trip);
    });

    test('should return an error for invalid params', () => {
        const invalidAttributes = 'foo' as any;
        const result = Trip.create(invalidAttributes);
        expect(hasErrors(result)).toBe(true);
        expect((unwrap(result) as Error[]).length).toBeGreaterThan(0);
    });

    test('should create a Trip instance with extended attributes', () => {
        const result = Trip.create(extendedAttributes);
        expect(isOk(result)).toBe(true);
        expect(unwrap(result)).toBeInstanceOf(Trip);
    });

    test('should return errors for invalid attributes', () => {
        const invalidAttributes = { ...validAttributes, startTime: 'invalid' };
        const result = Trip.create(invalidAttributes);
        expect(hasErrors(result)).toBe(true);
        expect((unwrap(result) as Error[]).length).toBeGreaterThan(0);
    });

    test('should unserialize a Trip instance', () => {
        const trip = Trip.unserialize(validAttributes);
        expect(trip).toBeInstanceOf(Trip);
        expect(trip.attributes).toEqual(validAttributes);
    });

    test('should validate Trip attributes', () => {
        const errors = Trip.validateParams(validAttributes);
        expect(errors).toHaveLength(0);
    });

    test('should return errors for invalid Trip attributes', () => {
        const invalidAttributes = { ...validAttributes, startDate: 'invalid' };
        const errors = Trip.validateParams(invalidAttributes);
        expect(errors).toHaveLength(1);
    });

    test('should validate a Trip instance', () => {
        const trip = new Trip(validAttributes);
        expect(trip.validate()).toBe(true);
        expect(trip.isValid()).toBe(true);
    });

    test('should create a Trip instance with custom attributes', () => {
        const customAttributes = {
            customAttribute1: 'value1',
            customAttribute2: 'value2',
        };
        const tripAttributes = {
            ...validAttributes,
            ...customAttributes,
        };
        const trip = new Trip(tripAttributes);
        expect(trip).toBeInstanceOf(Trip);
        expect(trip.attributes).toEqual(validAttributes);
        expect(trip.customAttributes).toEqual(customAttributes);
    });

    describe('validateParams', () => {
        test.each([
            ['startDate', 123],
            ['endDate', 123],
            ['startTime', 'invalid'],
            ['endTime', 'invalid'],
            ['startTimePeriod', 123],
            ['endTimePeriod', 123],
        ])('should return an error for invalid %s', (param, value) => {
            const invalidAttributes = { ...validAttributes, [param]: value };
            const errors = Trip.validateParams(invalidAttributes);
            expect(errors[0].toString()).toContain(param);
            expect(errors).toHaveLength(1);
        });

        test('should return no errors for valid attributes', () => {
            const errors = Trip.validateParams(validAttributes);
            expect(errors).toHaveLength(0);
        });
    });

    describe('Getters and Setters', () => {
        test.each([
            ['startDate', '2023-05-22'],
            ['endDate', '2023-05-22'],
            ['startTime', 7200],
            ['endTime', 10800],
            ['startTimePeriod', 'am'],
            ['endTimePeriod', 'pm'],
            ['journeyUuid', uuidV4()],
            ['tripChainUuid', uuidV4()],
            ['_isValid', false],
            ['_weights', [{ weight: 2.0, method: new WeightMethod(weightMethodAttributes) }]],
        ])('should set and get %s', (attribute, value) => {
            const trip = new Trip(validAttributes);
            trip[attribute] = value;
            expect(trip[attribute]).toEqual(value);
        });

        describe('Getters for attributes with no setters', () => {
            test.each([
                ['_uuid', extendedAttributes._uuid],
                ['customAttributes', { customAttribute: extendedAttributes.customAttribute }],
                ['attributes', validAttributes],
            ])('should set and get %s', (attribute, value) => {
                const trip = new Trip(extendedAttributes);
                expect(trip[attribute]).toEqual(value);
            });
        });

        test.each([
            ['startPlace', new VisitedPlace(extendedAttributes.startPlace as ExtendedVisitedPlaceAttributes)],
            ['endPlace', new VisitedPlace(extendedAttributes.endPlace as ExtendedVisitedPlaceAttributes)],
            ['origin', new VisitedPlace(extendedAttributes.startPlace as ExtendedVisitedPlaceAttributes)],
            ['destination', new VisitedPlace(extendedAttributes.endPlace as ExtendedVisitedPlaceAttributes)],
            ['segments', extendedAttributes.segments?.map((segment) => new Segment(segment))],
            ['junctions', extendedAttributes.junctions?.map((junction) => new Junction(junction))],
        ])('should set and get %s', (attribute, value) => {
            const trip = new Trip(validAttributes);
            trip[attribute] = value;
            expect(trip[attribute]).toEqual(value);
        });
    });

    describe('Composed Attributes', () => {
        test('should create VisitedPlace instances for startPlace and endPlace when creating a Trip instance', () => {
            const startPlaceAttributes: VisitedPlaceAttributes = {
                _uuid: uuidV4(),
                geography: {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [0, 0],
                    },
                    properties: {},
                },
                _isValid: true,
            };

            const endPlaceAttributes: VisitedPlaceAttributes = {
                _uuid: uuidV4(),
                geography: {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [1, 1],
                    },
                    properties: {},
                },
                _isValid: true,
            };

            const tripAttributes: ExtendedTripAttributes = {
                ...validAttributes,
                startPlace: startPlaceAttributes,
                endPlace: endPlaceAttributes,
            };

            const result = Trip.create(tripAttributes);
            expect(isOk(result)).toBe(true);
            const trip = unwrap(result) as Trip;
            expect(trip.startPlace).toBeDefined();
            expect(trip.startPlace?.attributes).toEqual(startPlaceAttributes);
            expect(trip.origin).toBeDefined();
            expect(trip.origin?.attributes).toEqual(startPlaceAttributes);
            expect(trip.endPlace).toBeDefined();
            expect(trip.endPlace?.attributes).toEqual(endPlaceAttributes);
            expect(trip.destination).toBeDefined();
            expect(trip.destination?.attributes).toEqual(endPlaceAttributes);
        });

        test('should create Segment instances for segments when creating a Trip instance', () => {
            const segmentAttributes: SegmentAttributes[] = [
                {
                    _uuid: uuidV4(),
                    mode: 'walk',
                    _isValid: true,
                },
                {
                    _uuid: uuidV4(),
                    mode: 'bicycle',
                    _isValid: true,
                },
            ];

            const tripAttributes: ExtendedTripAttributes = {
                ...validAttributes,
                segments: segmentAttributes,
            };

            const result = Trip.create(tripAttributes);
            expect(isOk(result)).toBe(true);
            const trip = unwrap(result) as Trip;
            expect(trip.segments).toBeDefined();
            expect(trip.segments?.length).toBe(2);
            expect(trip.segments?.[0].attributes).toEqual(segmentAttributes[0]);
            expect(trip.segments?.[1].attributes).toEqual(segmentAttributes[1]);
        });

        test('should create Junction instances for junctions when creating a Trip instance', () => {
            const junctionAttributes: JunctionAttributes[] = [
                {
                    _uuid: uuidV4(),
                    geography: {
                        type: 'Feature',
                        geometry: {
                            type: 'Point',
                            coordinates: [0, 0],
                        },
                        properties: {},
                    },
                    _isValid: true,
                },
                {
                    _uuid: uuidV4(),
                    geography: {
                        type: 'Feature',
                        geometry: {
                            type: 'Point',
                            coordinates: [1, 1],
                        },
                        properties: {},
                    },
                    _isValid: true,
                },
            ];

            const tripAttributes: ExtendedTripAttributes = {
                ...validAttributes,
                junctions: junctionAttributes,
            };

            const result = Trip.create(tripAttributes);
            expect(isOk(result)).toBe(true);
            const trip = unwrap(result) as Trip;
            expect(trip.junctions).toBeDefined();
            expect(trip.junctions?.length).toBe(2);
            expect(trip.junctions?.[0].attributes).toEqual(junctionAttributes[0]);
            expect(trip.junctions?.[1].attributes).toEqual(junctionAttributes[1]);
        });
    });


    describe('Trip methods', () => {
        let trip: Trip;

        beforeEach(() => {
            trip = new Trip(validAttributes);
        });

        describe('hasSegments', () => {
            test('should return false if segments is undefined', () => {
                trip.segments = undefined;
                expect(trip.hasSegments()).toBe(false);
            });

            test('should return false if segments is an empty array', () => {
                trip.segments = [];
                expect(trip.hasSegments()).toBe(false);
            });

            test('should return true if segments is not empty', () => {
                trip.segments = [new Segment({ mode: 'walk' })];
                expect(trip.hasSegments()).toBe(true);
            });
        });

        describe('hasTransit', () => {
            test('should return false if segments is undefined', () => {
                trip.segments = undefined;
                expect(trip.hasTransit()).toBe(false);
            });

            test('should return false if segments is an empty array', () => {
                trip.segments = [];
                expect(trip.hasTransit()).toBe(false);
            });

            test('should return false if segments has no transit mode', () => {
                trip.segments = [new Segment({ mode: 'walk' }), new Segment({ mode: 'bicycle' })];
                expect(trip.hasTransit()).toBe(false);
            });

            test('should return true if segments has at least one transit mode', () => {
                trip.segments = [new Segment({ mode: 'walk' }), new Segment({ mode: 'transitBus' })];
                expect(trip.hasTransit()).toBe(true);
            });
        });

        describe('getModes', () => {
            test('should return an empty array if segments is undefined', () => {
                trip.segments = undefined;
                expect(trip.getModes()).toEqual([]);
            });

            test('should return an empty array if segments is an empty array', () => {
                trip.segments = [];
                expect(trip.getModes()).toEqual([]);
            });

            test('should return the modes of the segments', () => {
                trip.segments = [new Segment({ mode: 'walk' }), new Segment({ mode: 'transitBus' }), new Segment({ mode: 'bicycle' })];
                expect(trip.getModes()).toEqual(['walk', 'transitBus', 'bicycle']);
            });
        });

        describe('getModeCategories', () => {
            test('should return an empty array if segments is undefined', () => {
                trip.segments = undefined;
                expect(trip.getModeCategories()).toEqual([]);
            });

            test('should return an empty array if segments is an empty array', () => {
                trip.segments = [];
                expect(trip.getModeCategories()).toEqual([]);
            });

            test('should return the mode categories of the segments', () => {
                trip.segments = [new Segment({ mode: 'walk' }), new Segment({ mode: 'transitBus' }), new Segment({ mode: 'bicycle' })];
                expect(trip.getModeCategories()).toEqual(['walk', 'transit', 'bicycle']);
            });
        });

        describe('isMultimodal', () => {
            test('should return false if segments is undefined', () => {
                trip.segments = undefined;
                expect(trip.isMultimodal()).toBe(false);
            });

            test('should return false if segments is an empty array', () => {
                trip.segments = [];
                expect(trip.isMultimodal()).toBe(false);
            });

            test('should return false if segments has only one mode', () => {
                trip.segments = [new Segment({ mode: 'walk' }), new Segment({ mode: 'walk' })];
                expect(trip.isMultimodal()).toBe(false);
            });

            test('should return true if segments has multiple modes', () => {
                trip.segments = [new Segment({ mode: 'walk' }), new Segment({ mode: 'transitBus' })];
                expect(trip.isMultimodal()).toBe(true);
            });
        });

        describe('getModesWithoutWalk', () => {
            test('should return an empty array if segments is undefined', () => {
                trip.segments = undefined;
                expect(trip.getModesWithoutWalk()).toEqual([]);
            });

            test('should return an empty array if segments is an empty array', () => {
                trip.segments = [];
                expect(trip.getModesWithoutWalk()).toEqual([]);
            });

            test('should return the modes without walk', () => {
                trip.segments = [new Segment({ mode: 'walk' }), new Segment({ mode: 'transitBus' }), new Segment({ mode: 'bicycle' })];
                expect(trip.getModesWithoutWalk()).toEqual(['transitBus', 'bicycle']);
            });
        });

        describe('getTransitModes', () => {
            test('should return an empty array if segments is undefined', () => {
                trip.segments = undefined;
                expect(trip.getTransitModes()).toEqual([]);
            });

            test('should return an empty array if segments is an empty array', () => {
                trip.segments = [];
                expect(trip.getTransitModes()).toEqual([]);
            });

            test('should return the transit modes', () => {
                trip.segments = [new Segment({ mode: 'walk' }), new Segment({ mode: 'transitBus' }), new Segment({ mode: 'transitRRT' })];
                expect(trip.getTransitModes()).toEqual(['transitBus', 'transitRRT']);
            });
        });

        describe('getNonTransitModes', () => {
            test('should return an empty array if segments is undefined', () => {
                trip.segments = undefined;
                expect(trip.getNonTransitModes()).toEqual([]);
            });

            test('should return an empty array if segments is an empty array', () => {
                trip.segments = [];
                expect(trip.getNonTransitModes()).toEqual([]);
            });

            test('should return the non-transit modes', () => {
                trip.segments = [new Segment({ mode: 'walk' }), new Segment({ mode: 'transitBus' }), new Segment({ mode: 'bicycle' })];
                expect(trip.getNonTransitModes()).toEqual(['walk', 'bicycle']);
            });
        });

        describe('isTransitMultimodal', () => {
            test('should return false if segments is undefined', () => {
                trip.segments = undefined;
                expect(trip.isTransitMultimodal()).toBe(false);
            });

            test('should return false if segments is an empty array', () => {
                trip.segments = [];
                expect(trip.isTransitMultimodal()).toBe(false);
            });

            test('should return false if segments has no transit mode', () => {
                trip.segments = [new Segment({ mode: 'walk' }), new Segment({ mode: 'bicycle' })];
                expect(trip.isTransitMultimodal()).toBe(false);
            });

            test('should return false if segments has only one non-transit mode but it is walking', () => {
                trip.segments = [new Segment({ mode: 'walk' }), new Segment({ mode: 'transitBus' })];
                expect(trip.isTransitMultimodal()).toBe(false);
            });

            test('should return true if segments has transit mode and multiple non-transit modes, not including walking', () => {
                trip.segments = [new Segment({ mode: 'carDriver' }), new Segment({ mode: 'transitBus' }), new Segment({ mode: 'bicycle' })];
                expect(trip.isTransitMultimodal()).toBe(true);
            });

            test('should return true if segments has transit mode and multiple non-transit modes, including walking', () => {
                trip.segments = [new Segment({ mode: 'walk' }), new Segment({ mode: 'transitBus' }), new Segment({ mode: 'bicycle' })];
                expect(trip.isTransitMultimodal()).toBe(true);
            });
        });

        describe('isTransitOnly', () => {
            test('should return false if segments is undefined', () => {
                trip.segments = undefined;
                expect(trip.isTransitOnly()).toBe(false);
            });

            test('should return false if segments is an empty array', () => {
                trip.segments = [];
                expect(trip.isTransitOnly()).toBe(false);
            });

            test('should return false if segments has no transit mode', () => {
                trip.segments = [new Segment({ mode: 'walk' }), new Segment({ mode: 'bicycle' })];
                expect(trip.isTransitOnly()).toBe(false);
            });

            test('should return false if segments has non-transit modes other than walk', () => {
                trip.segments = [new Segment({ mode: 'walk' }), new Segment({ mode: 'transitBus' }), new Segment({ mode: 'bicycle' })];
                expect(trip.isTransitOnly()).toBe(false);
            });

            test('should return true if segments has only transit modes and walk (which is ignored)', () => {
                trip.segments = [new Segment({ mode: 'walk' }), new Segment({ mode: 'transitBus' }), new Segment({ mode: 'transitRRT' })];
                expect(trip.isTransitOnly()).toBe(true);
            });
        });

        describe('getDurationSeconds', () => {
            test('should return the duration in seconds', () => {
                trip.startTime = 3600;
                trip.endTime = 7200;
                expect(trip.getDurationSeconds()).toBe(3600);
            });

            test('should return undefined if endTime is undefined', () => {
                trip.endTime = undefined;
                expect(trip.getDurationSeconds()).toBe(undefined);
            });

            test('should return undefined if endTime is not a number', () => {
                trip.endTime = '7200' as any;
                expect(trip.getDurationSeconds()).toBe(undefined);
            });

            test('should return undefined if endTime is negative', () => {
                trip.endTime = -1;
                expect(trip.getDurationSeconds()).toBe(undefined);
            });

            test('should return undefined if startTime is undefined', () => {
                trip.startTime = undefined;
                expect(trip.getDurationSeconds()).toBe(undefined);
            });

            test('should return undefined if startTime is not a number', () => {
                trip.startTime = '7200' as any;
                expect(trip.getDurationSeconds()).toBe(undefined);
            });

            test('should return undefined if startTime is negative', () => {
                trip.startTime = -1;
                expect(trip.getDurationSeconds()).toBe(undefined);
            });

            test('should return undefined if startTime is after endTime', () => {
                trip.startTime = 7220;
                trip.endTime = 7200;
                expect(trip.getDurationSeconds()).toBe(undefined);
            });

        });

        describe('getBirdDistanceMeters', () => {
            test('should return the bird distance in meters', () => {
                trip.origin = new VisitedPlace({ geography: { type: 'Feature', geometry: { type: 'Point', coordinates: [45.5, -75.5] }, properties: {} } });
                trip.destination = new VisitedPlace({ geography: { type: 'Feature', geometry: { type: 'Point', coordinates: [45.6, -75.4] }, properties: {} } });
                expect(trip.getBirdDistanceMeters()).toBe(11466);
            });

            test('should return undefined if origin or destination is undefined', () => {
                trip.origin = undefined;
                expect(trip.getBirdDistanceMeters()).toBe(undefined);
            });

            test('should return undefined if origin or destination is not a valid point', () => {
                trip.origin = new VisitedPlace({ geography: { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]] }, properties: {} } as any });
                trip.destination = new VisitedPlace({ geography: { type: 'Feature', geometry: { type: 'Point', coordinates: [2, 2] }, properties: {} } as any });
                expect(trip.getBirdDistanceMeters()).toBe(undefined);
            });
        });

        describe('getBirdSpeedKph', () => {
            test('should return the bird speed in km/h', () => {
                trip.origin = new VisitedPlace({ geography: { type: 'Feature', geometry: { type: 'Point', coordinates: [45.5, -75.5] }, properties: {} } });
                trip.destination = new VisitedPlace({ geography: { type: 'Feature', geometry: { type: 'Point', coordinates: [45.6, -75.4] }, properties: {} } });
                const speed = trip.getBirdSpeedKph() as number;
                expect(Math.round(speed * 10000) / 10000).toBe(14.6374);
            });

            test('should return undefined if origin or destination is undefined', () => {
                trip.origin = undefined;
                expect(trip.getBirdSpeedKph()).toBe(undefined);
            });

            test('should return undefined if origin or destination is not a valid point', () => {
                trip.origin = new VisitedPlace({ geography: { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]] }, properties: {} } as any });
                trip.destination = new VisitedPlace({ geography: { type: 'Feature', geometry: { type: 'Point', coordinates: [2, 2] }, properties: {} } as any });
                expect(trip.getBirdSpeedKph()).toBe(undefined);
            });
        });

    });
});
