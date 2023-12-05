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

const baseMembers = [new BasePerson({}), new BasePerson({})];
const homeGeography = {
    type: 'Feature' as const,
    geometry: {
        type: 'Point' as const,
        coordinates: [45.5, -75.5],
    },
    properties: {}
};
const baseHome = new BasePlace({ geography: homeGeography });

const weightMethodAttributes = {
    _uuid: uuidV4(),
    shortname: 'sample-shortname',
    name: 'Sample Weight Method',
    description: 'Sample weight method description',
};

const baseHouseholdAttributes: BaseHouseholdAttributes = {
    _uuid: uuidV4(),
    baseMembers: [new BasePerson({ _uuid: uuidV4() })],
    baseHome: new BasePlace({ _uuid: uuidV4() }),
    size: 3,
    carNumber: 2,
    category: 'bar' as HAttr.HouseholdCategory,
    contactPhoneNumber: '123-456-7890',
    contactEmail: 'test@example.com',
    _weights: [{ weight: 5.5, method: new WeightMethod(weightMethodAttributes) }, { weight: 6.3, method: new WeightMethod(weightMethodAttributes) }],
    baseVehicles: [new BaseVehicle({ _uuid: uuidV4() })],
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
    baseMembers: baseMembers,
    baseHome: baseHome,
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
        expect(household._weights).toBeDefined();
    });

    it('should set weight and method correctly', () => {
        const household = new BaseHousehold(baseHouseholdAttributes);
        const weight: Weight = household._weights?.[0] as Weight;
        expect(weight.weight).toBe(5.5);
        expect(weight.method).toBeInstanceOf(WeightMethod);
        expect(weight.method.shortname).toEqual('sample-shortname');
        expect(weight.method.name).toEqual('Sample Weight Method');
        expect(weight.method.description).toEqual('Sample weight method description');
    });
});

describe('BaseHousehold Class Additional Tests', () => {

    it('should allow increasing the number of baseMembers after declaring the initial size', () => {
        const householdInstance = new BaseHousehold(baseHouseholdAttributes2);
        const newMember = new BasePerson({});
        householdInstance.baseMembers?.push(newMember);
        expect(householdInstance.baseMembers?.length).toBeGreaterThan(baseHouseholdAttributes2.size as number);
    });

    it('should correctly set baseHome property if provided', () => {
        const householdInstance = new BaseHousehold(baseHouseholdAttributes2);
        expect(householdInstance.baseHome).toEqual(baseHouseholdAttributes2.baseHome);
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

    it('should return an empty array for valid params', () => {
        const validParams = {
            _uuid: uuidV4(),
            baseMembers: [new BasePerson({}), new BasePerson({})],
            baseHome: new BasePlace({}),
            size: 2,
            carNumber: 1,
            twoWheelNumber: 0,
            pluginHybridCarNumber: 0,
            electricCarNumber: 0,
            category: 'single-family',
            wouldLikeToParticipateToOtherSurveys: true,
            homeCarParkings: ['private-garage'],
            contactPhoneNumber: '1234567890',
            contactEmail: 'valid@example.com',
        };

        const errors = BaseHousehold.validateParams(validParams);

        expect(errors).toEqual([]);
    });

    it('should return an array of errors for invalid params', () => {
        const invalidParams = {
            _uuid: 12345, // Invalid UUID
            baseMembers: 'not-an-array', // Should be an array of BasePerson objects
            baseHome: 'not-a-BasePlace', // Should be a BasePlace object
            size: -1, // Should be a non-negative integer
            carNumber: 'invalid', // Should be a non-negative integer
            twoWheelNumber: 2.5, // Should be a non-negative integer
            pluginHybridCarNumber: -3, // Should be a non-negative integer
            electricCarNumber: 0.5, // Should be a non-negative integer
            category: 123, // Should be a string
            wouldLikeToParticipateToOtherSurveys: 'true', // Should be a boolean
            homeCarParkings: [123], // Should contain valid strings
            contactPhoneNumber: 9876543210, // Should be a string
            contactEmail: new Date(), // Should be a valid email address
            _weights: [
                { weight: 5.5, method: 'foo' },
                { weight: -3.2, method: new WeightMethod(weightMethodAttributes) },
                { weight: 'bar', method: new WeightMethod(weightMethodAttributes) }]
        };

        const errors = BaseHousehold.validateParams(invalidParams);

        expect(errors).toEqual([
            new Error('Uuidable validateParams: invalid uuid'),
            new Error('Weightable validateWeights: method at index 0 must be an instance of WeightMethod'),
            new Error('Weightable validateWeights: weight at index 1 must be a positive number'),
            new Error('Weightable validateWeights: weight at index 2 must be a positive number'),
            new Error('BaseHousehold validateParams: baseMembers should be an array'),
            new Error('BaseHousehold validateParams: baseHome is not an instance of BasePlace'),
            new Error('BaseHousehold validateParams: size should be a positive integer'),
            new Error('BaseHousehold validateParams: carNumber should be a positive integer'),
            new Error('BaseHousehold validateParams: twoWheelNumber should be a positive integer'),
            new Error('BaseHousehold validateParams: pluginHybridCarNumber should be a positive integer'),
            new Error('BaseHousehold validateParams: electricCarNumber should be a positive integer'),
            new Error('BaseHousehold validateParams: category should be a string'),
            new Error('BaseHousehold validateParams: wouldLikeToParticipateToOtherSurveys should be a boolean'),
            new Error('BaseHousehold validateParams: homeCarParkings index 0 should be a string'),
            new Error('BaseHousehold validateParams: contactPhoneNumber should be a string'),
            new Error('BaseHousehold validateParams: contactEmail should be a string'),
        ]);
    });

    it('should return an empty array of errors for empty params', () => {
        const emptyParams = {}; //Accept empty params
        const errors = BaseHousehold.validateParams(emptyParams);
        expect(errors).toEqual([]);
    });

    it('should return an array of errors for missing required params', () => {
        const invalidMembersVehiclesAndHomeParams = {
            baseMembers: [123,'aa'],
            baseVehicles: ['foo','bar'],
            baseHome: new Date('2000-01-01'),
        };
        const errors = BaseHousehold.validateParams(invalidMembersVehiclesAndHomeParams);
        expect(errors).toEqual([
            new Error('BaseHousehold validateParams: baseMembers index 0 is not an instance of BasePerson'),
            new Error('BaseHousehold validateParams: baseMembers index 1 is not an instance of BasePerson'),
            new Error('BaseHousehold validateParams: baseVehicles index 0 is not an instance of BaseVehicle'),
            new Error('BaseHousehold validateParams: baseVehicles index 1 is not an instance of BaseVehicle'),
            new Error('BaseHousehold validateParams: baseHome is not an instance of BasePlace'),
        ]);
    });

});

