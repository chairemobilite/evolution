/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Journey, JourneyAttributes, ExtendedJourneyAttributes, journeyAttributes } from '../Journey';
import { ExtendedVisitedPlaceAttributes } from '../VisitedPlace';
import { TripAttributes } from '../Trip';
import { TripChainAttributes } from '../TripChain';
import { v4 as uuidV4 } from 'uuid';
import { WeightMethod, WeightMethodAttributes } from '../WeightMethod';
import { isOk, hasErrors, unwrap } from '../../../types/Result.type';
import { startEndDateAndTimesAttributes } from '../StartEndable';

describe('Journey', () => {
    const weightMethodAttributes: WeightMethodAttributes = {
        _uuid: uuidV4(),
        shortname: 'sample-shortname',
        name: 'Sample Weight Method',
        description: 'Sample weight method description',
    };

    const validAttributes: JourneyAttributes = {
        _uuid: uuidV4(),
        startDate: '2023-05-21',
        startTime: 3600,
        startTimePeriod: 'morning',
        endDate: '2023-05-21',
        endTime: 7200,
        endTimePeriod: 'afternoon',
        name: 'Sample Journey',
        type: 'week',
        noSchoolTripReason: 'no_school',
        noSchoolTripReasonSpecify: 'summer vacation',
        noWorkTripReason: 'remote_work',
        noWorkTripReasonSpecify: 'working from home',
        didTrips: 'yes',
        previousWeekRemoteWorkDays: { monday: true, tuesday: true, wednesday: true },
        previousWeekTravelToWorkDays: { monday: true, tuesday: true },
        _weights: [{ weight: 1.5, method: new WeightMethod(weightMethodAttributes) }],
        _isValid: true,
    };

    const extendedAttributes: ExtendedJourneyAttributes = {
        ...validAttributes,
        customAttribute: 'Custom Value',
        _visitedPlaces: [
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
        ],
        _trips: [
            {
                _uuid: uuidV4(),
                startDate: '2023-01-03',
                _isValid: true,
            },
        ],
        _tripChains: [
            {
                _uuid: uuidV4(),
                category: 'simple',
                _isValid: true,
            },
        ],
    };

    test('should instantiate a Journey instance', () => {
        const journey = new Journey(validAttributes);
        expect(journey).toBeInstanceOf(Journey);
        expect(journey.attributes).toEqual(validAttributes);
    });

    test('should have a validateParams section for each attribute', () => {
        const validateParamsCode = Journey.validateParams.toString();
        journeyAttributes.filter((attribute) => attribute !== '_uuid' && attribute !== '_weights' && !(startEndDateAndTimesAttributes as unknown as string[]).includes(attribute)).forEach((attributeName) => {
            expect(validateParamsCode).toContain('\'' + attributeName + '\'');
        });
    });

    test('should get uuid', () => {
        const journey = new Journey({ ...validAttributes, _uuid: '11b78eb3-a5d8-484d-805d-1f947160bb9e' });
        expect(journey._uuid).toBe('11b78eb3-a5d8-484d-805d-1f947160bb9e');
    });

    test('should create a Journey instance with valid attributes', () => {
        const result = Journey.create(validAttributes);
        expect(isOk(result)).toBe(true);
        expect(unwrap(result)).toBeInstanceOf(Journey);
    });

    test('should return an error for invalid params', () => {
        const invalidAttributes = 'foo' as any;
        const result = Journey.create(invalidAttributes);
        expect(hasErrors(result)).toBe(true);
        expect((unwrap(result) as Error[]).length).toBeGreaterThan(0);
    });

    test('should create a Journey instance with extended attributes', () => {
        const result = Journey.create(extendedAttributes);
        expect(isOk(result)).toBe(true);
        expect(unwrap(result)).toBeInstanceOf(Journey);
    });

    test('should return errors for invalid attributes', () => {
        const invalidAttributes = { ...validAttributes, startTime: 'invalid' };
        const result = Journey.create(invalidAttributes);
        expect(hasErrors(result)).toBe(true);
        expect((unwrap(result) as Error[]).length).toBeGreaterThan(0);
    });

    test('should unserialize a Journey instance', () => {
        const journey = Journey.unserialize(validAttributes);
        expect(journey).toBeInstanceOf(Journey);
        expect(journey.attributes).toEqual(validAttributes);
    });

    test('should validate Journey attributes', () => {
        const errors = Journey.validateParams(validAttributes);
        expect(errors).toHaveLength(0);
    });

    test('should return errors for invalid Journey attributes', () => {
        const invalidAttributes = { ...validAttributes, startDate: 'invalid' };
        const errors = Journey.validateParams(invalidAttributes);
        expect(errors).toHaveLength(1);
    });

    test('should validate a Journey instance', () => {
        const journey = new Journey(validAttributes);
        expect(journey.validate()).toBe(true);
        expect(journey.isValid()).toBe(true);
    });

    test('should create a Journey instance with custom attributes', () => {
        const customAttributes = {
            customAttribute1: 'value1',
            customAttribute2: 'value2',
        };
        const journeyAttributes = {
            ...validAttributes,
            ...customAttributes,
        };
        const journey = new Journey(journeyAttributes);
        expect(journey).toBeInstanceOf(Journey);
        expect(journey.attributes).toEqual(validAttributes);
        expect(journey.customAttributes).toEqual(customAttributes);
    });

    describe('validateParams', () => {
        test.each([
            ['startDate', 123],
            ['startTime', 'invalid'],
            ['startTimePeriod', 123],
            ['endDate', 123],
            ['endTime', 'invalid'],
            ['endTimePeriod', 123],
            ['name', 123],
            ['type', 123],
            ['noSchoolTripReason', 123],
            ['noSchoolTripReasonSpecify', 123],
            ['noWorkTripReason', 123],
            ['noWorkTripReasonSpecify', 123],
            ['didTrips', 123],
            ['previousWeekRemoteWorkDays', 'invalid'],
            ['previousWeekTravelToWorkDays', 'invalid'],
        ])('should return an error for invalid %s', (param, value) => {
            const invalidAttributes = { ...validAttributes, [param]: value };
            const errors = Journey.validateParams(invalidAttributes);
            expect(errors[0].toString()).toContain(param);
            expect(errors).toHaveLength(1);
        });

        test('should return no errors for valid attributes', () => {
            const errors = Journey.validateParams(validAttributes);
            expect(errors).toHaveLength(0);
        });
    });

    describe('Getters and Setters', () => {
        test.each([
            ['startDate', '2023-05-22'],
            ['startTime', 7200],
            ['startTimePeriod', 'morning'],
            ['endDate', '2023-05-22'],
            ['endTime', 10800],
            ['endTimePeriod', 'afternoon'],
            ['name', 'Updated Journey'],
            ['type', 'work'],
            ['noSchoolTripReason', 'holiday'],
            ['noSchoolTripReasonSpecify', 'winter break'],
            ['noWorkTripReason', 'sick_leave'],
            ['noWorkTripReasonSpecify', 'medical appointment'],
            ['didTrips', 'no'],
            ['previousWeekRemoteWorkDays', { friday: true, saturday: true, sunday: true }],
            ['previousWeekTravelToWorkDays', { thursday: true, friday: true }],
        ])('should set and get %s', (attribute, value) => {
            const journey = new Journey(validAttributes);
            journey[attribute] = value;
            expect(journey[attribute]).toEqual(value);
        });

        describe('Getters for attributes with no setters', () => {
            test.each([
                ['_uuid', extendedAttributes._uuid],
                ['customAttributes', { customAttribute: extendedAttributes.customAttribute }],
                ['attributes', validAttributes],
            ])('should set and get %s', (attribute, value) => {
                const journey = new Journey(extendedAttributes);
                expect(journey[attribute]).toEqual(value);
            });
        });

        test.each([
            ['_isValid', false],
            ['_weights', [{ weight: 2.0, method: new WeightMethod(weightMethodAttributes) }]],
            ['_visitedPlaces', extendedAttributes._visitedPlaces],
            ['_trips', extendedAttributes._trips],
            ['_tripChains', extendedAttributes._tripChains],
            ['personUuid', uuidV4()],
        ])('should set and get %s', (attribute, value) => {
            const journey = new Journey(validAttributes);
            journey[attribute] = value;
            expect(journey[attribute]).toEqual(value);
        });
    });

    describe('VisitedPlace and Trip Management Methods', () => {
        test('should add visited places using addVisitedPlace method', () => {
            const journey = new Journey(validAttributes);
            const vp1 = { _uuid: uuidV4(), _isValid: true };
            const vp2 = { _uuid: uuidV4(), _isValid: true };

            journey.addVisitedPlace(vp1 as any);
            journey.addVisitedPlace(vp2 as any);

            const visitedPlaces = journey.visitedPlaces || [];
            expect(visitedPlaces).toHaveLength(2);
            expect(visitedPlaces[0]).toBe(vp1);
            expect(visitedPlaces[1]).toBe(vp2);
        });

        test('should insert visited place at specific index', () => {
            const journey = new Journey(validAttributes);
            const vp1 = { _uuid: uuidV4(), _isValid: true };
            const vp2 = { _uuid: uuidV4(), _isValid: true };
            const vp3 = { _uuid: uuidV4(), _isValid: true };

            journey.addVisitedPlace(vp1 as any);
            journey.addVisitedPlace(vp3 as any);
            journey.insertVisitedPlace(vp2 as any, 1);

            const visitedPlaces = journey.visitedPlaces || [];
            expect(visitedPlaces).toHaveLength(3);
            expect(visitedPlaces[0]).toBe(vp1);
            expect(visitedPlaces[1]).toBe(vp2);
            expect(visitedPlaces[2]).toBe(vp3);
        });

        test('should insert visited place after specific UUID', () => {
            const journey = new Journey(validAttributes);
            const vp1 = { _uuid: uuidV4(), _isValid: true };
            const vp2 = { _uuid: uuidV4(), _isValid: true };
            const vp3 = { _uuid: uuidV4(), _isValid: true };

            journey.addVisitedPlace(vp1 as any);
            journey.addVisitedPlace(vp3 as any);
            const success = journey.insertVisitedPlaceAfterUuid(vp2 as any, vp1._uuid);

            expect(success).toBe(true);
            const visitedPlaces = journey.visitedPlaces || [];
            expect(visitedPlaces).toHaveLength(3);
            expect(visitedPlaces[0]).toBe(vp1);
            expect(visitedPlaces[1]).toBe(vp2);
            expect(visitedPlaces[2]).toBe(vp3);
        });

        test('should insert visited place before specific UUID', () => {
            const journey = new Journey(validAttributes);
            const vp1 = { _uuid: uuidV4(), _isValid: true };
            const vp2 = { _uuid: uuidV4(), _isValid: true };
            const vp3 = { _uuid: uuidV4(), _isValid: true };

            journey.addVisitedPlace(vp1 as any);
            journey.addVisitedPlace(vp3 as any);
            const success = journey.insertVisitedPlaceBeforeUuid(vp2 as any, vp3._uuid);

            expect(success).toBe(true);
            const visitedPlaces = journey.visitedPlaces || [];
            expect(visitedPlaces).toHaveLength(3);
            expect(visitedPlaces[0]).toBe(vp1);
            expect(visitedPlaces[1]).toBe(vp2);
            expect(visitedPlaces[2]).toBe(vp3);
        });

        test('should remove visited place by UUID', () => {
            const journey = new Journey(validAttributes);
            const vp1 = { _uuid: uuidV4(), _isValid: true };
            const vp2 = { _uuid: uuidV4(), _isValid: true };

            journey.addVisitedPlace(vp1 as any);
            journey.addVisitedPlace(vp2 as any);
            const success = journey.removeVisitedPlace(vp1._uuid);

            expect(success).toBe(true);
            const visitedPlaces = journey.visitedPlaces || [];
            expect(visitedPlaces).toHaveLength(1);
            expect(visitedPlaces[0]).toBe(vp2);
        });

        test('should get visited place by UUID', () => {
            const journey = new Journey(validAttributes);
            const vp1 = { _uuid: uuidV4(), _isValid: true };
            const vp2 = { _uuid: uuidV4(), _isValid: true };

            journey.addVisitedPlace(vp1 as any);
            journey.addVisitedPlace(vp2 as any);

            expect(journey.getVisitedPlaceByUuid(vp1._uuid)).toBe(vp1);
            expect(journey.getVisitedPlaceByUuid(vp2._uuid)).toBe(vp2);
            expect(journey.getVisitedPlaceByUuid(uuidV4())).toBeUndefined();
        });

        test('should add trips using addTrip method', () => {
            const journey = new Journey(validAttributes);
            const trip1 = { _uuid: uuidV4(), _isValid: true };
            const trip2 = { _uuid: uuidV4(), _isValid: true };

            journey.addTrip(trip1 as any);
            journey.addTrip(trip2 as any);

            const trips = journey.trips || [];
            expect(trips).toHaveLength(2);
            expect(trips[0]).toBe(trip1);
            expect(trips[1]).toBe(trip2);
        });

        test('should insert trip at specific index', () => {
            const journey = new Journey(validAttributes);
            const trip1 = { _uuid: uuidV4(), _isValid: true };
            const trip2 = { _uuid: uuidV4(), _isValid: true };
            const trip3 = { _uuid: uuidV4(), _isValid: true };

            journey.addTrip(trip1 as any);
            journey.addTrip(trip3 as any);
            journey.insertTrip(trip2 as any, 1);

            const trips = journey.trips || [];
            expect(trips).toHaveLength(3);
            expect(trips[0]).toBe(trip1);
            expect(trips[1]).toBe(trip2);
            expect(trips[2]).toBe(trip3);
        });

        test('should insert trip after specific UUID', () => {
            const journey = new Journey(validAttributes);
            const trip1 = { _uuid: uuidV4(), _isValid: true };
            const trip2 = { _uuid: uuidV4(), _isValid: true };
            const trip3 = { _uuid: uuidV4(), _isValid: true };

            journey.addTrip(trip1 as any);
            journey.addTrip(trip3 as any);
            const success = journey.insertTripAfterUuid(trip2 as any, trip1._uuid);

            expect(success).toBe(true);
            const trips = journey.trips || [];
            expect(trips).toHaveLength(3);
            expect(trips[0]).toBe(trip1);
            expect(trips[1]).toBe(trip2);
            expect(trips[2]).toBe(trip3);
        });

        test('should insert trip before specific UUID', () => {
            const journey = new Journey(validAttributes);
            const trip1 = { _uuid: uuidV4(), _isValid: true };
            const trip2 = { _uuid: uuidV4(), _isValid: true };
            const trip3 = { _uuid: uuidV4(), _isValid: true };

            journey.addTrip(trip1 as any);
            journey.addTrip(trip3 as any);
            const success = journey.insertTripBeforeUuid(trip2 as any, trip3._uuid);

            expect(success).toBe(true);
            const trips = journey.trips || [];
            expect(trips).toHaveLength(3);
            expect(trips[0]).toBe(trip1);
            expect(trips[1]).toBe(trip2);
            expect(trips[2]).toBe(trip3);
        });

        test('should remove trip by UUID', () => {
            const journey = new Journey(validAttributes);
            const trip1 = { _uuid: uuidV4(), _isValid: true };
            const trip2 = { _uuid: uuidV4(), _isValid: true };

            journey.addTrip(trip1 as any);
            journey.addTrip(trip2 as any);
            const success = journey.removeTrip(trip1._uuid);

            expect(success).toBe(true);
            const trips = journey.trips || [];
            expect(trips).toHaveLength(1);
            expect(trips[0]).toBe(trip2);
        });

        test('should get trip by UUID', () => {
            const journey = new Journey(validAttributes);
            const trip1 = { _uuid: uuidV4(), _isValid: true };
            const trip2 = { _uuid: uuidV4(), _isValid: true };

            journey.addTrip(trip1 as any);
            journey.addTrip(trip2 as any);

            expect(journey.getTripByUuid(trip1._uuid)).toBe(trip1);
            expect(journey.getTripByUuid(trip2._uuid)).toBe(trip2);
            expect(journey.getTripByUuid(uuidV4())).toBeUndefined();
        });

        test('should return false when inserting after/before non-existent UUID', () => {
            const journey = new Journey(validAttributes);
            const vp1 = { _uuid: uuidV4(), _isValid: true };
            const vp2 = { _uuid: uuidV4(), _isValid: true };
            const trip1 = { _uuid: uuidV4(), _isValid: true };
            const trip2 = { _uuid: uuidV4(), _isValid: true };

            // Add items first to make arrays non-empty
            journey.addVisitedPlace(vp1 as any);
            journey.addTrip(trip1 as any);

            // Now test insertion with non-existent UUID - should return false
            expect(journey.insertVisitedPlaceAfterUuid(vp2 as any, uuidV4())).toBe(false);
            expect(journey.insertVisitedPlaceBeforeUuid(vp2 as any, uuidV4())).toBe(false);
            expect(journey.insertTripAfterUuid(trip2 as any, uuidV4())).toBe(false);
            expect(journey.insertTripBeforeUuid(trip2 as any, uuidV4())).toBe(false);
        });

        test('should handle empty arrays', () => {
            const journey = new Journey(validAttributes);

            expect(journey.visitedPlaces).toHaveLength(0);
            expect(journey.trips).toHaveLength(0);
            expect(journey.getVisitedPlaceByUuid(uuidV4())).toBeUndefined();
            expect(journey.getTripByUuid(uuidV4())).toBeUndefined();
            expect(journey.removeVisitedPlace(uuidV4())).toBe(false);
            expect(journey.removeTrip(uuidV4())).toBe(false);
        });

        test('should add to empty array when inserting after/before UUID with empty array', () => {
            const journey = new Journey(validAttributes);
            const vp = { _uuid: uuidV4(), _isValid: true };
            const trip = { _uuid: uuidV4(), _isValid: true };

            const vpSuccessAfter = journey.insertVisitedPlaceAfterUuid(vp as any, uuidV4());
            expect(vpSuccessAfter).toBe(true);
            expect(journey.visitedPlaces).toHaveLength(1);

            const tripSuccessAfter = journey.insertTripAfterUuid(trip as any, uuidV4());
            expect(tripSuccessAfter).toBe(true);
            expect(journey.trips).toHaveLength(1);
        });
    });

    describe('Composed Attributes', () => {
        test('should create VisitedPlace instances for visitedPlaces when creating a Journey instance', () => {
            const visitedPlaceAttributes: ExtendedVisitedPlaceAttributes[] = [
                {
                    _uuid: uuidV4(),
                    _sequence: 1,
                    activity: 'home',
                    activityCategory: 'home',
                    _weights: [{ weight: 1.0, method: new WeightMethod(weightMethodAttributes) }],
                    _isValid: true,
                    _place: {
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
                },
            ];

            const journeyAttributes: ExtendedJourneyAttributes = {
                ...validAttributes,
                _visitedPlaces: visitedPlaceAttributes,
            };

            const result = Journey.create(journeyAttributes);
            expect(isOk(result)).toBe(true);
            const journey = unwrap(result) as Journey;
            expect(journey.visitedPlaces).toBeDefined();
            expect(journey.visitedPlaces?.length).toBe(1);
            expect(journey.visitedPlaces?.[0].attributes).toEqual({
                _uuid: visitedPlaceAttributes[0]._uuid,
                _sequence: visitedPlaceAttributes[0]._sequence,
                activity: visitedPlaceAttributes[0].activity,
                activityCategory: visitedPlaceAttributes[0].activityCategory,
                _weights: visitedPlaceAttributes[0]._weights,
                _isValid: visitedPlaceAttributes[0]._isValid,
            });
        });

        test('should create Trip instances for trips when creating a Journey instance', () => {
            const tripAttributes: TripAttributes[] = [
                {
                    _uuid: uuidV4(),
                    endDate: '2024-01-13',
                    _isValid: true,
                },
            ];

            const journeyAttributes: ExtendedJourneyAttributes = {
                ...validAttributes,
                _trips: tripAttributes,
            };

            const result = Journey.create(journeyAttributes);
            expect(isOk(result)).toBe(true);
            const journey = unwrap(result) as Journey;
            expect(journey.trips).toBeDefined();
            expect(journey.trips?.length).toBe(1);
            expect(journey.trips?.[0].attributes).toEqual(tripAttributes[0]);
        });

        test('should create TripChain instances for tripChains when creating a Journey instance', () => {
            const tripChainAttributes: TripChainAttributes[] = [
                {
                    _uuid: uuidV4(),
                    category: 'simple',
                    _isValid: true,
                },
            ];

            const journeyAttributes: ExtendedJourneyAttributes = {
                ...validAttributes,
                _tripChains: tripChainAttributes,
            };

            const result = Journey.create(journeyAttributes);
            expect(isOk(result)).toBe(true);
            const journey = unwrap(result) as Journey;
            expect(journey.tripChains).toBeDefined();
            expect(journey.tripChains?.length).toBe(1);
            expect(journey.tripChains?.[0].attributes).toEqual(tripChainAttributes[0]);
        });
    });
});
