/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { BaseJourney, BaseJourneyAttributes, ExtendedJourneyAttributes } from '../BaseJourney';
import { BaseVisitedPlace, BaseVisitedPlaceAttributes } from '../BaseVisitedPlace';
import { BaseTrip, BaseTripAttributes } from '../BaseTrip';
import { BaseTripChain, BaseTripChainAttributes } from '../BaseTripChain';
import { BasePlace } from '../BasePlace';
import { Weight } from '../Weight';
import { WeightMethod } from '../WeightMethod';
import * as VPAttr from '../attributeTypes/VisitedPlaceAttributes';
import * as TCAttr from '../attributeTypes/TripChainAttributes';

const validUUID = uuidV4();

describe('BaseJourney', () => {
    const baseVisitedPlaceAttributes: BaseVisitedPlaceAttributes = {
        _uuid: validUUID,
        basePlace: new BasePlace({}),
        arrivalDate: new Date('2023-10-05'),
        departureDate: new Date('2023-10-06'),
        arrivalTime: 36000, // 10 hours in seconds
        departureTime: 72000, // 20 hours in seconds
        activityCategory: 'work' as VPAttr.ActivityCategory,
        activity: 'workUsual' as VPAttr.Activity,
    };

    const baseTripAttributes: BaseTripAttributes = {
        _uuid: validUUID,
        baseOrigin: new BaseVisitedPlace(baseVisitedPlaceAttributes),
        baseDestination: new BaseVisitedPlace(baseVisitedPlaceAttributes),
        baseSegments: [],
    };

    const baseTripChainAttributes: BaseTripChainAttributes = {
        _uuid: validUUID,
        baseTrips: [new BaseTrip(baseTripAttributes)],
        isMultiloop: false,
        isConstrained: true,
        category: 'simple' as TCAttr.TripChainCategory,
    };

    const weightMethodAttributes = {
        _uuid: uuidV4(),
        shortname: 'sample-shortname',
        name: 'Sample Weight Method',
        description: 'Sample weight method description',
    };

    const baseJourneyAttributes: ExtendedJourneyAttributes = {
        _uuid: validUUID,
        startDate: new Date('2023-10-05'),
        endDate: new Date('2023-10-06'),
        startTime: 36000, // 10 hours in seconds
        endTime: 72000, // 20 hours in seconds
        name: 'Journey name',
        baseVisitedPlaces: [new BaseVisitedPlace(baseVisitedPlaceAttributes)],
        baseTrips: [new BaseTrip(baseTripAttributes), new BaseTrip(baseTripAttributes)],
        baseTripChains: [new BaseTripChain(baseTripChainAttributes)],
        _weights: [{ weight: 2.333, method: new WeightMethod(weightMethodAttributes) }],
        foo: 'bar'
    };

    it('should create a new BaseJourney instance', () => {
        const journey = new BaseJourney(baseJourneyAttributes);
        expect(journey).toBeInstanceOf(BaseJourney);
        expect(journey._uuid).toEqual(validUUID);
        expect(journey.baseTripChains?.length).toEqual(1);
        expect(journey.name).toEqual('Journey name');
        expect(journey.startDate).toEqual(new Date('2023-10-05'));
        expect(journey.endDate).toEqual(new Date('2023-10-06'));
        expect(journey.startTime).toEqual(36000);
        expect(journey.endTime).toEqual(72000);
        expect(journey.baseTripChains?.[0]).toBeInstanceOf(BaseTripChain);
        expect(journey.baseVisitedPlaces?.length).toEqual(1);
        expect(journey.baseVisitedPlaces?.[0]).toBeInstanceOf(BaseVisitedPlace);
        expect(journey.baseTrips?.length).toEqual(2);
        expect(journey.baseTrips?.[1]).toBeInstanceOf(BaseTrip);
        expect(journey._weights).toBeDefined();
    });

    it('should create a new BaseJourney instance with minimal attributes', () => {
        const minimalAttributes: BaseJourneyAttributes = {
            _uuid: validUUID,
            startDate: new Date('2023-10-07'),
            endDate: new Date('2023-10-08'),
            startTime: 36100, // 10 hours in seconds
            endTime: 72100, // 20 hours in seconds
        };

        const journey = new BaseJourney(minimalAttributes);
        expect(journey).toBeInstanceOf(BaseJourney);
        expect(journey._uuid).toEqual(validUUID);
        expect(journey.baseTripChains).toBeUndefined();
    });

    it('should validate a BaseJourney instance', () => {
        const journey = new BaseJourney(baseJourneyAttributes);
        expect(journey.isValid()).toBeUndefined();
        const validationResult = journey.validate();
        expect(validationResult).toBe(true);
        expect(journey.isValid()).toBe(true);
    });

    it('should set weight and method correctly', () => {
        const journey = new BaseJourney(baseJourneyAttributes);
        const weight: Weight = journey._weights?.[0] as Weight;
        expect(weight.weight).toBe(2.333);
        expect(weight.method).toBeInstanceOf(WeightMethod);
        expect(weight.method.shortname).toEqual('sample-shortname');
        expect(weight.method.name).toEqual('Sample Weight Method');
        expect(weight.method.description).toEqual('Sample weight method description');
    });

    it('should validate params with valid values', () => {
        const validParams = {
            _uuid: uuidV4(),
            startDate: new Date(),
            startTime: 3600,
            endDate: new Date(),
            endTime: 7200,
            name: 'Valid Journey',
            baseVisitedPlaces: [],
            baseTrips: [],
            baseTripChains: [],
            _weights: [],
        };

        const errors = BaseJourney.validateParams(validParams);
        expect(errors.length).toBe(0);
    });

    it('should return errors for invalid params', () => {
        const invalidParams = {
            _uuid: 'invalid-uuid',
            startDate: 'invalid-date',
            startTime: 'invalid-time',
            endDate: 'invalid-date',
            endTime: 'invalid-time',
            name: 123,
            baseVisitedPlaces: {},
            baseTrips: 'not-an-array',
            baseTripChains: 42
        };

        const errors = BaseJourney.validateParams(invalidParams);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors).toEqual([
            new Error('Uuidable validateParams: invalid uuid'),
            new Error('BaseJourney validateParams: startDate is required and should be a valid date'),
            new Error('BaseJourney validateParams: startTime is required and should be a non-negative number'),
            new Error('BaseJourney validateParams: endDate is required and should be a valid date'),
            new Error('BaseJourney validateParams: endTime is required and should be a non-negative number'),
            new Error('BaseJourney validateParams: name should be a string'),
            new Error('BaseJourney validateParams: baseVisitedPlaces should be an array of BaseVisitedPlace'),
            new Error('BaseJourney validateParams: baseTrips should be an array of BaseTrip'),
            new Error('BaseJourney validateParams: baseTripChains should be an array of BaseTripChain'),
        ]);
    });


});
