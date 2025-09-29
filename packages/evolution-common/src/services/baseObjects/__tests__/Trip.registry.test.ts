/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { SurveyObjectsRegistry } from '../SurveyObjectsRegistry';
import { Trip } from '../Trip';
import { Journey } from '../Journey';
import { Person } from '../Person';
import { Household } from '../Household';
import { TripChain } from '../TripChain';
import { v4 as uuidV4 } from 'uuid';

const validUuid = uuidV4();
const validUuid2 = uuidV4();
const validUuid3 = uuidV4();
const validUuid4 = uuidV4();
const validUuid5 = uuidV4();
const validUuid6 = uuidV4();
const validUuid7 = uuidV4();
const validUuid8 = uuidV4();
const validUuid9 = uuidV4();
const validUuid10 = uuidV4();

describe('Trip Registry Functionality', () => {
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

            const trip = new Trip({
                _uuid: validUuid2,
                _journeyUuid: validUuid
            });

            registry.registerJourney(mockJourney);
            registry.registerTrip(trip);

            expect(trip.journey).toBe(mockJourney);
        });

        it('should access person through journey', () => {
            const mockPerson = new Person({
                _uuid: validUuid4,
                age: 30
            });

            const mockJourney = new Journey({
                _uuid: validUuid,
                name: 'Daily Journey',
                _personUuid: validUuid4
            });

            const trip = new Trip({
                _uuid: validUuid2,
                _journeyUuid: validUuid
            });

            registry.registerPerson(mockPerson);
            registry.registerJourney(mockJourney);
            registry.registerTrip(trip);

            expect(trip.person).toBe(mockPerson);
        });

        it('should access household through person', () => {
            const mockHousehold = new Household({
                _uuid: validUuid3,
                size: 2
            });

            const mockPerson = new Person({
                _uuid: validUuid4,
                age: 30,
                _householdUuid: validUuid3
            });

            const mockJourney = new Journey({
                _uuid: validUuid,
                name: 'Daily Journey',
                _personUuid: validUuid4
            });

            const trip = new Trip({
                _uuid: validUuid2,
                _journeyUuid: validUuid
            });

            registry.registerHousehold(mockHousehold);
            registry.registerPerson(mockPerson);
            registry.registerJourney(mockJourney);
            registry.registerTrip(trip);

            expect(trip.household).toBe(mockHousehold);
        });

        it('should access trip chain through registry', () => {
            const mockTripChain = new TripChain({
                _uuid: validUuid5,
                category: 'work'
            });

            const trip = new Trip({
                _uuid: validUuid2,
                _tripChainUuid: validUuid5
            });

            registry.registerTripChain(mockTripChain);
            registry.registerTrip(trip);

            expect(trip.tripChain).toBe(mockTripChain);
        });

        it('should return undefined for missing journey', () => {
            const trip = new Trip({
                _uuid: validUuid2,
                journeyUuid: validUuid9
            });

            registry.registerTrip(trip);

            expect(trip.journey).toBeUndefined();
            expect(trip.person).toBeUndefined();
            expect(trip.household).toBeUndefined();
        });

        it('should return undefined when no parent UUIDs are set', () => {
            const trip = new Trip({
                _uuid: validUuid2
            });

            registry.registerTrip(trip);

            expect(trip.journey).toBeUndefined();
            expect(trip.person).toBeUndefined();
            expect(trip.household).toBeUndefined();
            expect(trip.tripChain).toBeUndefined();
        });
    });

    describe('Partial Hierarchy', () => {
        it('should handle missing person in journey chain', () => {
            const mockJourney = new Journey({
                _uuid: validUuid,
                name: 'Daily Journey',
                _personUuid: validUuid6
            });

            const trip = new Trip({
                _uuid: validUuid2,
                _journeyUuid: validUuid
            });

            registry.registerJourney(mockJourney);
            registry.registerTrip(trip);

            expect(trip.journey).toBe(mockJourney);
            expect(trip.person).toBeUndefined();
            expect(trip.household).toBeUndefined();
        });

        it('should handle missing household in person chain', () => {
            const mockPerson = new Person({
                _uuid: validUuid4,
                age: 30,
                _householdUuid: validUuid10
            });

            const mockJourney = new Journey({
                _uuid: validUuid,
                name: 'Daily Journey',
                _personUuid: validUuid4
            });

            const trip = new Trip({
                _uuid: validUuid2,
                _journeyUuid: validUuid
            });

            registry.registerPerson(mockPerson);
            registry.registerJourney(mockJourney);
            registry.registerTrip(trip);

            expect(trip.journey).toBe(mockJourney);
            expect(trip.person).toBe(mockPerson);
            expect(trip.household).toBeUndefined();
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

            const trip = new Trip({
                _uuid: validUuid2,
                _journeyUuid: validUuid
            });

            registry.registerJourney(journey1);
            registry.registerTrip(trip);

            expect(trip.journey).toBe(journey1);

            // Update journey in registry
            registry.registerJourney(journey2);

            expect(trip.journey).toBe(journey2);
        });

        it('should return undefined when journey is removed from registry', () => {
            const mockJourney = new Journey({
                _uuid: validUuid,
                name: 'Daily Journey'
            });

            const trip = new Trip({
                _uuid: validUuid2,
                _journeyUuid: validUuid
            });

            registry.registerJourney(mockJourney);
            registry.registerTrip(trip);

            expect(trip.journey).toBe(mockJourney);

            // Remove journey from registry
            registry.unregisterJourney(validUuid);

            expect(trip.journey).toBeUndefined();
        });
    });

    describe('UUID Management', () => {
        it('should handle journeyUuid setter', () => {
            const mockJourney = new Journey({
                _uuid: validUuid7,
                name: 'New Journey'
            });

            const trip = new Trip({
                _uuid: validUuid2
            });

            registry.registerJourney(mockJourney);
            registry.registerTrip(trip);

            // Initially no journey
            expect(trip.journey).toBeUndefined();

            // Set journey UUID
            trip.journeyUuid = validUuid7;

            expect(trip.journey).toBe(mockJourney);
        });

        it('should handle tripChainUuid setter', () => {
            const mockTripChain = new TripChain({
                _uuid: validUuid8,
                category: 'shopping'
            });

            const trip = new Trip({
                _uuid: validUuid2
            });

            registry.registerTripChain(mockTripChain);
            registry.registerTrip(trip);

            // Initially no trip chain
            expect(trip.tripChain).toBeUndefined();

            // Set trip chain UUID
            trip.tripChainUuid = validUuid8;

            expect(trip.tripChain).toBe(mockTripChain);
        });

        it('should handle null/undefined parent UUIDs', () => {
            const trip = new Trip({
                _uuid: validUuid2
            });

            registry.registerTrip(trip);

            trip.journeyUuid = undefined;
            expect(trip.journey).toBeUndefined();

            trip.tripChainUuid = null as any;
            expect(trip.tripChain).toBeUndefined();
        });
    });
});
