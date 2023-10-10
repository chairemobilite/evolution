/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { BaseVisitedPlace, BaseVisitedPlaceAttributes, ExtendedVisitedPlaceAttributes } from '../BaseVisitedPlace';
import { BasePlace, BasePlaceAttributes } from '../BasePlace';
import * as VPAttr from '../attributeTypes/VisitedPlaceAttributes';
import { Weight } from '../Weight';
import { WeightMethod } from '../WeightMethod';

const validUUID = uuidV4();

describe('BaseVisitedPlace', () => {

    const geojson = {
        type: 'Feature',
        id: 444,
        geometry: {
            type: 'Point',
            coordinates: [23.5, -11.0033423],
        },
        properties: {
            foo: 'boo2',
            bar: 'far2'
        },
    } as GeoJSON.Feature<GeoJSON.Point, { [key: string]: string }>;

    const weightMethodAttributes = {
        _uuid: uuidV4(),
        shortname: 'sample-shortname5',
        name: 'Sample Weight Method5',
        description: 'Sample weight method description5',
    };

    const basePlaceAttributes: BasePlaceAttributes = {
        geography: geojson,
        _uuid: validUUID,
    };

    const baseVisitedPlaceAttributes: BaseVisitedPlaceAttributes = {
        _uuid: validUUID,
        basePlace: new BasePlace(basePlaceAttributes),
        arrivalDate: new Date('2023-10-05'),
        departureDate: new Date('2023-10-06'),
        arrivalTime: 36000, // 10:00 AM in seconds since midnight
        departureTime: 45000, // 12:30 PM in seconds since midnight
        activityCategory: 'school' as VPAttr.ActivityCategory,
        activity: 'schoolOther' as VPAttr.Activity,
        _weights: [{ weight: 0.9911, method: new WeightMethod(weightMethodAttributes) }],
    };

    it('should create a new BaseVisitedPlace instance', () => {
        const visitedPlace = new BaseVisitedPlace(baseVisitedPlaceAttributes);
        expect(visitedPlace).toBeInstanceOf(BaseVisitedPlace);
        expect(visitedPlace._uuid).toEqual(validUUID);
        expect(visitedPlace.basePlace).toBeInstanceOf(BasePlace);
        expect(visitedPlace.basePlace?.geography?.type).toEqual('Feature');
        expect(visitedPlace.basePlace?.geography?.geometry?.type).toEqual('Point');
        expect(visitedPlace.basePlace?.geography?.geometry?.coordinates).toEqual([23.5, -11.0033423]);
        expect(visitedPlace.basePlace?.geography?.properties).toEqual({ foo: 'boo2', bar: 'far2' });
        expect(visitedPlace.basePlace?.geography?.id).toEqual(444);
        expect(visitedPlace.arrivalDate).toEqual(new Date('2023-10-05'));
        expect(visitedPlace.departureDate).toEqual(new Date('2023-10-06'));
        expect(visitedPlace.arrivalTime).toEqual(36000);
        expect(visitedPlace.departureTime).toEqual(45000);
        expect(visitedPlace.activityCategory).toEqual('school');
        expect(visitedPlace.activity).toEqual('schoolOther');
    });

    it('should create a new BaseVisitedPlace instance with minimal attributes', () => {
        const minimalBasePlaceAttributes: BasePlaceAttributes = {
            geography: undefined,
            _uuid: validUUID,
            name: 'Minimal Test Place',
        };

        const minimalVisitedPlaceAttributes: BaseVisitedPlaceAttributes = {
            _uuid: validUUID,
            basePlace: new BasePlace(minimalBasePlaceAttributes),
            activityCategory: 'home' as VPAttr.ActivityCategory,
            activity: 'home' as VPAttr.Activity,
        };

        const visitedPlace = new BaseVisitedPlace(minimalVisitedPlaceAttributes);
        expect(visitedPlace).toBeInstanceOf(BaseVisitedPlace);
        expect(visitedPlace._uuid).toEqual(validUUID);
        expect(visitedPlace.basePlace).toBeInstanceOf(BasePlace);
        expect(visitedPlace.basePlace?.geography).toBeUndefined();
        expect(visitedPlace.basePlace?.name).toEqual('Minimal Test Place');
        expect(visitedPlace.arrivalDate).toBeUndefined();
        expect(visitedPlace.departureDate).toBeUndefined();
        expect(visitedPlace.arrivalTime).toBeUndefined();
        expect(visitedPlace.departureTime).toBeUndefined();
        expect(visitedPlace.activityCategory).toEqual('home');
        expect(visitedPlace.activity).toEqual('home');
    });

    it('should validate a BaseVisitedPlace instance', () => {
        const visitedPlace = new BaseVisitedPlace(baseVisitedPlaceAttributes);
        expect(visitedPlace.isValid()).toBeUndefined();
        const validationResult = visitedPlace.validate();
        expect(validationResult).toBe(true);
        expect(visitedPlace.isValid()).toBe(true);
    });

    it('should accept extended attributes', () => {
        const extendedVisitedPlaceAttributes: ExtendedVisitedPlaceAttributes = {
            ...baseVisitedPlaceAttributes,
            customAttribute: 'Custom Value',
        };

        const visitedPlace = new BaseVisitedPlace(extendedVisitedPlaceAttributes);
        expect(visitedPlace).toBeInstanceOf(BaseVisitedPlace);
    });

    it('should set weight and method correctly', () => {
        const visitedPlace = new BaseVisitedPlace(baseVisitedPlaceAttributes);
        const weight: Weight = visitedPlace._weights?.[0] as Weight;
        expect(weight.weight).toBe(.9911);
        expect(weight.method).toBeInstanceOf(WeightMethod);
        expect(weight.method.shortname).toEqual('sample-shortname5');
        expect(weight.method.name).toEqual('Sample Weight Method5');
        expect(weight.method.description).toEqual('Sample weight method description5');
    });

    it('should validate valid parameters', () => {
        const validParams = {
            _uuid: uuidV4(),
            basePlace: new BasePlace({} as BasePlaceAttributes),
            arrivalDate: new Date('2023-01-15'),
            departureDate: new Date('2023-01-16'),
            arrivalTime: 36000, // 10:00 AM in seconds since midnight
            departureTime: 43200, // 12:00 PM in seconds since midnight
            activityCategory: 'work' as VPAttr.ActivityCategory,
            activity: 'workUsual' as VPAttr.Activity,
        };
        const errors = BaseVisitedPlace.validateParams(validParams);
        expect(errors).toEqual([]);
    });

    it('should validate valid parameters with minimal attributes', () => {
        const validParams = {};
        const errors = BaseVisitedPlace.validateParams(validParams);
        expect(errors).toEqual([]);
    });

    it('should validate valid parameters with additional attributes', () => {
        const validParams = {
            _uuid: uuidV4(),
            basePlace: new BasePlace({} as BasePlaceAttributes),
            arrivalDate: new Date('2023-01-15'),
            departureDate: new Date('2023-01-16'),
            arrivalTime: 36000,
            departureTime: 43200,
            activityCategory: 'other' as VPAttr.ActivityCategory,
            activity: 'other' as VPAttr.Activity,
            additionalAttribute: 'additionalValue',
        };
        const errors = BaseVisitedPlace.validateParams(validParams);
        expect(errors).toEqual([]);
    });

    it('should return errors for invalid parameters', () => {
        const invalidParams = {
            _uuid: 'foo', // Invalid UUID
            //basePlace: new BasePlace({} as BasePlaceAttributes),
            arrivalDate: '2023-01-15', // Invalid date string
            departureDate: '2023-01-16', // Invalid date string
            arrivalTime: -1, // Negative arrival time
            departureTime: '12:00 PM', // Invalid departure time string
            activityCategory: 44, // Invalid activity category
            activity: -123283764.34534, // Invalid activity
        };

        const errors = BaseVisitedPlace.validateParams(invalidParams);
        expect(errors).toHaveLength(7);
        expect(errors[0].message).toEqual('Uuidable validateParams: invalid uuid');
        expect(errors[1].message).toEqual('BaseVisitedPlace validateParams: arrivalDate should be a valid Date');
        expect(errors[2].message).toEqual('BaseVisitedPlace validateParams: departureDate should be a valid Date');
        expect(errors[3].message).toEqual('BaseVisitedPlace validateParams: arrivalTime should be a positive integer');
        expect(errors[4].message).toEqual('BaseVisitedPlace validateParams: departureTime should be a positive integer');
        expect(errors[5].message).toEqual('BaseVisitedPlace validateParams: activityCategory should be a string');
        expect(errors[6].message).toEqual('BaseVisitedPlace validateParams: activity should be a string');
    });

    it('should use the create static factory method correctly', () => {
        const invalidParams = {
            _uuid: 'foo', // Invalid UUID
            basePlace: new BasePlace({} as BasePlaceAttributes),
            arrivalDate: '2023-01-15', // Invalid date string
            departureDate: '2023-01-16', // Invalid date string
            arrivalTime: -1, // Negative arrival time
            departureTime: '12:00 PM', // Invalid departure time string
            activityCategory: 44, // Invalid activity category
            activity: -123283764.34534, // Invalid activity
        };
        const validParams = {
            _uuid: uuidV4(), // Invalid UUID
            basePlace: new BasePlace({} as BasePlaceAttributes),
            arrivalDate: new Date('2023-01-15'),
            departureDate: new Date('2023-01-16'),
            arrivalTime: 36000,
            departureTime: 43200,
            activityCategory: 'other' as VPAttr.ActivityCategory,
            activity: 'other' as VPAttr.Activity,
            additionalAttribute: 'additionalValue',
        };

        const invalidResult = BaseVisitedPlace.create(invalidParams);
        const validResult = BaseVisitedPlace.create(validParams);

        expect(invalidResult).toBeInstanceOf(Array);
        expect(invalidResult[0]).toBeInstanceOf(Error);
        expect(validResult).toBeInstanceOf(BaseVisitedPlace);
    });
});
