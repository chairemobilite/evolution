/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Address, ExtendedAddressAttributes, addressAttributes } from '../Address';
import { v4 as uuidV4 } from 'uuid';
import { isOk, hasErrors, unwrap } from '../../../types/Result.type';

describe('Address', () => {
    const validAddressAttributes: ExtendedAddressAttributes = {
        _uuid: uuidV4(),
        _isValid: true,
        civicNumber: 123,
        civicNumberSuffix: 'A',
        unitNumber: '456',
        streetName: 'Main Street',
        streetNameHomogenized: 'main street',
        streetNameId: 'street-id',
        municipalityName: 'City',
        municipalityCode: 'CITY',
        postalMunicipalityName: 'Postal City',
        region: 'Region',
        country: 'Country',
        postalCode: 'A1B 2C3',
        addressId: 'address-id'
    };

    /**
     * This tests only checks that we did not forget to validate all params in the class attributes:
     * it will check that the validateParams includes at least each param name in quotes
     */
    test('should have a validateParams section for each attribute', () => {
        const validateParamsCode = Address.validateParams.toString();
        addressAttributes.filter((attribute) => attribute !== '_uuid').forEach((attributeName) => {
            expect(validateParamsCode).toContain('\'' + attributeName + '\'');
        });
    });

    test('should get uuid', () => {
        const address = new Address({ ...validAddressAttributes, _uuid: '11b78eb3-a5d8-484d-805d-1f947160bb9e' });
        expect(address._uuid).toBe('11b78eb3-a5d8-484d-805d-1f947160bb9e');
    });

    test('should create an Address instance with valid attributes using constructor', () => {
        const address = new Address(validAddressAttributes);
        expect(address).toBeInstanceOf(Address);
        expect(address.attributes).toEqual(validAddressAttributes);
    });

    test('should return an error for invalid params', () => {
        const invalidAttributes = 'foo' as any;
        const result = Address.create(invalidAttributes);
        expect(hasErrors(result)).toBe(true);
        expect((unwrap(result) as Error[])).toHaveLength(1);
    });

    test('should create an Address instance with valid attributes', () => {
        const result = Address.create(validAddressAttributes);
        expect(isOk(result)).toBe(true);
        expect(unwrap(result)).toBeInstanceOf(Address);
    });

    test('should return errors for invalid attributes', () => {
        const invalidAttributes = { ...validAddressAttributes, civicNumber: -1 };
        const result = Address.create(invalidAttributes);
        expect(hasErrors(result)).toBe(true);
        expect((unwrap(result) as Error[]).length).toBeGreaterThan(0);
    });

    test('should unserialize an Address instance', () => {
        const address = Address.unserialize(validAddressAttributes);
        expect(address).toBeInstanceOf(Address);
        expect(address.attributes).toEqual(validAddressAttributes);
    });

    test('should validate Address attributes', () => {
        const errors = Address.validateParams(validAddressAttributes);
        expect(errors).toHaveLength(0);
    });

    test('should return errors for invalid Address attributes', () => {
        const invalidAttributes = { ...validAddressAttributes, civicNumber: 'invalid' };
        const errors = Address.validateParams(invalidAttributes);
        expect(errors).toHaveLength(1);
    });

    test('should validate an Address instance', () => {
        const address = new Address(validAddressAttributes);
        expect(address.validate()).toBe(true);
        expect(address.isValid()).toBe(true);
    });

    test('should create an Address instance with custom attributes', () => {
        const customAttributes: { [key: string]: unknown } = {
            customAttribute: 'custom value',
        };
        const addressAttributes: ExtendedAddressAttributes = {
            ...validAddressAttributes,
            ...customAttributes,
        };
        const address = new Address(addressAttributes);
        expect(address).toBeInstanceOf(Address);
        expect(address.attributes).toEqual(validAddressAttributes);
        expect(address.customAttributes).toEqual(customAttributes);
    });

    describe('Getters and Setters', () => {
        test.each([
            ['civicNumber', 789],
            ['civicNumberSuffix', 'B'],
            ['unitNumber', '987A'],
            ['streetName', 'New Street'],
            ['streetNameHomogenized', 'new street'],
            ['streetNameId', 'new-street-id'],
            ['municipalityName', 'New City'],
            ['municipalityCode', 'NEWCITY'],
            ['postalMunicipalityName', 'New Postal City'],
            ['region', 'New Region'],
            ['country', 'New Country'],
            ['postalCode', 'X9Y 8Z7'],
            ['addressId', 'new-address-id'],
            ['_isValid', false],
        ])('should set and get %s', (attribute, value) => {
            const address = new Address(validAddressAttributes);
            address[attribute] = value;
            expect(address[attribute]).toEqual(value);
        });

    });

    describe('validateParams', () => {
        test.each([
            ['civicNumber', 'invalid'],
            ['unitNumber', {}],
            ['streetName', 123],
            ['municipalityName', 123],
            ['region', 123],
            ['country', 123],
            ['postalCode', 123],
            ['addressId', 123],
            ['civicNumberSuffix', 123],
            ['streetNameHomogenized', 123],
            ['streetNameId', 123],
            ['municipalityCode', 123],
            ['postalMunicipalityName', 123],
        ])('should return an error for invalid %s', (param, value) => {
            const invalidAttributes = { ...validAddressAttributes, [param]: value };
            const errors = Address.validateParams(invalidAttributes);
            expect(errors[0].toString()).toContain(param);
            expect(errors).toHaveLength(1);
        });

        describe('Getters for attributes with no setters', () => {
            test.each([
                ['_uuid', validAddressAttributes._uuid],
                ['attributes', validAddressAttributes],
            ])('should set and get %s', (attribute, value) => {
                const address = new Address(validAddressAttributes);
                expect(address[attribute]).toEqual(value);
            });
        });

        test('should return no errors for valid attributes', () => {
            const errors = Address.validateParams(validAddressAttributes);
            expect(errors).toHaveLength(0);
        });
    });
});
