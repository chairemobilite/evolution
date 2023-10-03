/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { BaseHousehold, BaseHouseholdAttributes, ExtendedHouseholdAttributes } from '../BaseHousehold';
import { BasePerson } from '../BasePerson';
import { BasePlace } from '../BasePlace';
import * as HAttr from '../attributeTypes/HouseholdAttributes';
import { Weight } from '../Weight';
import { WeightMethod } from '../WeightMethod';
import { BaseVehicle } from '../BaseVehicle';

const members = [new BasePerson({}), new BasePerson({})];
const homeGeography = {
    type: 'Feature' as const,
    geometry: {
        type: 'Point' as const,
        coordinates: [45.5, -75.5],
    },
    properties: {}
};
const home = new BasePlace(homeGeography);

const weightMethodAttributes = {
    _uuid: uuidV4(),
    shortname: 'sample-shortname',
    name: 'Sample Weight Method',
    description: 'Sample weight method description',
};

const baseHouseholdAttributes: BaseHouseholdAttributes = {
    _uuid: uuidV4(),
    members: [new BasePerson({ _uuid: uuidV4() })],
    home: new BasePlace(undefined, { _uuid: uuidV4() }),
    size: 3,
    carNumber: 2,
    category: 'bar' as HAttr.HouseholdCategory,
    contactPhoneNumber: '123-456-7890',
    contactEmail: 'test@example.com',
    _weight: { weight: 5.5, method: new WeightMethod(weightMethodAttributes) },
    vehicles: [new BaseVehicle({ _uuid: uuidV4() })],
};

const extendedHouseholdAttributes: ExtendedHouseholdAttributes = {
    ...baseHouseholdAttributes,
    additionalAttribute: 'additionalValue',
};

const baseHouseholdAttributes2: BaseHouseholdAttributes = {
    _uuid: uuidV4(),
    size: 2,
    carNumber: 1,
    twoWheelNumber: 1,
    members: members,
    home: home,
    category: 'foo' as HAttr.HouseholdCategory,
    wouldLikeToParticipateToOtherSurveys: true,
    homeCarParkings: ['bar', 'foo'] as HAttr.HomePrivateCarParkingType[],
    contactPhoneNumber: '123-456-7890',
    contactEmail: 'sample@example.com',
    pluginHybridCarNumber: 1,
    electricCarNumber: 0
};

describe('BaseHousehold Class Tests', () => {

    it('should create a BaseHousehold instance', () => {
        const household = new BaseHousehold(baseHouseholdAttributes);
        expect(household).toBeInstanceOf(BaseHousehold);
    });

    it('should create a BaseHousehold instance with extended attributes', () => {
        const household = new BaseHousehold(extendedHouseholdAttributes);
        expect(household).toBeInstanceOf(BaseHousehold);
    });

    it('should implement the Validatable interface', () => {
        const household = new BaseHousehold(baseHouseholdAttributes);
        expect(household.validate).toBeInstanceOf(Function);
        expect(household.isValid).toBeInstanceOf(Function);
    });

    it('should validate a valid household', () => {
        const household = new BaseHousehold(baseHouseholdAttributes);
        expect(household.validate()).toBe(true);
        expect(household.isValid()).toBeTruthy();
    });

    it('should return undefined validity for an unvalidated household', () => {
        const household = new BaseHousehold(baseHouseholdAttributes);
        expect(household.isValid()).toBeUndefined();
    });

    it('should implement the Weightable interface', () => {
        const household = new BaseHousehold(baseHouseholdAttributes);
        expect(household._weight).toBeDefined();
    });

    it('should set weight and method correctly', () => {
        const household = new BaseHousehold(baseHouseholdAttributes);
        const weight: Weight = household._weight as Weight;
        expect(weight.weight).toBe(5.5);
        expect(weight.method).toBeInstanceOf(WeightMethod);
        expect(weight.method.shortname).toEqual('sample-shortname');
        expect(weight.method.name).toEqual('Sample Weight Method');
        expect(weight.method.description).toEqual('Sample weight method description');
    });
});

describe('BaseHousehold Class Additional Tests', () => {

    it('should allow increasing the number of members after declaring the initial size', () => {
        const householdInstance = new BaseHousehold(baseHouseholdAttributes2);
        const newMember = new BasePerson({});
        householdInstance.members?.push(newMember);
        expect(householdInstance.members?.length).toBeGreaterThan(baseHouseholdAttributes2.size as number);
    });

    it('should correctly set home property if provided', () => {
        const householdInstance = new BaseHousehold(baseHouseholdAttributes2);
        expect(householdInstance.home).toEqual(baseHouseholdAttributes2.home);
    });

    it('should correctly set category property if provided', () => {
        const householdInstance = new BaseHousehold(baseHouseholdAttributes2);
        expect(householdInstance.category).toEqual(baseHouseholdAttributes2.category);
    });

    it('should correctly set car and vehicle related properties if provided', () => {
        const householdInstance = new BaseHousehold(baseHouseholdAttributes2);
        expect(householdInstance.carNumber).toEqual(baseHouseholdAttributes2.carNumber);
        expect(householdInstance.twoWheelNumber).toEqual(baseHouseholdAttributes2.twoWheelNumber);
        expect(householdInstance.pluginHybridCarNumber).toEqual(baseHouseholdAttributes2.pluginHybridCarNumber);
        expect(householdInstance.electricCarNumber).toEqual(baseHouseholdAttributes2.electricCarNumber);
    });

    it('should correctly set contact details if provided', () => {
        const householdInstance = new BaseHousehold(baseHouseholdAttributes2);
        expect(householdInstance.contactPhoneNumber).toEqual(baseHouseholdAttributes2.contactPhoneNumber);
        expect(householdInstance.contactEmail).toEqual(baseHouseholdAttributes2.contactEmail);
    });

    it('should allow participation to other surveys if indicated', () => {
        const householdInstance = new BaseHousehold(baseHouseholdAttributes2);
        expect(householdInstance.wouldLikeToParticipateToOtherSurveys).toBe(true);
    });

    it('should correctly set home car parkings property if provided', () => {
        const householdInstance = new BaseHousehold(baseHouseholdAttributes2);
        expect(householdInstance.homeCarParkings).toEqual(baseHouseholdAttributes2.homeCarParkings);
    });

});

