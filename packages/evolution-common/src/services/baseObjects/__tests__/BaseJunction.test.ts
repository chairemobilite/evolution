/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { BaseJunction, BaseJunctionAttributes, ExtendedJunctionAttributes } from '../BaseJunction';
import { BasePlace, BasePlaceAttributes } from '../BasePlace';

const validUUID = uuidV4();

describe('BaseJunction', () => {

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

    const basePlaceAttributes: BasePlaceAttributes = {
        geography: geojson,
        _uuid: validUUID,
    };

    const baseJunctionAttributes: BaseJunctionAttributes = {
        _uuid: validUUID,
        uuid: validUUID,
        arrivalDate: '2023-10-05',
        departureDate: '2023-10-06',
        arrivalTime: 36000, // 10:00 AM in seconds since midnight
        departureTime: 45000, // 12:30 PM in seconds since midnight
    };

    it('should create a new BaseJunction instance', () => {
        const junction = new BaseJunction({ ...baseJunctionAttributes, basePlace: new BasePlace(basePlaceAttributes) });
        expect(junction).toBeInstanceOf(BaseJunction);
        expect(junction._uuid).toEqual(validUUID);
        expect(junction.basePlace).toBeInstanceOf(BasePlace);
        expect(junction.basePlace?.geography?.type).toEqual('Feature');
        expect(junction.basePlace?.geography?.geometry?.type).toEqual('Point');
        expect(junction.basePlace?.geography?.geometry?.coordinates).toEqual([23.5, -11.0033423]);
        expect(junction.basePlace?.geography?.properties).toEqual({ foo: 'boo2', bar: 'far2' });
        expect(junction.basePlace?.geography?.id).toEqual(444);
        expect(junction.arrivalDate).toEqual('2023-10-05');
        expect(junction.departureDate).toEqual('2023-10-06');
        expect(junction.arrivalTime).toEqual(36000);
        expect(junction.departureTime).toEqual(45000);
    });

    it('should create a new BaseJunction instance with minimal attributes', () => {
        const minimalBasePlaceAttributes: BasePlaceAttributes = {
            geography: undefined,
            _uuid: validUUID,
            name: 'Minimal Test Place',
        };

        const minimalJunctionAttributes: BaseJunctionAttributes = {
            _uuid: validUUID,
            uuid: validUUID,
        };

        const junction = new BaseJunction({ ...minimalJunctionAttributes, basePlace: new BasePlace(minimalBasePlaceAttributes) });
        expect(junction).toBeInstanceOf(BaseJunction);
        expect(junction.uuid).toEqual(validUUID);
        expect(junction.basePlace).toBeInstanceOf(BasePlace);
        expect(junction.basePlace?.geography).toBeUndefined();
        expect(junction.basePlace?.name).toEqual('Minimal Test Place');
        expect(junction.arrivalDate).toBeUndefined();
        expect(junction.departureDate).toBeUndefined();
        expect(junction.arrivalTime).toBeUndefined();
        expect(junction.departureTime).toBeUndefined();
    });

    it('should validate a BaseJunction instance', () => {
        const junction = new BaseJunction({ ...baseJunctionAttributes, basePlace: new BasePlace(basePlaceAttributes) });
        expect(junction.isValid()).toBeUndefined();
        const validationResult = junction.validate();
        expect(validationResult).toBe(true);
        expect(junction.isValid()).toBe(true);
    });

    it('should accept extended attributes', () => {
        const extendedJunctionAttributes: ExtendedJunctionAttributes = {
            ...baseJunctionAttributes,
            customAttribute: 'Custom Value',
        };

        const junction = new BaseJunction({ ...extendedJunctionAttributes, basePlace: new BasePlace(basePlaceAttributes) });
        expect(junction).toBeInstanceOf(BaseJunction);
    });

    it('should validate valid parameters', () => {
        const validParams = {
            _uuid: uuidV4(),
            basePlace: new BasePlace({} as BasePlaceAttributes),
            arrivalDate: '2023-01-15',
            departureDate: '2023-01-16',
            arrivalTime: 36000, // 10:00 AM in seconds since midnight
            departureTime: 43200, // 12:00 PM in seconds since midnight
        };
        const errors = BaseJunction.validateParams(validParams);
        expect(errors).toEqual([]);
    });

    it('should validate valid parameters with minimal attributes', () => {
        const validParams = {};
        const errors = BaseJunction.validateParams(validParams);
        expect(errors).toEqual([]);
    });

    it('should validate valid parameters with additional attributes', () => {
        const validParams = {
            _uuid: uuidV4(),
            basePlace: new BasePlace({} as BasePlaceAttributes),
            arrivalDate: '2023-01-15',
            departureDate: '2023-01-16',
            arrivalTime: 36000,
            departureTime: 43200,
            additionalAttribute: 'additionalValue',
        };
        const errors = BaseJunction.validateParams(validParams);
        expect(errors).toEqual([]);
    });

    it('should return errors for invalid parameters', () => {
        const invalidParams = {
            _uuid: 'foo', // Invalid UUID
            //basePlace: new BasePlace({} as BasePlaceAttributes),
            arrivalDate: {}, // Invalid date string
            departureDate: [], // Invalid date string
            arrivalTime: -1, // Negative arrival time
            departureTime: '12:00 PM', // Invalid departure time string
            activityCategory: 44, // Invalid activity category
            activity: -123283764.34534, // Invalid activity
        };

        const errors = BaseJunction.validateParams(invalidParams);
        expect(errors).toHaveLength(5);
        expect(errors[0].message).toEqual('Uuidable validateParams: _uuid should be a valid uuid');
        expect(errors[1].message).toEqual('BaseJunction validateParams: arrivalDate should be a valid date string');
        expect(errors[2].message).toEqual('BaseJunction validateParams: departureDate should be a valid date string');
        expect(errors[3].message).toEqual('BaseJunction validateParams: arrivalTime should be a positive integer');
        expect(errors[4].message).toEqual('BaseJunction validateParams: departureTime should be a positive integer');
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
            arrivalDate: '2023-01-15',
            departureDate: '2023-01-16',
            arrivalTime: 36000,
            departureTime: 43200,
            additionalAttribute: 'additionalValue',
        };

        const invalidResult = BaseJunction.create(invalidParams);
        const validResult = BaseJunction.create(validParams);

        expect(invalidResult).toBeInstanceOf(Array);
        expect(invalidResult[0]).toBeInstanceOf(Error);
        expect(validResult).toBeInstanceOf(BaseJunction);
    });

    it('should unserialize object', () => {
        const instance = BaseJunction.unserialize({ ...baseJunctionAttributes, basePlace: BasePlace.unserialize(basePlaceAttributes) });
        expect(instance).toBeInstanceOf(BaseJunction);
        expect(instance.departureDate).toEqual(baseJunctionAttributes.departureDate);
    });
});
