/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Home } from '../Home';
import { ExtendedPlaceAttributes } from '../Place';
import { v4 as uuidV4 } from 'uuid';
import { WeightMethod, WeightMethodAttributes } from '../WeightMethod';
import { isOk, hasErrors } from '../../../types/Result.type';
import { SurveyObjectsRegistry } from '../SurveyObjectsRegistry';

describe('Home', () => {
    let registry: SurveyObjectsRegistry;

    beforeEach(() => {
        registry = new SurveyObjectsRegistry();
    });

    // Factory function to create fresh weight method attributes
    const createWeightMethodAttributes = (): WeightMethodAttributes => ({
        _uuid: uuidV4(),
        shortname: 'sample-shortname',
        name: 'Sample Weight Method',
        description: 'Sample weight method description',
    });

    // Factory function to create fresh valid home attributes
    const createValidHomeAttributes = (): ExtendedPlaceAttributes => ({
        _uuid: uuidV4(),
        name: 'Home Location',
        shortname: 'Home',
        osmId: '456',
        propertyRegistryId: 'HOME123',
        buildingId: '10',
        internalId: '5',
        geocodingPrecisionCategory: 'precise',
        geocodingPrecisionMeters: 5,
        geocodingQueryString: 'Home Address',
        geocodingName: 'Home Name',
        lastAction: 'findPlace',
        deviceUsed: 'mobile',
        zoom: 18,
        geography: {
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [-73.561668, 45.508888], // Montreal coordinates
            },
            properties: {},
        },
        _weights: [{ weight: 1.5, method: new WeightMethod(createWeightMethodAttributes()) }],
        _isValid: true
    });

    // Factory function to create extended home attributes
    const createExtendedHomeAttributes = (): { [key: string]: unknown } => ({
        ...createValidHomeAttributes(),
        customAttribute1: 'home-value1',
        customAttribute2: 'home-value2',
    });

    // Factory function to create extended attributes with address
    const createExtendedAttributesWithAddress = (): { [key: string]: unknown } => ({
        ...createValidHomeAttributes(),
        customAttribute: 'custom home value',
        _address: {
            _uuid: uuidV4(),
            _isValid: true,
            fullAddress: '456 Home Street',
            civicNumber: 456,
            streetName: 'Home Street',
            municipalityName: 'Montreal',
            region: 'Quebec',
            country: 'Canada'
        }
    });

    describe('constructor', () => {
        it('should create a Home instance with valid attributes', () => {
            const validHomeAttributes = createValidHomeAttributes();
            const home = new Home(validHomeAttributes, registry);
            expect(home).toBeInstanceOf(Home);
            expect(home.attributes).toEqual(validHomeAttributes);
        });

        it('should create a Home instance with extended attributes', () => {
            const extendedHomeAttributes = createExtendedHomeAttributes();
            const home = new Home(extendedHomeAttributes as ExtendedPlaceAttributes, registry);
            expect(home).toBeInstanceOf(Home);
            expect(home.customAttributes.customAttribute1).toBe('home-value1');
            expect(home.customAttributes.customAttribute2).toBe('home-value2');
        });

        it('should create a Home instance with address', () => {
            const extendedAttributesWithAddress = createExtendedAttributesWithAddress();
            const home = new Home(extendedAttributesWithAddress as ExtendedPlaceAttributes, registry);
            expect(home).toBeInstanceOf(Home);
            expect(home.address).toBeDefined();
            expect(home.address?.fullAddress).toBe('456 Home Street');
        });

        it('should generate a UUID if not provided', () => {
            const validHomeAttributes = createValidHomeAttributes();
            const paramsWithoutUuid = { ...validHomeAttributes };
            delete paramsWithoutUuid._uuid;
            const home = new Home(paramsWithoutUuid, registry);
            expect(home.uuid).toBeDefined();
            expect(typeof home.uuid).toBe('string');
        });

        it('should register the home in the survey objects registry', () => {
            const validHomeAttributes = createValidHomeAttributes();
            const home = new Home(validHomeAttributes, registry);
            expect(home.uuid).toBeDefined();
            expect(registry.getPlace(home.uuid!)).toBe(home);
        });
    });

    describe('create', () => {
        it('should create a Home instance with valid attributes', () => {
            const validHomeAttributes = createValidHomeAttributes();
            const result = Home.create(validHomeAttributes, registry);
            expect(isOk(result)).toBe(true);
            if (isOk(result)) {
                expect(result.result).toBeInstanceOf(Home);
                expect(result.result.name).toBe('Home Location');
            }
        });

        it('should create a Home instance with extended attributes', () => {
            const extendedHomeAttributes = createExtendedHomeAttributes();
            const result = Home.create(extendedHomeAttributes, registry);
            expect(isOk(result)).toBe(true);
            if (isOk(result)) {
                expect(result.result).toBeInstanceOf(Home);
                expect(result.result.customAttributes.customAttribute1).toBe('home-value1');
            }
        });

        it('should create a Home instance with address', () => {
            const extendedAttributesWithAddress = createExtendedAttributesWithAddress();
            const result = Home.create(extendedAttributesWithAddress, registry);
            expect(isOk(result)).toBe(true);
            if (isOk(result)) {
                expect(result.result).toBeInstanceOf(Home);
                expect(result.result.address).toBeDefined();
                expect(result.result.address?.municipalityName).toBe('Montreal');
            }
        });

        it('should return errors for invalid parameters', () => {
            const invalidParams = 'not an object' as unknown as { [key: string]: unknown };
            const result = Home.create(invalidParams, registry);
            expect(hasErrors(result)).toBe(true);
            if (hasErrors(result)) {
                expect(result.errors.length).toBeGreaterThan(0);
            }
        });

        it('should return errors for invalid attribute types', () => {
            const validHomeAttributes = createValidHomeAttributes();
            const invalidAttributes = { ...validHomeAttributes, name: 123 };
            const result = Home.create(invalidAttributes, registry);
            expect(hasErrors(result)).toBe(true);
            if (hasErrors(result)) {
                expect(result.errors.length).toBeGreaterThan(0);
                expect(result.errors[0].message).toContain('name');
            }
        });

        it('should return errors for invalid geography', () => {
            const validHomeAttributes = createValidHomeAttributes();
            const invalidGeography = {
                ...validHomeAttributes,
                geography: { type: 'InvalidType' }
            };
            const result = Home.create(invalidGeography, registry);
            expect(hasErrors(result)).toBe(true);
            if (hasErrors(result)) {
                expect(result.errors.length).toBeGreaterThan(0);
            }
        });
    });

    describe('unserialize', () => {
        it('should unserialize a Home instance from valid attributes', () => {
            const validHomeAttributes = createValidHomeAttributes();
            const home = Home.unserialize(validHomeAttributes, registry);
            expect(home).toBeInstanceOf(Home);
            expect(home.attributes).toEqual(validHomeAttributes);
        });

        it('should unserialize a Home instance with extended attributes', () => {
            const extendedHomeAttributes = createExtendedHomeAttributes();
            const home = Home.unserialize(extendedHomeAttributes as ExtendedPlaceAttributes, registry);
            expect(home).toBeInstanceOf(Home);
            expect(home.customAttributes.customAttribute1).toBe('home-value1');
        });

        it('should unserialize a Home instance with serialized data structure', () => {
            const validHomeAttributes = createValidHomeAttributes();
            const serializedData = {
                _attributes: validHomeAttributes,
                _customAttributes: { custom1: 'value1' }
            };
            const home = Home.unserialize(serializedData, registry);
            expect(home).toBeInstanceOf(Home);
            expect(home.name).toBe('Home Location');
        });
    });

    describe('geography validation', () => {
        it('should validate correct geography', () => {
            const validHomeAttributes = createValidHomeAttributes();
            const home = new Home(validHomeAttributes, registry);
            expect(home.geographyIsValid()).toBe(true);
        });

        it('should invalidate missing geography', () => {
            const validHomeAttributes = createValidHomeAttributes();
            const paramsWithoutGeography = { ...validHomeAttributes };
            delete paramsWithoutGeography.geography;
            const home = new Home(paramsWithoutGeography, registry);
            expect(home.geographyIsValid()).toBeUndefined();
        });

        it('should invalidate invalid GeoJSON', () => {
            const validHomeAttributes = createValidHomeAttributes();
            const invalidGeographyParams = {
                ...validHomeAttributes,
                geography: { type: 'Invalid' } as unknown as GeoJSON.Feature<GeoJSON.Point>
            };
            const home = new Home(invalidGeographyParams, registry);
            expect(home.geographyIsValid()).toBe(false);
        });

        it('should invalidate non-Point geometry', () => {
            const validHomeAttributes = createValidHomeAttributes();
            const invalidGeometryParams = {
                ...validHomeAttributes,
                geography: {
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates: [[0, 0], [1, 1]],
                    },
                    properties: {},
                } as unknown as GeoJSON.Feature<GeoJSON.Point>
            };
            const home = new Home(invalidGeometryParams, registry);
            expect(home.geographyIsValid()).toBe(false);
        });
    });

    describe('attributes access', () => {
        it('should get and set name', () => {
            const validHomeAttributes = createValidHomeAttributes();
            const home = new Home(validHomeAttributes, registry);
            expect(home.name).toBe('Home Location');
            home.name = 'New Home Name';
            expect(home.name).toBe('New Home Name');
        });

        it('should get and set shortname', () => {
            const validHomeAttributes = createValidHomeAttributes();
            const home = new Home(validHomeAttributes, registry);
            expect(home.shortname).toBe('Home');
            home.shortname = 'NewHome';
            expect(home.shortname).toBe('NewHome');
        });

        it('should get and set geography', () => {
            const validHomeAttributes = createValidHomeAttributes();
            const home = new Home(validHomeAttributes, registry);
            expect(home.geography).toBeDefined();
            const newGeography = {
                type: 'Feature' as const,
                geometry: {
                    type: 'Point' as const,
                    coordinates: [-74.0, 40.7],
                },
                properties: {},
            };
            home.geography = newGeography;
            expect(home.geography).toEqual(newGeography);
        });

        it('should get and set _isValid', () => {
            const validHomeAttributes = createValidHomeAttributes();
            const home = new Home(validHomeAttributes, registry);
            expect(home._isValid).toBe(true);
            home._isValid = false;
            expect(home._isValid).toBe(false);
        });
    });

    describe('custom attributes', () => {
        it('should handle custom attributes', () => {
            const extendedHomeAttributes = createExtendedHomeAttributes();
            const home = new Home(extendedHomeAttributes as ExtendedPlaceAttributes, registry);
            expect(home.customAttributes.customAttribute1).toBe('home-value1');
            expect(home.customAttributes.customAttribute2).toBe('home-value2');
        });

        it('should not include standard attributes in custom attributes', () => {
            const validHomeAttributes = createValidHomeAttributes();
            const home = new Home(validHomeAttributes, registry);
            expect(home.customAttributes.name).toBeUndefined();
            expect(home.customAttributes.geography).toBeUndefined();
        });
    });

    describe('address handling', () => {
        it('should handle home with address', () => {
            const extendedAttributesWithAddress = createExtendedAttributesWithAddress();
            const home = new Home(extendedAttributesWithAddress as ExtendedPlaceAttributes, registry);
            expect(home.address).toBeDefined();
            expect(home.address?.fullAddress).toBe('456 Home Street');
            expect(home.address?.municipalityName).toBe('Montreal');
        });

        it('should handle home without address', () => {
            const validHomeAttributes = createValidHomeAttributes();
            const home = new Home(validHomeAttributes, registry);
            expect(home.address).toBeUndefined();
        });
    });

    describe('weights handling', () => {
        it('should handle home with weights', () => {
            const validHomeAttributes = createValidHomeAttributes();
            const home = new Home(validHomeAttributes, registry);
            expect(home._weights).toBeDefined();
            expect(home._weights?.length).toBe(1);
            expect(home._weights?.[0].weight).toBe(1.5);
        });

        it('should handle home without weights', () => {
            const validHomeAttributes = createValidHomeAttributes();
            const paramsWithoutWeights = { ...validHomeAttributes };
            delete paramsWithoutWeights._weights;
            const home = new Home(paramsWithoutWeights, registry);
            expect(home._weights).toBeUndefined();
        });
    });
});

