/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { BaseAddress } from '../BaseAddress';

describe('BaseAddress Class Tests', () => {

    const _uuid = uuidV4();
    const addressParams = {
        _uuid,
        civicNumber: 123,
        civicNumberSuffix: 'A',
        unitNumber: 456,
        streetName: 'Main St',
        streetNameHomogenized: 'main st',
        streetNameId: 'ID001',
        streetNameInternalId: 'INT001',
        municipalityName: 'Sample City',
        municipalityCode: 'SC001',
        postalMunicipalityName: 'Postal Sample City',
        region: 'Sample Region',
        country: 'Sample Country',
        postalCode: '12345',
        addressId: 'A001',
        internalId: 'INT_A001'
    };

    it('should instantiate correctly with the provided parameters', () => {
        const addressInstance = new BaseAddress(addressParams);
        expect(addressInstance._uuid).toEqual(_uuid);
        expect(addressInstance.civicNumber).toEqual(addressParams.civicNumber);
        expect(addressInstance.streetName).toEqual(addressParams.streetName);
        expect(addressInstance.municipalityName).toEqual(addressParams.municipalityName);
    });

    it('should set optional properties correctly', () => {
        const addressInstance = new BaseAddress(addressParams);
        expect(addressInstance.civicNumberSuffix).toEqual(addressParams.civicNumberSuffix);
        expect(addressInstance.unitNumber).toEqual(addressParams.unitNumber);
        expect(addressInstance.streetNameHomogenized).toEqual(addressParams.streetNameHomogenized);
        expect(addressInstance.streetNameId).toEqual(addressParams.streetNameId);
        expect(addressInstance.streetNameInternalId).toEqual(addressParams.streetNameInternalId);
        expect(addressInstance.municipalityCode).toEqual(addressParams.municipalityCode);
        expect(addressInstance.postalMunicipalityName).toEqual(addressParams.postalMunicipalityName);
        expect(addressInstance.postalCode).toEqual(addressParams.postalCode);
        expect(addressInstance.addressId).toEqual(addressParams.addressId);
        expect(addressInstance.internalId).toEqual(addressParams.internalId);
    });

    it('should have correct region and country', () => {
        const addressInstance = new BaseAddress(addressParams);
        expect(addressInstance.region).toEqual(addressParams.region);
        expect(addressInstance.country).toEqual(addressParams.country);
    });

    it('should unserialize object', () => {
        const instance = BaseAddress.unserialize(addressParams);
        expect(instance).toBeInstanceOf(BaseAddress);
        expect(instance.region).toEqual(addressParams.region);
        expect(instance.country).toEqual(addressParams.country);
    });

});
