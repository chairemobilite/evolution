/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Place, PlaceAttributes, ExtendedPlaceAttributes, placeAttributes } from '../Place';
import { v4 as uuidV4 } from 'uuid';
import { Weight } from '../Weight';
import { WeightMethod, WeightMethodAttributes } from '../WeightMethod';
import { isOk, hasErrors, unwrap } from '../../../types/Result.type';
import { Address, AddressAttributes } from '../Address';

describe('Place', () => {

    const weightMethodAttributes : WeightMethodAttributes = {
        _uuid: uuidV4(),
        shortname: 'sample-shortname',
        name: 'Sample Weight Method',
        description: 'Sample weight method description',
    };

    const validPlaceAttributes: PlaceAttributes = {
        _uuid: uuidV4(),
        name: 'Test Place',
        shortname: 'Test',
        osmId: '123',
        landRoleId: 'residential',
        postalId: '12345',
        buildingId: '1',
        internalId: '1',
        geocodingPrecisionCategory: 'precise',
        geocodingPrecisionMeters: 10,
        geocodingQueryString: 'Test Place',
        lastAction: 'findPlace',
        deviceUsed: 'tablet',
        zoom: 15,
        geography: {
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [0, 0],
            },
            properties: {},
        },
        _weights: [{ weight: 1.2, method: new WeightMethod(weightMethodAttributes) }],
        _isValid: true
    };

    const extendedPlaceAttributes = {
        ...validPlaceAttributes,
        customAttribute1: 'value1',
        customAttribute2: 'value2',
    };

    const extendedAttributesWithAddress: ExtendedPlaceAttributes = {
        ...validPlaceAttributes,
        customAttribute: 'custom value',
        address: {
            _isValid: true,
            civicNumber: 123,
            streetName: 'Main Street',
            municipalityName: 'City',
            region: 'Region',
            country: 'Country'
        }
    };

    const extendedInvalidAddressAttributes: { [key: string]: unknown } = {
        ...validPlaceAttributes,
        customAttribute: 'custom value',
        address: {
            _isValid: 123,
            civicNumber: 'foo',
            streetName: 123,
            municipalityName: 123,
            region: 123,
            country: 123
        }
    };


    test('should have a validateParams section for each attribute', () => {
        const validateParamsCode = Place.validateParams.toString();
        placeAttributes.filter((attribute) => attribute !== '_uuid' && attribute !== '_weights').forEach((attributeName) => {
            expect(validateParamsCode).toContain('\''+attributeName+'\'');
        });
    });

    test('should create a Place instance with valid attributes using constructor', () => {
        const place = new Place(validPlaceAttributes);
        expect(place).toBeInstanceOf(Place);
        expect(place.attributes).toEqual(validPlaceAttributes);
    });

    test('should return an error for invalid params', () => {
        const invalidAttributes = 'foo' as any;
        const result = Place.create(invalidAttributes);
        expect(hasErrors(result)).toBe(true);
        expect((unwrap(result) as Error[])).toHaveLength(1);
    });

    test('should create a Place instance with valid attributes', () => {
        const result = Place.create(validPlaceAttributes);
        expect(isOk(result)).toBe(true);
        expect(unwrap(result)).toBeInstanceOf(Place);
    });

    test('should create a Place instance with extended attributes', () => {
        const result = Place.create(extendedPlaceAttributes);
        expect(isOk(result)).toBe(true);
        expect(unwrap(result)).toBeInstanceOf(Place);
    });

    test('should create a Place instance with extended attributes and address', () => {
        const result = Place.create(extendedAttributesWithAddress);
        expect(isOk(result)).toBe(true);
        const place = unwrap(result) as Place<PlaceAttributes>;
        expect(place).toBeInstanceOf(Place);
        expect(place.address).toBeInstanceOf(Address);
        expect(place.address?.attributes).toEqual(extendedAttributesWithAddress.address);
    });

    test('should return errors for invalid attributes', () => {
        const invalidAttributes = { ...validPlaceAttributes, name: -1 };
        const result = Place.create(invalidAttributes);
        expect(hasErrors(result)).toBe(true);
        expect((unwrap(result) as Error[]).length).toBeGreaterThan(0);
    });

    test('should unserialize a Place instance', () => {
        const place = Place.unserialize(validPlaceAttributes);
        expect(place).toBeInstanceOf(Place);
        expect(place.attributes).toEqual(validPlaceAttributes);
    });

    test('should validate Place attributes', () => {
        const errors = Place.validateParams(validPlaceAttributes);
        expect(errors).toHaveLength(0);
    });

    test('should get uuid', () => {
        const place = new Place({ ...validPlaceAttributes, _uuid: '11b78eb3-a5d8-484d-805d-1f947160bb9e' });
        expect(place._uuid).toBe('11b78eb3-a5d8-484d-805d-1f947160bb9e');
    });

    test('should return errors for invalid Place attributes', () => {
        const invalidAttributes = { ...validPlaceAttributes, name: 123 };
        const errors = Place.validateParams(invalidAttributes);
        expect(errors).toHaveLength(1);
    });

    test('should validate a Place instance', () => {
        const place = new Place(validPlaceAttributes);
        expect(place.validate()).toBe(true);
        expect(place.isValid()).toBe(true);
    });

    test('should create a Place instance with custom attributes', () => {
        const customAttributes = {
            customAttribute1: 'value1',
            customAttribute2: 'value2',
        };
        const placeAttributes = {
            ...validPlaceAttributes,
            ...customAttributes,
        };
        const place = new Place(placeAttributes);
        expect(place).toBeInstanceOf(Place);
        expect(place.attributes).toEqual(validPlaceAttributes);
        expect(place.customAttributes).toEqual(customAttributes);
    });

    describe('Weights and WeightMethods', () => {
        test('should create a Place instance with valid weights', () => {
            const weightMethodAttributes: WeightMethodAttributes = {
                _uuid: uuidV4(),
                shortname: 'sample-shortname',
                name: 'Sample Weight Method',
                description: 'Sample weight method description',
            };
            const weightMethod = new WeightMethod(weightMethodAttributes);
            const weights: Weight[] = [{ weight: 1.5, method: weightMethod }];
            const placeAttributes: PlaceAttributes = { ...validPlaceAttributes, _weights: weights };
            const result = Place.create(placeAttributes);
            expect(isOk(result)).toBe(true);
            const place = unwrap(result);
            expect((place as Place<PlaceAttributes>)._weights).toEqual(weights);
        });
    });

    describe('validateParams', () => {
        test.each([
            ['_uuid', 123],
            ['name', 123],
            ['shortname', 123],
            ['osmId', 123],
            ['landRoleId', 123],
            ['postalId', 123],
            ['buildingId', 123],
            ['internalId', 123],
            ['geocodingPrecisionCategory', 123],
            ['geocodingPrecisionMeters', 'invalid'],
            ['geocodingQueryString', 123],
            ['lastAction', 123],
            ['deviceUsed', 123],
            ['zoom', 'invalid'],
            ['geography', 'invalid'],
        ])('should return an error for invalid %s', (param, value) => {
            const invalidAttributes = { ...validPlaceAttributes, [param]: value };
            const errors = Place.validateParams(invalidAttributes);
            expect(errors[0].toString()).toContain(param);
            expect(errors).toHaveLength(1);
        });

        test('should return no errors for valid attributes', () => {
            const errors = Place.validateParams(validPlaceAttributes);
            expect(errors).toHaveLength(0);
        });

        test('should return an error for invalid address', () => {
            const result = Place.create(extendedInvalidAddressAttributes);
            expect(hasErrors(result)).toBe(true);
            expect((unwrap(result) as Error[])).toHaveLength(6);
        });
    });

    describe('Getters and Setters', () => {
        test.each([
            ['name', 'New Place'],
            ['shortname', 'New'],
            ['osmId', '456'],
            ['landRoleId', 'commercial'],
            ['postalId', '54321'],
            ['buildingId', '2'],
            ['internalId', '2'],
            ['geocodingPrecisionCategory', 'approximate'],
            ['geocodingPrecisionMeters', 20],
            ['geocodingQueryString', 'New Place'],
            ['lastAction', 'mapClicked'],
            ['deviceUsed', 'web'],
            ['zoom', 12],
            ['geography', {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [1, 1],
                },
                properties: {},
            }],
        ])('should set and get %s', (attribute, value) => {
            const place = new Place(validPlaceAttributes);
            place[attribute] = value;
            expect(place[attribute]).toEqual(value);
        });

        test.each([
            ['_isValid', false],
            ['_weights', [{ weight: 2.0, method: new WeightMethod(weightMethodAttributes) }]],
        ])('should set and get %s', (attribute, value) => {
            const place = new Place(validPlaceAttributes);
            place[attribute] = value;
            expect(place[attribute]).toEqual(value);
        });
    });

    describe('Address', () => {
        test('should create an Address instance with valid address', () => {
            const addressAttributes: AddressAttributes = {
                _uuid: uuidV4(),
                civicNumber: 123,
                civicNumberSuffix: 'A',
                unitNumber: '456',
                streetName: 'New Street',
                streetNameHomogenized: 'new street',
                streetNameId: 'new-street-id',
                municipalityName: 'New City',
                municipalityCode: 'NEWCITY',
                postalMunicipalityName: 'New Postal City',
                region: 'New Region',
                country: 'New Country',
                postalCode: 'X9Y 8Z7',
                addressId: 'new-address-id',
                _isValid: true,
            };
            const address = new Address(addressAttributes);
            const placeAttributes: ExtendedPlaceAttributes = { ...validPlaceAttributes, address: addressAttributes };
            const result = Place.create(placeAttributes);
            expect(isOk(result)).toBe(true);
            const place = unwrap(result);
            expect((place as Place<PlaceAttributes>).address).toBeInstanceOf(Address);
            expect((place as Place<PlaceAttributes>).address).toEqual(address);
        });
    });
});
