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
        arrivalDate: new Date('2023-10-05'),
        departureDate: new Date('2023-10-06'),
        arrivalTime: 36000, // 10 hours in seconds
        departureTime: 72000, // 20 hours in seconds
        activityCategory: 'work' as VPAttr.ActivityCategory,
        activity: 'workUsual' as VPAttr.Activity,
    };

    const baseTripAttributes: BaseTripAttributes = {
        _uuid: validUUID,
        origin: new BaseVisitedPlace(new BasePlace(undefined, {}), baseVisitedPlaceAttributes),
        destination: new BaseVisitedPlace(new BasePlace(undefined, {}), baseVisitedPlaceAttributes),
        segments: [],
    };

    const baseTripChainAttributes: BaseTripChainAttributes = {
        _uuid: validUUID,
        trips: [new BaseTrip(baseTripAttributes)],
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
        visitedPlaces: [new BaseVisitedPlace(new BasePlace(undefined, {}), baseVisitedPlaceAttributes)],
        trips: [new BaseTrip(baseTripAttributes), new BaseTrip(baseTripAttributes)],
        tripChains: [new BaseTripChain(baseTripChainAttributes)],
        _weight: { weight: 2.333, method: new WeightMethod(weightMethodAttributes) },
        foo: 'bar'
    };

    it('should create a new BaseJourney instance', () => {
        const journey = new BaseJourney(baseJourneyAttributes);
        expect(journey).toBeInstanceOf(BaseJourney);
        expect(journey._uuid).toEqual(validUUID);
        expect(journey.tripChains?.length).toEqual(1);
        expect(journey.name).toEqual('Journey name');
        expect(journey.startDate).toEqual(new Date('2023-10-05'));
        expect(journey.endDate).toEqual(new Date('2023-10-06'));
        expect(journey.startTime).toEqual(36000);
        expect(journey.endTime).toEqual(72000);
        expect(journey.tripChains?.[0]).toBeInstanceOf(BaseTripChain);
        expect(journey.visitedPlaces?.length).toEqual(1);
        expect(journey.visitedPlaces?.[0]).toBeInstanceOf(BaseVisitedPlace);
        expect(journey.trips?.length).toEqual(2);
        expect(journey.trips?.[1]).toBeInstanceOf(BaseTrip);
        expect(journey._weight).toBeDefined();
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
        expect(journey.tripChains).toBeUndefined();
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
        const weight: Weight = journey._weight as Weight;
        expect(weight.weight).toBe(2.333);
        expect(weight.method).toBeInstanceOf(WeightMethod);
        expect(weight.method.shortname).toEqual('sample-shortname');
        expect(weight.method.name).toEqual('Sample Weight Method');
        expect(weight.method.description).toEqual('Sample weight method description');
    });


});
