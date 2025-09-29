/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { SurveyObjectsRegistry } from '../SurveyObjectsRegistry';
import { Person } from '../Person';
import { Household } from '../Household';
import { v4 as uuidV4 } from 'uuid';

const validUuid = uuidV4();
const validUuid2 = uuidV4();
const validUuid3 = uuidV4();
const validUuid4 = uuidV4();

describe('Person Registry Functionality', () => {
    let registry: SurveyObjectsRegistry;

    beforeEach(() => {
        registry = SurveyObjectsRegistry.getInstance();
        registry.clear();
    });

    afterEach(() => {
        registry.clear();
    });

    describe('Parent Access', () => {
        it('should access household through registry', () => {
            const mockHousehold = new Household({
                _uuid: validUuid,
                size: 2
            });

            const person = new Person({
                _uuid: validUuid2,
                age: 30,
                _householdUuid: validUuid
            });

            registry.registerHousehold(mockHousehold);
            registry.registerPerson(person);

            expect(person.household).toBe(mockHousehold);
        });

        it('should return undefined for missing household', () => {
            const person = new Person({
                _uuid: validUuid2,
                age: 30,
                _householdUuid: validUuid4
            });

            registry.registerPerson(person);

            expect(person.household).toBeUndefined();
        });

        it('should return undefined when no household UUID is set', () => {
            const person = new Person({
                _uuid: validUuid2,
                age: 30
            });

            registry.registerPerson(person);

            expect(person.household).toBeUndefined();
        });
    });

    describe('Registry State Changes', () => {
        it('should reflect changes when household is updated in registry', () => {
            const household1 = new Household({
                _uuid: validUuid,
                size: 2
            });

            const household2 = new Household({
                _uuid: validUuid,
                size: 4
            });

            const person = new Person({
                _uuid: validUuid2,
                age: 30,
                _householdUuid: validUuid
            });

            registry.registerHousehold(household1);
            registry.registerPerson(person);

            expect(person.household).toBe(household1);

            // Update household in registry
            registry.registerHousehold(household2);

            expect(person.household).toBe(household2);
        });

        it('should return undefined when household is removed from registry', () => {
            const mockHousehold = new Household({
                _uuid: validUuid,
                size: 2
            });

            const person = new Person({
                _uuid: validUuid2,
                age: 30,
                _householdUuid: validUuid
            });

            registry.registerHousehold(mockHousehold);
            registry.registerPerson(person);

            expect(person.household).toBe(mockHousehold);

            // Remove household from registry
            registry.unregisterHousehold(validUuid);

            expect(person.household).toBeUndefined();
        });
    });

    describe('UUID Management', () => {
        it('should handle householdUuid setter', () => {
            const mockHousehold = new Household({
                _uuid: validUuid3,
                size: 3
            });

            const person = new Person({
                _uuid: validUuid2,
                age: 30
            });

            registry.registerHousehold(mockHousehold);
            registry.registerPerson(person);

            // Initially no household
            expect(person.household).toBeUndefined();

            // Set household UUID
            person.householdUuid = validUuid3;

            expect(person.household).toBe(mockHousehold);
        });

        it('should handle null/undefined household UUID', () => {
            const person = new Person({
                _uuid: validUuid2,
                age: 30
            });

            registry.registerPerson(person);

            person.householdUuid = undefined;
            expect(person.household).toBeUndefined();

            person.householdUuid = null as any;
            expect(person.household).toBeUndefined();
        });
    });
});
