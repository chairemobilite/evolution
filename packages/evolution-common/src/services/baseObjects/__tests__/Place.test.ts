/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Place, ExtendedPlaceAttributes, placeAttributes } from '../Place';
import { v4 as uuidV4 } from 'uuid';
import { Weight } from '../Weight';
import { WeightMethod, WeightMethodAttributes } from '../WeightMethod';
import { isOk, hasErrors, unwrap } from '../../../types/Result.type';
import { Address, AddressAttributes } from '../Address';
import { SurveyObjectsRegistry } from '../SurveyObjectsRegistry';

describe('Place', () => {
    let registry: SurveyObjectsRegistry;

    beforeEach(() => {
        registry = new SurveyObjectsRegistry();
    });

    const weightMethodAttributes: WeightMethodAttributes = {
        _uuid: uuidV4(),
        shortname: 'sample-shortname',
        name: 'Sample Weight Method',
        description: 'Sample weight method description',
    };

    const validPlaceAttributes: ExtendedPlaceAttributes = {
        _uuid: uuidV4(),
        name: 'Test Place',
        shortname: 'Test',
        osmId: '123',
        propertyRegistryId: 'ABC1234',
        buildingId: '1',
        internalId: '1',
        geocodingPrecisionCategory: 'precise',
        geocodingPrecisionMeters: 10,
        geocodingQueryString: 'Test Place',
        geocodingName: 'Test Place Name',
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

    const extendedPlaceAttributes : { [key: string]: unknown } = {
        ...validPlaceAttributes,
        customAttribute1: 'value1',
        customAttribute2: 'value2',
    };

    const extendedAttributesWithAddress: { [key: string]: unknown } = {
        ...validPlaceAttributes,
        customAttribute: 'custom value',
        _address: {
            _uuid: uuidV4(),
            _isValid: true,
            fullAddress: '123 Main Street',
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
        _address: {
            _isValid: 123,
            fullAddress: 123,
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
            expect(validateParamsCode).toContain('\'' + attributeName + '\'');
        });
    });

    test('should create a Place instance with valid attributes using constructor', () => {
        const place = new Place(validPlaceAttributes, registry);
        expect(place).toBeInstanceOf(Place);
        expect(place.attributes).toEqual(validPlaceAttributes);
    });

    test('should return an error for invalid params', () => {
        const invalidAttributes = 'foo' as any;
        const result = Place.create(invalidAttributes, registry);
        expect(hasErrors(result)).toBe(true);
        expect((unwrap(result) as Error[])).toHaveLength(1);
    });

    test('should create a Place instance with valid attributes', () => {
        const result = Place.create(validPlaceAttributes, registry);
        expect(isOk(result)).toBe(true);
        expect(unwrap(result)).toBeInstanceOf(Place);
    });

    test('should create a Place instance with extended attributes', () => {
        const result = Place.create(extendedPlaceAttributes, registry);
        expect(isOk(result)).toBe(true);
        expect(unwrap(result)).toBeInstanceOf(Place);
    });

    test('should create a Place instance with extended attributes and address', () => {
        const result = Place.create(extendedAttributesWithAddress, registry);
        expect(isOk(result)).toBe(true);
        const place = unwrap(result) as Place;
        expect(place).toBeInstanceOf(Place);
        expect(place.address).toBeInstanceOf(Address);
        expect(place.address?.attributes).toEqual(extendedAttributesWithAddress._address);
    });

    test('should return errors for invalid attributes', () => {
        const invalidAttributes = { ...validPlaceAttributes, name: -1 };
        const result = Place.create(invalidAttributes, registry);
        expect(hasErrors(result)).toBe(true);
        expect((unwrap(result) as Error[]).length).toBeGreaterThan(0);
    });

    test('should unserialize a Place instance', () => {
        const place = Place.unserialize(validPlaceAttributes, registry);
        expect(place).toBeInstanceOf(Place);
        expect(place.attributes).toEqual(validPlaceAttributes);
    });

    test('should validate Place attributes', () => {
        const errors = Place.validateParams(validPlaceAttributes);
        expect(errors).toHaveLength(0);
    });

    test('should get uuid', () => {
        const place = new Place({ ...validPlaceAttributes, _uuid: '11b78eb3-a5d8-484d-805d-1f947160bb9e' }, registry);
        expect(place._uuid).toBe('11b78eb3-a5d8-484d-805d-1f947160bb9e');
    });

    test('should return errors for invalid Place attributes', () => {
        const invalidAttributes = { ...validPlaceAttributes, name: 123 };
        const errors = Place.validateParams(invalidAttributes);
        expect(errors).toHaveLength(1);
    });

    test('should validate a Place instance', () => {
        const place = new Place(validPlaceAttributes, registry);
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
        const place = new Place(placeAttributes, registry);
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
            const placeAttributes: { [key: string]: unknown } = { ...validPlaceAttributes, _weights: weights };
            const result = Place.create(placeAttributes, registry);
            expect(isOk(result)).toBe(true);
            const place = unwrap(result);
            expect((place as Place)._weights).toEqual(weights);
        });
    });

    describe('validateParams', () => {
        test.each([
            ['_uuid', 123],
            ['name', 123],
            ['shortname', 123],
            ['osmId', 123],
            ['propertyRegistryId', 123],
            ['buildingId', 123],
            ['internalId', 123],
            ['geocodingPrecisionCategory', 123],
            ['geocodingPrecisionMeters', 'invalid'],
            ['geocodingQueryString', 123],
            ['geocodingName', 123],
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
            const result = Place.create(extendedInvalidAddressAttributes, registry);
            expect(hasErrors(result)).toBe(true);
            expect((unwrap(result) as Error[])).toHaveLength(7);
        });
    });

    describe('Getters and Setters', () => {
        test.each([
            ['name', 'New Place'],
            ['shortname', 'New'],
            ['osmId', '456'],
            ['propertyRegistryId', 'ABC5678'],
            ['buildingId', '2'],
            ['internalId', '2'],
            ['geocodingPrecisionCategory', 'approximate'],
            ['geocodingPrecisionMeters', 20],
            ['geocodingQueryString', 'New Place'],
            ['geocodingName', 'New Place Name'],
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
            const place = new Place(validPlaceAttributes, registry);
            place[attribute] = value;
            expect(place[attribute]).toEqual(value);
        });

        describe('Getters for attributes with no setters', () => {
            test.each([
                ['_uuid', extendedPlaceAttributes._uuid],
                ['customAttributes', {
                    customAttribute1: extendedPlaceAttributes.customAttribute1,
                    customAttribute2: extendedPlaceAttributes.customAttribute2
                }],
                ['attributes', validPlaceAttributes],
            ])('should set and get %s', (attribute, value) => {
                const place = new Place(extendedPlaceAttributes, registry);
                expect(place[attribute]).toEqual(value);
            });
        });

        test.each([
            ['_isValid', false],
            ['_weights', [{ weight: 2.0, method: new WeightMethod(weightMethodAttributes) }]],
        ])('should set and get %s', (attribute, value) => {
            const place = new Place(validPlaceAttributes, registry);
            place[attribute] = value;
            expect(place[attribute]).toEqual(value);
        });
    });

    describe('Address', () => {
        test('should create an Address instance with valid address', () => {
            const addressAttributes: AddressAttributes = {
                _uuid: uuidV4(),
                fullAddress: '123 New Street',
                civicNumber: 123,
                civicNumberSuffix: 'A',
                unitNumber: '456',
                streetName: 'New Street',
                streetNameHomogenized: 'new street',
                combinedStreetUuid: uuidV4(),
                municipalityName: 'New City',
                municipalityCode: 'NEWCITY',
                postalMunicipalityName: 'New Postal City',
                region: 'New Region',
                country: 'New Country',
                postalCode: 'X9Y 8Z7',
                postalId: 'postal-12345',
                combinedAddressUuid: uuidV4(),
                _isValid: true,
            };
            const address = new Address(addressAttributes);
            const placeAttributes: { [key: string]: unknown } = { ...validPlaceAttributes, _address: addressAttributes };
            const result = Place.create(placeAttributes, registry);
            expect(isOk(result)).toBe(true);
            const place = unwrap(result);
            expect((place as Place).address).toBeInstanceOf(Address);
            expect((place as Place).address).toEqual(address);
        });

        test('should handle Address with postalId correctly', () => {
            const addressAttributes: AddressAttributes = {
                _uuid: uuidV4(),
                fullAddress: '123 Test Avenue',
                civicNumber: 456,
                streetName: 'Test Avenue',
                streetNameHomogenized: 'test avenue',
                combinedStreetUuid: uuidV4(),
                municipalityName: 'Test City',
                region: 'Test Region',
                country: 'Test Country',
                postalCode: 'A1B 2C3',
                postalId: 'test-postal-id',
                combinedAddressUuid: uuidV4(),
                _isValid: true,
            };
            const placeAttributes: { [key: string]: unknown } = { ...validPlaceAttributes, _address: addressAttributes };
            const place = new Place(placeAttributes, registry);

            expect(place.address).toBeInstanceOf(Address);
            expect(place.address?.postalId).toBe('test-postal-id');
            expect(place.address?.combinedStreetUuid).toBe(addressAttributes.combinedStreetUuid);
            expect(place.address?.combinedAddressUuid).toBe(addressAttributes.combinedAddressUuid);
        });

        test('should validate Address with new UUID fields', () => {
            const addressAttributes: AddressAttributes = {
                _uuid: uuidV4(),
                fullAddress: '789 Validation Street',
                civicNumber: 789,
                streetName: 'Validation Street',
                streetNameHomogenized: 'validation street',
                combinedStreetUuid: uuidV4(),
                municipalityName: 'Validation City',
                region: 'Validation Region',
                country: 'Validation Country',
                combinedAddressUuid: uuidV4(),
                _isValid: true,
            };

            const errors = Address.validateParams(addressAttributes);
            expect(errors).toHaveLength(0);
        });
    });

    describe('geographyIsValid', () => {
        test('should return true for valid geography', () => {
            const place = new Place(validPlaceAttributes, registry);
            expect(place.geographyIsValid()).toBe(true);
        });

        test('should return false for invalid geography', () => {
            const place = new Place(validPlaceAttributes, registry);
            place.geography = 'invalid' as any;
            expect(place.geographyIsValid()).toBe(false);
        });

        test('should return undefined for no geography', () => {
            const place = new Place(validPlaceAttributes, registry);
            place.geography = undefined;
            expect(place.geographyIsValid()).toBe(undefined);
        });

        test('should return false for valid feature, but not a point', () => {
            const place = new Place(validPlaceAttributes, registry);
            place.geography = {
                type: 'Feature',
                geometry: {
                    type: 'Polygon',
                    coordinates: [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]],
                },
                properties: {},
            } as any;
            expect(place.geographyIsValid()).toBe(false);
        });
    });
});
