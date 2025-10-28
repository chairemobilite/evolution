/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Organization, OrganizationAttributes, ExtendedOrganizationAttributes, organizationAttributes } from '../Organization';
import { VehicleAttributes } from '../Vehicle';
import { PlaceAttributes } from '../Place';
import { v4 as uuidV4 } from 'uuid';
import { WeightMethod, WeightMethodAttributes } from '../WeightMethod';
import { isOk, hasErrors, unwrap } from '../../../types/Result.type';
import { SurveyObjectsRegistry } from '../SurveyObjectsRegistry';

describe('Organization', () => {
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

    const validAttributes: OrganizationAttributes = {
        _uuid: uuidV4(),
        name: 'Sample Organization',
        shortname: 'SO',
        numberOfEmployees: 100,
        category: 'Technology',
        contactFirstName: 'John',
        contactLastName: 'Doe',
        contactPhoneNumber: '1234567890',
        contactEmail: 'john.doe@example.com',
        revenueLevel: 'High',
        _weights: [{ weight: 1.5, method: new WeightMethod(weightMethodAttributes) }],
        _isValid: true,
    };

    const extendedAttributes: ExtendedOrganizationAttributes = {
        ...validAttributes,
        customAttribute: 'Custom Value',
        _vehicles: [
            {
                _uuid: uuidV4(),
                make: 'Toyota',
                model: 'Camry',
                _isValid: true,
            },
        ],
        _places: [
            {
                _uuid: uuidV4(),
                name: 'Headquarters',
                geography: {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [0, 0],
                    },
                    properties: {},
                },
                _isValid: true,
            },
        ],
    };

    test('should create an Organization instance with valid attributes', () => {
        const organization = new Organization(validAttributes, registry);
        expect(organization).toBeInstanceOf(Organization);
        expect(organization.attributes).toEqual(validAttributes);
    });

    test('should have a validateParams section for each attribute', () => {
        const validateParamsCode = Organization.validateParams.toString();
        organizationAttributes.filter((attribute) => attribute !== '_uuid' && attribute !== '_weights').forEach((attributeName) => {
            expect(validateParamsCode).toContain('\'' + attributeName + '\'');
        });
    });

    test('should get uuid', () => {
        const organization = new Organization({ ...validAttributes, _uuid: '11b78eb3-a5d8-484d-805d-1f947160bb9e' }, registry);
        expect(organization._uuid).toBe('11b78eb3-a5d8-484d-805d-1f947160bb9e');
    });

    test('should create an Organization instance with valid attributes', () => {
        const result = Organization.create(validAttributes, registry);
        expect(isOk(result)).toBe(true);
        expect(unwrap(result)).toBeInstanceOf(Organization);
    });

    test('should return an error for invalid params', () => {
        const invalidAttributes = 'foo' as any;
        const result = Organization.create(invalidAttributes, registry);
        expect(hasErrors(result)).toBe(true);
        expect((unwrap(result) as Error[]).length).toBeGreaterThan(0);
    });

    test('should create an Organization instance with extended attributes', () => {
        const result = Organization.create(extendedAttributes, registry);
        expect(isOk(result)).toBe(true);
        expect(unwrap(result)).toBeInstanceOf(Organization);
    });

    test('should return errors for invalid attributes', () => {
        const invalidAttributes = { ...validAttributes, numberOfEmployees: 'invalid' };
        const result = Organization.create(invalidAttributes, registry);
        expect(hasErrors(result)).toBe(true);
        expect((unwrap(result) as Error[]).length).toBeGreaterThan(0);
    });

    test('should unserialize an Organization instance', () => {
        const organization = Organization.unserialize(validAttributes, registry);
        expect(organization).toBeInstanceOf(Organization);
        expect(organization.attributes).toEqual(validAttributes);
    });

    test('should validate Organization attributes', () => {
        const errors = Organization.validateParams(validAttributes);
        expect(errors).toHaveLength(0);
    });

    test('should return errors for invalid Organization attributes', () => {
        const invalidAttributes = { ...validAttributes, name: 123 };
        const errors = Organization.validateParams(invalidAttributes);
        expect(errors).toHaveLength(1);
    });

    test('should validate an Organization instance', () => {
        const organization = new Organization(validAttributes, registry);
        expect(organization.validate()).toBe(true);
        expect(organization.isValid()).toBe(true);
    });

    test('should create an Organization instance with custom attributes', () => {
        const customAttributes = {
            customAttribute1: 'value1',
            customAttribute2: 'value2',
        };
        const organizationAttributes = {
            ...validAttributes,
            ...customAttributes,
        };
        const organization = new Organization(organizationAttributes, registry);
        expect(organization).toBeInstanceOf(Organization);
        expect(organization.attributes).toEqual(validAttributes);
        expect(organization.customAttributes).toEqual(customAttributes);
    });

    describe('validateParams', () => {
        test.each([
            ['name', 123],
            ['shortname', 123],
            ['numberOfEmployees', 'invalid'],
            ['category', 123],
            ['contactFirstName', 123],
            ['contactLastName', 123],
            ['contactPhoneNumber', 123],
            ['contactEmail', 123],
            ['revenueLevel', 123],
            ['preData', 'invalid'],
            ['preData', []],
            ['preData', new Date() as any],
            ['preData', true as any]
        ])('should return an error for invalid %s', (param, value) => {
            const invalidAttributes = { ...validAttributes, [param]: value };
            const errors = Organization.validateParams(invalidAttributes);
            expect(errors[0].toString()).toContain(param);
            expect(errors).toHaveLength(1);
        });

        test('should return no errors for valid attributes', () => {
            const errors = Organization.validateParams(validAttributes);
            expect(errors).toHaveLength(0);
        });
    });

    describe('Getters and Setters', () => {
        test.each([
            ['name', 'Updated Organization'],
            ['shortname', 'UO'],
            ['numberOfEmployees', 200],
            ['category', 'Finance'],
            ['contactFirstName', 'Jane'],
            ['contactLastName', 'Smith'],
            ['contactPhoneNumber', '9876543210'],
            ['contactEmail', 'jane.smith@example.com'],
            ['revenueLevel', 'Medium'],
            ['preData', { importedOrgData: 'value', industry: 'tech' }],
        ])('should set and get %s', (attribute, value) => {
            const organization = new Organization(validAttributes, registry);
            organization[attribute] = value;
            expect(organization[attribute]).toEqual(value);
        });

        describe('Getters for attributes with no setters', () => {
            test.each([
                ['_uuid', extendedAttributes._uuid],
                ['customAttributes', { customAttribute: extendedAttributes.customAttribute }],
                ['attributes', validAttributes],
            ])('should set and get %s', (attribute, value) => {
                const organization = new Organization(extendedAttributes, registry);
                expect(organization[attribute]).toEqual(value);
            });
        });

        test.each([
            ['_isValid', false],
            ['_weights', [{ weight: 2.0, method: new WeightMethod(weightMethodAttributes) }]],
            ['_vehicles', extendedAttributes.vehicles],
            ['_places', extendedAttributes.places],
        ])('should set and get %s', (attribute, value) => {
            const organization = new Organization(validAttributes, registry);
            organization[attribute] = value;
            expect(organization[attribute]).toEqual(value);
        });
    });

    describe('preData serialization', () => {
        test('should preserve preData through (un)serialize', () => {
            const attrs = { ...validAttributes, preData: { importedOrgData: 'value', industry: 'tech' } };
            const o1 = new Organization(attrs, registry);
            const o2 = Organization.unserialize(attrs, registry);
            expect(o1.preData).toEqual({ importedOrgData: 'value', industry: 'tech' });
            expect(o2.preData).toEqual({ importedOrgData: 'value', industry: 'tech' });
        });
    });

    describe('Composed Attributes', () => {
        test('should create Vehicle instances for vehicles when creating an Organization instance', () => {
            const vehicleAttributes: VehicleAttributes[] = [
                {
                    _uuid: uuidV4(),
                    make: 'Honda',
                    model: 'Accord',
                    _isValid: true,
                },
            ];

            const organizationAttributes: ExtendedOrganizationAttributes = {
                ...validAttributes,
                _vehicles: vehicleAttributes,
            };

            const result = Organization.create(organizationAttributes, registry);
            expect(isOk(result)).toBe(true);
            const organization = unwrap(result) as Organization;
            expect(organization.vehicles).toBeDefined();
            expect(organization.vehicles?.length).toBe(1);
            expect(organization.vehicles?.[0].attributes).toEqual(vehicleAttributes[0]);
        });

        test('should create Place instances for places when creating an Organization instance', () => {
            const placeAttributes: PlaceAttributes[] = [
                {
                    _uuid: uuidV4(),
                    name: 'Branch Office',
                    geography: {
                        type: 'Feature',
                        geometry: {
                            type: 'Point',
                            coordinates: [1, 1],
                        },
                        properties: {},
                    },
                    _isValid: true,
                },
            ];

            const organizationAttributes: ExtendedOrganizationAttributes = {
                ...validAttributes,
                _places: placeAttributes,
            };

            const result = Organization.create(organizationAttributes, registry);
            expect(isOk(result)).toBe(true);
            const organization = unwrap(result) as Organization;
            expect(organization.places).toBeDefined();
            expect(organization.places?.length).toBe(1);
            expect(organization.places?.[0].attributes).toEqual(placeAttributes[0]);
        });
    });
});
