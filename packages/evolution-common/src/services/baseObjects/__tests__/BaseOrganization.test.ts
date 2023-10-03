/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { BaseOrganization, BaseOrganizationAttributes, ExtendedOrganizationAttributes } from '../BaseOrganization';
import * as OAttr from '../attributeTypes/OrganizationAttributes';
import { BaseVehicle } from '../BaseVehicle';
import { BasePerson } from '../BasePerson';
import { BasePlace } from '../BasePlace';
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
        vehicles: [new BaseVehicle({ _uuid: uuidV4() }), new BaseVehicle({ _uuid: uuidV4() })],
        contactEmail: 'test@test.test',
        contactPerson: new BasePerson({ _uuid: uuidV4() }),
        contactPhoneNumber: '123-456-7890',
        persons: [new BasePerson({ _uuid: uuidV4() }), new BasePerson({ _uuid: uuidV4() }), new BasePerson({ _uuid: uuidV4() })],
        vehicleNumber: 23,
        pluginHybridVehicleNumber: 12,
        electricVehicleNumber: 0,
        locations: [new BasePlace(undefined, { _uuid: uuidV4() }), new BasePlace(undefined, { _uuid: uuidV4() })],
        headquarter: new BasePlace(undefined, { _uuid: uuidV4() }),
        _weight: { weight: 0.1, method: new WeightMethod(weightMethodAttributes) },
    };


    it('should create a new BaseOrganization instance', () => {
        const organization = new BaseOrganization(baseOrganizationAttributes);
        expect(organization).toBeInstanceOf(BaseOrganization);
        expect(organization._uuid).toEqual(validUUID);
        expect(organization.name).toEqual('XYZ Corp');
        expect(organization.shortname).toEqual('xyz_corp');
        expect(organization.category).toEqual('company');
        expect(organization.size).toEqual(500);
        expect(organization.vehicles).toHaveLength(2);
        expect(organization.vehicles?.[0]).toBeInstanceOf(BaseVehicle);
        expect(organization.vehicles?.[1]).toBeInstanceOf(BaseVehicle);
        expect(organization.contactEmail).toEqual('test@test.test');
        expect(organization.contactPerson).toBeInstanceOf(BasePerson);
        expect(organization.contactPhoneNumber).toEqual('123-456-7890');
        expect(organization.persons).toHaveLength(3);
        expect(organization.persons?.[0]).toBeInstanceOf(BasePerson);
        expect(organization.persons?.[1]).toBeInstanceOf(BasePerson);
        expect(organization.persons?.[2]).toBeInstanceOf(BasePerson);
        expect(organization.vehicleNumber).toEqual(23);
        expect(organization.pluginHybridVehicleNumber).toEqual(12);
        expect(organization.electricVehicleNumber).toEqual(0);
        expect(organization.locations).toHaveLength(2);
        expect(organization.locations?.[0]).toBeInstanceOf(BasePlace);
        expect(organization.locations?.[1]).toBeInstanceOf(BasePlace);
        expect(organization.headquarter).toBeInstanceOf(BasePlace);
        expect(organization._weight).toBeDefined();
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
        const weight: Weight = organization._weight as Weight;
        expect(weight.weight).toBe(0.1);
        expect(weight.method).toBeInstanceOf(WeightMethod);
        expect(weight.method.shortname).toEqual('sample-shortname');
        expect(weight.method.name).toEqual('Sample Weight Method');
        expect(weight.method.description).toEqual('Sample weight method description');
    });
});
