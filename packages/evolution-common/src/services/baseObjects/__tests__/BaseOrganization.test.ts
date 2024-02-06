/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { BaseOrganization, BaseOrganizationAttributes, ExtendedOrganizationAttributes } from '../BaseOrganization';
import * as OAttr from '../attributeTypes/OrganizationAttributes';
import { Weight } from '../Weight';
import { WeightMethod } from '../WeightMethod';

const validUUID = uuidV4();

describe('BaseOrganization', () => {

    const weightMethodAttributes = {
        _uuid: uuidV4(),
        shortname: 'sample-shortname',
        name: 'Sample Weight Method',
        description: 'Sample weight method description',
    };

    const baseOrganizationAttributes: BaseOrganizationAttributes = {
        _uuid: validUUID,
        name: 'XYZ Corp',
        shortname: 'xyz_corp',
        category: 'company' as OAttr.OrganizationCategory,
        size: 500,
        contactEmail: 'test@test.test',
        contactPhoneNumber: '123-456-7890',
        vehicleNumber: 23,
        pluginHybridVehicleNumber: 12,
        electricVehicleNumber: 0,
        _weights: [{ weight: 0.1, method: new WeightMethod(weightMethodAttributes) }],
    };


    it('should create a new BaseOrganization instance', () => {
        const organization = new BaseOrganization(baseOrganizationAttributes);
        expect(organization).toBeInstanceOf(BaseOrganization);
        expect(organization._uuid).toEqual(validUUID);
        expect(organization.name).toEqual('XYZ Corp');
        expect(organization.shortname).toEqual('xyz_corp');
        expect(organization.category).toEqual('company');
        expect(organization.size).toEqual(500);
        expect(organization.contactEmail).toEqual('test@test.test');
        expect(organization.contactPhoneNumber).toEqual('123-456-7890');
        expect(organization.vehicleNumber).toEqual(23);
        expect(organization.pluginHybridVehicleNumber).toEqual(12);
        expect(organization.electricVehicleNumber).toEqual(0);
        expect(organization._weights).toBeDefined();
    });

    it('should create a new BaseOrganization instance with minimal attributes', () => {
        const minimalAttributes: BaseOrganizationAttributes = {
            _uuid: validUUID
        };

        const organization = new BaseOrganization(minimalAttributes);
        expect(organization).toBeInstanceOf(BaseOrganization);
        expect(organization._uuid).toEqual(validUUID);
        expect(organization.name).toBeUndefined();
        expect(organization.shortname).toBeUndefined();
        expect(organization.category).toBeUndefined();
        expect(organization.size).toBeUndefined();
    });

    it('should validate a BaseOrganization instance', () => {
        const organization = new BaseOrganization(baseOrganizationAttributes);
        expect(organization.isValid()).toBeUndefined();
        const validationResult = organization.validate();
        expect(validationResult).toBe(true);
        expect(organization.isValid()).toBe(true);
    });

    it('should accept extended attributes', () => {
        const extendedAttributes: ExtendedOrganizationAttributes = {
            ...baseOrganizationAttributes,
            customAttribute: 'Custom Value',
        };

        const organization = new BaseOrganization(extendedAttributes);
        expect(organization).toBeInstanceOf(BaseOrganization);
    });

    it('should set weight and method correctly', () => {
        const organization = new BaseOrganization(baseOrganizationAttributes);
        const weight: Weight = organization._weights?.[0] as Weight;
        expect(weight.weight).toBe(0.1);
        expect(weight.method).toBeInstanceOf(WeightMethod);
        expect(weight.method.shortname).toEqual('sample-shortname');
        expect(weight.method.name).toEqual('Sample Weight Method');
        expect(weight.method.description).toEqual('Sample weight method description');
    });

    it('should validate params with valid values', () => {
        const validParams = {
            _uuid: uuidV4(),
            name: 'Valid Org',
            shortname: 'VO',
            size: 100,
            category: 'Category',
            vehicleNumber: 5,
            pluginHybridVehicleNumber: 2,
            electricVehicleNumber: 3,
            contactPhoneNumber: '123-456-7890',
            contactEmail: 'valid@example.com',
            _weights: [{ weight: 2.333, method: new WeightMethod(weightMethodAttributes) }],
        };

        const errors = BaseOrganization.validateParams(validParams);
        expect(errors.length).toBe(0);
    });

    it('should return errors for invalid params', () => {
        const invalidParams = {
            _uuid: 123, // Invalid UUID
            name: 123, // Invalid name
            shortname: 456, // Invalid shortname
            size: -1, // Negative size
            category: {}, // Invalid category
            vehicleNumber: 'invalid', // Non-integer vehicleNumber
            pluginHybridVehicleNumber: -2, // Negative pluginHybridVehicleNumber
            electricVehicleNumber: 'invalid', // Non-integer electricVehicleNumber
            contactPhoneNumber: 1234567890, // Invalid contactPhoneNumber
            contactEmail: 'invalid-email', // Invalid contactEmail
            _weights: 'not-an-array', // Invalid _weights
        };

        const errors = BaseOrganization.validateParams(invalidParams);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors).toEqual([
            new Error('Uuidable validateParams: invalid uuid'),
            new Error('Weightable validateWeights: _weights should be an array'),
            new Error('BaseOrganization validateParams: name should be a string'),
            new Error('BaseOrganization validateParams: shortname should be a string'),
            new Error('BaseOrganization validateParams: size should be a positive integer'),
            new Error('BaseOrganization validateParams: category is not a valid organization category'),
            new Error('BaseOrganization validateParams: vehicleNumber should be a positive integer'),
            new Error('BaseOrganization validateParams: pluginHybridVehicleNumber should be a positive integer'),
            new Error('BaseOrganization validateParams: electricVehicleNumber should be a positive integer'),
            new Error('BaseOrganization validateParams: contactPhoneNumber should be a string'),
        ]);
    });

    it('should validate params with missing optional values', () => {
        const params = {
            _uuid: uuidV4(),
            name: 'Valid Org',
        };

        const errors = BaseOrganization.validateParams(params);
        expect(errors.length).toBe(0);
    });

    it('should unserialize object', () => {
        const instance = BaseOrganization.unserialize(baseOrganizationAttributes);
        expect(instance).toBeInstanceOf(BaseOrganization);
        expect(instance.name).toEqual(baseOrganizationAttributes.name);
    });
});
