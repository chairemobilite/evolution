/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { BasePlace, BasePlaceAttributes } from '../BasePlace';
import { GeocodingPrecisionCategory } from '../attributeTypes/PlaceAttributes';
import { BaseAddress } from '../BaseAddress';

const validUUID = uuidV4();
const validUUID2 = uuidV4();



describe('BasePlace', () => {
    const baseAddress: BaseAddress = {
        _uuid: validUUID,
        civicNumber: 123,
        civicNumberSuffix: 'A',
        unitNumber: 456,
        streetName: 'Main St',
        streetNameHomogenized: 'main street',
        streetNameId: 'street123',
        streetNameInternalId: 'internalStreet123',
        municipalityName: 'Sample City',
        municipalityCode: 'sampleCode',
        postalMunicipalityName: 'Sample Postal City',
        region: 'Sample State',
        country: 'Sample Country',
        postalCode: '12345',
        addressId: 'address123',
        internalId: 'internal123',
    };

    const geojson = {
        type: 'Feature',
        id: 112223,
        geometry: {
            type: 'Point',
            coordinates: [45.5, -89.0033423],
        },
        properties: {
            foo: 'boo',
            bar: 'far'
        },
    } as GeoJSON.Feature<GeoJSON.Point, { [key: string]: string }>;

    const basePlaceAttributes: BasePlaceAttributes = {
        _uuid: validUUID2,
        geography: geojson,
        name: 'Sample Place',
        shortname: 'Sample',
        address: baseAddress,
        osmId: 'n1234',
        landRoleId: 'land123',
        postalId: 'postal123',
        buildingId: 'building123',
        internalId: 'internal123',
        geocodingPrecisionCategory: 'high' as GeocodingPrecisionCategory,
        geocodingPrecisionMeters: 100,
        geocodingQueryString: 'Sample query',
        lastAction: 'preGeocoded',
        deviceUsed: 'tablet',
        zoom: 14,
    };

    it('should create a new BasePlace instance', () => {
        const place = new BasePlace(basePlaceAttributes);
        expect(place).toBeInstanceOf(BasePlace);
        expect(place._uuid).toEqual(validUUID2);
        expect(place.name).toEqual('Sample Place');
        expect(place.shortname).toEqual('Sample');
        expect(place.address).toEqual(baseAddress);
        expect(place.osmId).toEqual('n1234');
        expect(place.landRoleId).toEqual('land123');
        expect(place.postalId).toEqual('postal123');
        expect(place.buildingId).toEqual('building123');
        expect(place.internalId).toEqual('internal123');
        expect(place.geocodingPrecisionCategory).toEqual('high');
        expect(place.geocodingPrecisionMeters).toEqual(100);
        expect(place.geocodingQueryString).toEqual('Sample query');
        expect(place.lastAction).toEqual('preGeocoded');
        expect(place.deviceUsed).toEqual('tablet');
        expect(place.zoom).toEqual(14);
        expect(place.geography?.geometry.coordinates).toEqual([45.5, -89.0033423]);
        expect(place.geography?.geometry.type).toEqual('Point');
        expect(place.geography?.type).toEqual('Feature');
        expect(place.geography?.id).toEqual(112223);
        expect(place.geography?.properties?.bar).toEqual('far');
        expect(place.geography?.properties?.foo).toEqual('boo');
    });

    it('should create a new BasePlace instance with only _uuid and name', () => {
        const minimalAttributes: BasePlaceAttributes = {
            geography: undefined,
            _uuid: validUUID2,
            name: 'Sample Place',
        };

        const place = new BasePlace(minimalAttributes);
        expect(place).toBeInstanceOf(BasePlace);
        expect(place._uuid).toEqual(validUUID2);
        expect(place.name).toEqual('Sample Place');
        expect(place.shortname).toBeUndefined();
        expect(place.address).toBeUndefined();
        expect(place.osmId).toBeUndefined();
        expect(place.landRoleId).toBeUndefined();
        expect(place.postalId).toBeUndefined();
        expect(place.buildingId).toBeUndefined();
        expect(place.internalId).toBeUndefined();
        expect(place.geocodingPrecisionCategory).toBeUndefined();
        expect(place.geocodingPrecisionMeters).toBeUndefined();
        expect(place.geocodingQueryString).toBeUndefined();
        expect(place.lastAction).toBeUndefined();
        expect(place.deviceUsed).toBeUndefined();
        expect(place.zoom).toBeUndefined();
    });

    it('should validate a BasePlace instance', () => {
        const place = new BasePlace(basePlaceAttributes);
        expect(place.isValid()).toBeUndefined();
        const validationResult = place.validate();
        expect(validationResult).toBe(true);
        expect(place.isValid()).toBe(true);
    });
});

describe('validateParams', () => {
    it('should validate params with valid GeoJSON', () => {
        const validParams = {
            _uuid: uuidV4(),
            name: 'Sample Place',
            shortname: 'SP',
            geography: {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [1, 2]
                },
                properties: {
                    name: 'Sample Place',
                    address: {
                        civicNumber: 123,
                        streetName: 'Main St',
                        municipalityName: 'City',
                        region: 'State',
                        country: 'Country',
                        postalCode: '12345'
                    }
                }
            },
            osmId: 'n1234',
            landRoleId: 'lr123',
            postalId: 'p123',
            buildingId: 'b123',
            internalId: 'i123',
            geocodingPrecisionCategory: 'precise',
            geocodingPrecisionMeters: 10,
            geocodingQueryString: 'Main St, City',
            lastAction: 'findPlace',
            deviceUsed: 'mobile',
            zoom: 20,
        };

        const errors = BasePlace.validateParams(validParams);
        expect(errors).toEqual([]);
    });

    it('should validate params without geography', () => {
        const validParams = {
            _uuid: uuidV4(),
            name: 'Sample Place',
            shortname: 'SP',
            osmId: 'n1234',
            landRoleId: 'lr123',
            postalId: 'p123',
            buildingId: 'b123',
            internalId: 'i123',
            geocodingPrecisionCategory: 'precise',
            geocodingPrecisionMeters: 10,
            geocodingQueryString: 'Main St, City',
            lastAction: 'markerDragged',
            deviceUsed: 'desktop',
            zoom: 18,
        };

        const errors = BasePlace.validateParams(validParams);
        expect(errors).toEqual([]);
    });

    it('should return errors for invalid GeoJSON', () => {
        const invalidParams = {
            _uuid: uuidV4(),
            name: 'Sample Place',
            shortname: 'SP',
            geography: {
                type: 'Feature',
                geometry: {
                    type: 'Polygon', // Invalid, should be Point
                    coordinates: [
                        [[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]
                    ]
                },
                properties: {
                    name: 'Sample Place',
                    address: {
                        civicNumber: 123,
                        streetName: 'Main St',
                        municipalityName: 'City',
                        region: 'State',
                        country: 'Country',
                        postalCode: '12345'
                    }
                }
            },
            osmId: 'n1234',
            landRoleId: 'lr123',
            postalId: 'p123',
            buildingId: 'b123',
            internalId: 'i123',
            geocodingPrecisionCategory: 'precise',
            geocodingPrecisionMeters: 10,
            geocodingQueryString: 'Main St, City',
            lastAction: 'mapClicked',
            deviceUsed: 'other',
            zoom: 10,
        };

        const errors = BasePlace.validateParams(invalidParams);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].message).toContain('BasePlace validateParams: geography should be a GeoJSON Point feature');
    });

    test('validateParams with invalid parameters', () => {
        const params = {
            geography: 'InvalidGeoJSON', // Invalid type
            shortname: 124, // Invalid type
            name: {}, // Invalid type
            landRoleId: 56789, // Invalid type
            osmId: Infinity, // Invalid type
            buildingId: {}, // Invalid type
            postalId: false, // Invalid type
            internalId: new Date(),
            geocodingPrecisionCategory: 123, // Invalid type
            geocodingPrecisionMeters: 'foo', // Invalid type
            geocodingQueryString: 123, // Invalid type,
            lastAction: new Date(), // Invalid type,
            deviceUsed: {}, // Invalid type,
            zoom: -1.23, // Invalid type,
        };

        const errors = BasePlace.validateParams(params);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors).toEqual([
            new Error('BasePlace validateParams: geography should be a GeoJSON Point feature'),
            new Error('BasePlace validateParams: name should be a string'),
            new Error('BasePlace validateParams: shortname should be a string'),
            new Error('BasePlace validateParams: osmId should be a string'),
            new Error('BasePlace validateParams: landRoleId should be a string'),
            new Error('BasePlace validateParams: postalId should be a string'),
            new Error('BasePlace validateParams: buildingId should be a string'),
            new Error('BasePlace validateParams: internalId should be a string'),
            new Error('BasePlace validateParams: geocodingPrecisionCategory should be a string'),
            new Error('BasePlace validateParams: geocodingPrecisionMeters should be a number'),
            new Error('BasePlace validateParams: geocodingQueryString should be a string'),
            new Error('BasePlace validateParams: lastAction should be a string'),
            new Error('BasePlace validateParams: deviceUsed should be a string'),
            new Error('BasePlace validateParams: zoom should be a positive number'),
        ]);
    });

    test('validateParams with empty parameters', () => {
        const params = {};
        const errors = BasePlace.validateParams(params);
        expect(errors.length).toBe(0);
    });

});
