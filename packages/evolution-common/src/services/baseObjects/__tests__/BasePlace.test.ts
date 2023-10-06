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
    };

    it('should create a new BasePlace instance', () => {
        const place = new BasePlace(geojson, basePlaceAttributes);
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
        expect(place.geography?.geometry.coordinates).toEqual([45.5, -89.0033423]);
        expect(place.geography?.geometry.type).toEqual('Point');
        expect(place.geography?.type).toEqual('Feature');
        expect(place.geography?.id).toEqual(112223);
        expect(place.geography?.properties?.bar).toEqual('far');
        expect(place.geography?.properties?.foo).toEqual('boo');
    });

    it('should create a new BasePlace instance with only _uuid and name', () => {
        const minimalAttributes: BasePlaceAttributes = {
            _uuid: validUUID2,
            name: 'Sample Place',
        };

        const place = new BasePlace(undefined, minimalAttributes);
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
    });

    it('should validate a BasePlace instance', () => {
        const place = new BasePlace(undefined, basePlaceAttributes);
        expect(place.isValid()).toBeUndefined();
        const validationResult = place.validate();
        expect(validationResult).toBe(true);
        expect(place.isValid()).toBe(true);
    });
});
