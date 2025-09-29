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

    const weightMethodAttributes = {
        _uuid: uuidV4(),
        shortname: 'sample-shortname',
        name: 'Sample Weight Method',
        description: 'Sample weight method description',
    };

    const baseJourneyAttributes: ExtendedJourneyAttributes = {
        _uuid: validUUID,
        uuid: validUUID,
        startDate: '2023-10-05',
        endDate: '2023-10-06',
        startTime: 36000, // 10 hours in seconds
        endTime: 72000, // 20 hours in seconds
        name: 'Journey name',
        _weights: [{ weight: 2.333, method: new WeightMethod(weightMethodAttributes) }],
        foo: 'bar'
    };

    it('should create a new BaseJourney instance', () => {
        const journey = new BaseJourney(baseJourneyAttributes);
        expect(journey).toBeInstanceOf(BaseJourney);
        expect(journey._uuid).toEqual(validUUID);
        expect(journey.name).toEqual('Journey name');
        expect(journey.startDate).toEqual('2023-10-05');
        expect(journey.endDate).toEqual('2023-10-06');
        expect(journey.startTime).toEqual(36000);
        expect(journey.endTime).toEqual(72000);
        expect(journey._weights).toBeDefined();
    });

    it('should create a new BaseJourney instance with minimal attributes', () => {
        const minimalAttributes: BaseJourneyAttributes = {
            _uuid: validUUID,
            uuid: validUUID,
            startDate: '2023-10-07',
            endDate: '2023-10-08',
            startTime: 36100, // 10 hours in seconds
            endTime: 72100, // 20 hours in seconds
        };

        const journey = new BaseJourney(minimalAttributes);
        expect(journey).toBeInstanceOf(BaseJourney);
        expect(journey._uuid).toEqual(validUUID);
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
        expect(weight.method?.shortname).toEqual('sample-shortname');
        expect(weight.method?.name).toEqual('Sample Weight Method');
        expect(weight.method?.description).toEqual('Sample weight method description');
    });

    it('should validate params with valid values', () => {
        const validParams = {
            _uuid: uuidV4(),
            startDate: '2023-01-06',
            startTime: 3600,
            endDate: '2023-10-06',
            endTime: 7200,
            name: 'Valid Journey',
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
        };

        const errors = BaseJourney.validateParams(invalidParams);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors).toEqual([
            new Error('Uuidable validateParams: _uuid should be a valid uuid'),
            new Error('BaseJourney validateParams: startDate is required and should be a valid date string'),
            new Error('BaseJourney validateParams: startTime is required and should be a non-negative number'),
            new Error('BaseJourney validateParams: endDate is required and should be a valid date string'),
            new Error('BaseJourney validateParams: endTime is required and should be a non-negative number'),
            new Error('BaseJourney validateParams: name should be a string'),
        ]);
    });

    it('should unserialize object', () => {
        const instance = BaseJourney.unserialize(baseJourneyAttributes);
        expect(instance).toBeInstanceOf(BaseJourney);
        expect(instance.name).toEqual(baseJourneyAttributes.name);
    });


});
