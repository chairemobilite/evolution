/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { SurveyObjectsRegistry } from '../SurveyObjectsRegistry';
import { TripChain } from '../TripChain';
import { Journey } from '../Journey';
import { Person } from '../Person';
import { Household } from '../Household';
import { v4 as uuidV4 } from 'uuid';

const validUuid = uuidV4();
const validUuid2 = uuidV4();
const validUuid3 = uuidV4();
const validUuid4 = uuidV4();
const validUuid5 = uuidV4();
const validUuid6 = uuidV4();
const validUuid7 = uuidV4();
const validUuid8 = uuidV4();

describe('TripChain Registry Functionality', () => {
    let registry: SurveyObjectsRegistry;

    beforeEach(() => {
        registry = SurveyObjectsRegistry.getInstance();
        registry.clear();
    });

    afterEach(() => {
        registry.clear();
    });

    describe('Parent Access', () => {
        it('should access journey through registry', () => {
            const mockJourney = new Journey({
                _uuid: validUuid,
                name: 'Daily Journey'
            });

            const tripChain = new TripChain({
                _uuid: validUuid2,
                category: 'work',
                _journeyUuid: validUuid
            });

            registry.registerJourney(mockJourney);
            registry.registerTripChain(tripChain);

            expect(tripChain.journey).toBe(mockJourney);
        });

        it('should access person through journey', () => {
            const mockPerson = new Person({
                _uuid: validUuid3,
                age: 30
            });

            const mockJourney = new Journey({
                _uuid: validUuid,
                name: 'Daily Journey',
                _personUuid: validUuid3
            });

            const tripChain = new TripChain({
                _uuid: validUuid2,
                category: 'work',
                _journeyUuid: validUuid
            });

            registry.registerPerson(mockPerson);
            registry.registerJourney(mockJourney);
            registry.registerTripChain(tripChain);

            expect(tripChain.person).toBe(mockPerson);
        });

        it('should access household through person', () => {
            const mockHousehold = new Household({
                _uuid: validUuid4,
                size: 2
            });

            const mockPerson = new Person({
                _uuid: validUuid3,
                age: 30,
                _householdUuid: validUuid4
            });

            const mockJourney = new Journey({
                _uuid: validUuid,
                name: 'Daily Journey',
                _personUuid: validUuid3
            });

            const tripChain = new TripChain({
                _uuid: validUuid2,
                category: 'work',
                _journeyUuid: validUuid
            });

            registry.registerHousehold(mockHousehold);
            registry.registerPerson(mockPerson);
            registry.registerJourney(mockJourney);
            registry.registerTripChain(tripChain);

            expect(tripChain.household).toBe(mockHousehold);
        });

        it('should return undefined for missing journey', () => {
            const tripChain = new TripChain({
                _uuid: validUuid2,
                category: 'work',
                _journeyUuid: validUuid5
            });

            registry.registerTripChain(tripChain);

            expect(tripChain.journey).toBeUndefined();
            expect(tripChain.person).toBeUndefined();
            expect(tripChain.household).toBeUndefined();
        });

        it('should return undefined when no journey UUID is set', () => {
            const tripChain = new TripChain({
                _uuid: validUuid2,
                category: 'work'
            });

            registry.registerTripChain(tripChain);

            expect(tripChain.journey).toBeUndefined();
            expect(tripChain.person).toBeUndefined();
            expect(tripChain.household).toBeUndefined();
        });
    });

    describe('Partial Hierarchy', () => {
        it('should handle missing person in journey chain', () => {
            const mockJourney = new Journey({
                _uuid: validUuid,
                name: 'Daily Journey',
                _personUuid: validUuid6
            });

            const tripChain = new TripChain({
                _uuid: validUuid2,
                category: 'work',
                _journeyUuid: validUuid
            });

            registry.registerJourney(mockJourney);
            registry.registerTripChain(tripChain);

            expect(tripChain.journey).toBe(mockJourney);
            expect(tripChain.person).toBeUndefined();
            expect(tripChain.household).toBeUndefined();
        });

        it('should handle missing household in person chain', () => {
            const mockPerson = new Person({
                _uuid: validUuid3,
                age: 30,
                _householdUuid: validUuid8
            });

            const mockJourney = new Journey({
                _uuid: validUuid,
                name: 'Daily Journey',
                _personUuid: validUuid3
            });

            const tripChain = new TripChain({
                _uuid: validUuid2,
                category: 'work',
                _journeyUuid: validUuid
            });

            registry.registerPerson(mockPerson);
            registry.registerJourney(mockJourney);
            registry.registerTripChain(tripChain);

            expect(tripChain.journey).toBe(mockJourney);
            expect(tripChain.person).toBe(mockPerson);
            expect(tripChain.household).toBeUndefined();
        });
    });

    describe('Registry State Changes', () => {
        it('should reflect changes when journey is updated in registry', () => {
            const journey1 = new Journey({
                _uuid: validUuid,
                name: 'Morning Journey'
            });

            const journey2 = new Journey({
                _uuid: validUuid,
                name: 'Evening Journey'
            });

            const tripChain = new TripChain({
                _uuid: validUuid2,
                category: 'work',
                _journeyUuid: validUuid
            });

            registry.registerJourney(journey1);
            registry.registerTripChain(tripChain);

            expect(tripChain.journey).toBe(journey1);

            // Update journey in registry
            registry.registerJourney(journey2);

            expect(tripChain.journey).toBe(journey2);
        });

        it('should return undefined when journey is removed from registry', () => {
            const mockJourney = new Journey({
                _uuid: validUuid,
                name: 'Daily Journey'
            });

            const tripChain = new TripChain({
                _uuid: validUuid2,
                category: 'work',
                _journeyUuid: validUuid
            });

            registry.registerJourney(mockJourney);
            registry.registerTripChain(tripChain);

            expect(tripChain.journey).toBe(mockJourney);

            // Remove journey from registry
            registry.unregisterJourney(validUuid);

            expect(tripChain.journey).toBeUndefined();
        });
    });

    describe('UUID Management', () => {
        it('should handle journeyUuid setter', () => {
            const mockJourney = new Journey({
                _uuid: validUuid7,
                name: 'New Journey'
            });

            const tripChain = new TripChain({
                _uuid: validUuid2,
                category: 'work'
            });

            registry.registerJourney(mockJourney);
            registry.registerTripChain(tripChain);

            // Initially no journey
            expect(tripChain.journey).toBeUndefined();

            // Set journey UUID
            tripChain.journeyUuid = validUuid7;

            expect(tripChain.journey).toBe(mockJourney);
        });

        it('should handle null/undefined journey UUID', () => {
            const tripChain = new TripChain({
                _uuid: validUuid2,
                category: 'work'
            });

            registry.registerTripChain(tripChain);

            tripChain.journeyUuid = undefined;
            expect(tripChain.journey).toBeUndefined();

            tripChain.journeyUuid = null as any;
            expect(tripChain.journey).toBeUndefined();
        });
    });
});
