/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { SurveyObjectsRegistry } from '../SurveyObjectsRegistry';
import { Journey } from '../Journey';
import { Person } from '../Person';
import { v4 as uuidV4 } from 'uuid';

const validUuid = uuidV4();
const validUuid2 = uuidV4();
const validUuid3 = uuidV4();
const validUuid4 = uuidV4();

describe('Journey Registry Functionality', () => {
    let registry: SurveyObjectsRegistry;

    beforeEach(() => {
        registry = SurveyObjectsRegistry.getInstance();
        registry.clear();
    });

    afterEach(() => {
        registry.clear();
    });

    describe('Parent Access', () => {
        it('should access person through registry', () => {
            const mockPerson = new Person({
                _uuid: validUuid,
                age: 30
            });

            const journey = new Journey({
                _uuid: validUuid2,
                name: 'Daily Journey',
                _personUuid: validUuid
            });

            registry.registerPerson(mockPerson);
            registry.registerJourney(journey);

            expect(journey.person).toBe(mockPerson);
        });

        it('should return undefined for missing person', () => {
            const journey = new Journey({
                _uuid: validUuid2,
                name: 'Daily Journey',
                _personUuid: validUuid4
            });

            registry.registerJourney(journey);

            expect(journey.person).toBeUndefined();
        });

        it('should return undefined when no person UUID is set', () => {
            const journey = new Journey({
                _uuid: validUuid2,
                name: 'Daily Journey'
            });

            registry.registerJourney(journey);

            expect(journey.person).toBeUndefined();
        });
    });

    describe('Registry State Changes', () => {
        it('should reflect changes when person is updated in registry', () => {
            const person1 = new Person({
                _uuid: validUuid,
                age: 30,
                gender: 'male'
            });

            const person2 = new Person({
                _uuid: validUuid,
                age: 35,
                gender: 'male'
            });

            const journey = new Journey({
                _uuid: validUuid2,
                name: 'Daily Journey',
                _personUuid: validUuid
            });

            registry.registerPerson(person1);
            registry.registerJourney(journey);

            expect(journey.person).toBe(person1);

            // Update person in registry
            registry.registerPerson(person2);

            expect(journey.person).toBe(person2);
        });

        it('should return undefined when person is removed from registry', () => {
            const mockPerson = new Person({
                _uuid: validUuid,
                age: 30
            });

            const journey = new Journey({
                _uuid: validUuid2,
                name: 'Daily Journey',
                _personUuid: validUuid
            });

            registry.registerPerson(mockPerson);
            registry.registerJourney(journey);

            expect(journey.person).toBe(mockPerson);

            // Remove person from registry
            registry.unregisterPerson(validUuid);

            expect(journey.person).toBeUndefined();
        });
    });

    describe('UUID Management', () => {
        it('should handle personUuid setter', () => {
            const mockPerson = new Person({
                _uuid: validUuid3,
                age: 25
            });

            const journey = new Journey({
                _uuid: validUuid2,
                name: 'Daily Journey'
            });

            registry.registerPerson(mockPerson);
            registry.registerJourney(journey);

            // Initially no person
            expect(journey.person).toBeUndefined();

            // Set person UUID
            journey.personUuid = validUuid3;

            expect(journey.person).toBe(mockPerson);
        });

        it('should handle null/undefined person UUID', () => {
            const journey = new Journey({
                _uuid: validUuid2,
                name: 'Daily Journey'
            });

            registry.registerJourney(journey);

            journey.personUuid = undefined;
            expect(journey.person).toBeUndefined();

            journey.personUuid = null as any;
            expect(journey.person).toBeUndefined();
        });
    });
});
