/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { SurveyObjectsRegistry } from '../SurveyObjectsRegistry';
import { Interview } from '../interview/Interview';
import { Household } from '../Household';
import { Person } from '../Person';
import { Journey } from '../Journey';
import { VisitedPlace } from '../VisitedPlace';
import { Trip } from '../Trip';
import { TripChain } from '../TripChain';
import { Segment } from '../Segment';
import { Junction } from '../Junction';
import { Vehicle } from '../Vehicle';
import { Organization } from '../Organization';
import { Place } from '../Place';
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
const validUuid11 = uuidV4();
const validUuid12 = uuidV4();
const validUuid13 = uuidV4();

// Mock the dependencies
jest.mock('../interview/Interview');
jest.mock('../Household');
jest.mock('../Person');
jest.mock('../Journey');
jest.mock('../VisitedPlace');
jest.mock('../Trip');
jest.mock('../TripChain');
jest.mock('../Segment');
jest.mock('../Junction');
jest.mock('../Vehicle');
jest.mock('../Organization');
jest.mock('../Place');

describe('SurveyObjectsRegistry', () => {
    let registry: SurveyObjectsRegistry;

    beforeEach(() => {
        // Get a fresh instance for each test
        registry = SurveyObjectsRegistry.getInstance();
        registry.clear();
    });

    afterEach(() => {
        registry.clear();
    });

    describe('Singleton Pattern', () => {
        it('should return the same instance', () => {
            const instance1 = SurveyObjectsRegistry.getInstance();
            const instance2 = SurveyObjectsRegistry.getInstance();
            expect(instance1).toBe(instance2);
        });
    });

    describe('Interview Registration and Lookup', () => {
        it('should register and retrieve interview', () => {
            const mockInterview = { uuid: validUuid } as Interview;

            registry.registerInterview(mockInterview);
            const retrieved = registry.getInterview(validUuid);

            expect(retrieved).toBe(mockInterview);
        });

        it('should not register interview without uuid', () => {
            const mockInterview = { uuid: undefined } as Interview;

            registry.registerInterview(mockInterview);
            const retrieved = registry.getInterview(validUuid);

            expect(retrieved).toBeUndefined();
        });

        it('should unregister interview', () => {
            const mockInterview = { uuid: validUuid } as Interview;

            registry.registerInterview(mockInterview);
            registry.unregisterInterview(validUuid);
            const retrieved = registry.getInterview(validUuid);

            expect(retrieved).toBeUndefined();
        });
    });

    describe('Place Registration and Lookup', () => {
        it('should register and retrieve place', () => {
            const mockPlace = { uuid: validUuid2 } as Place;

            registry.registerPlace(mockPlace);
            const retrieved = registry.getPlace(validUuid2);

            expect(retrieved).toBe(mockPlace);
        });
    });

    describe('Household Registration and Lookup', () => {
        it('should register and retrieve household', () => {
            const mockHousehold = { uuid: validUuid3 } as Household;

            registry.registerHousehold(mockHousehold);
            const retrieved = registry.getHousehold(validUuid3);

            expect(retrieved).toBe(mockHousehold);
        });
    });

    describe('Person Registration and Lookup', () => {
        it('should register and retrieve person', () => {
            const mockPerson = { uuid: validUuid4 } as Person;

            registry.registerPerson(mockPerson);
            const retrieved = registry.getPerson(validUuid4);

            expect(retrieved).toBe(mockPerson);
        });
    });

    describe('Vehicle Registration and Lookup', () => {
        it('should register and retrieve vehicle', () => {
            const mockVehicle = { uuid: validUuid12 } as Vehicle;

            registry.registerVehicle(mockVehicle);
            const retrieved = registry.getVehicle(validUuid12);

            expect(retrieved).toBe(mockVehicle);
        });
    });

    describe('Organization Registration and Lookup', () => {
        it('should register and retrieve organization', () => {
            const mockOrganization = { uuid: validUuid9 } as Organization;

            registry.registerOrganization(mockOrganization);
            const retrieved = registry.getOrganization(validUuid9);

            expect(retrieved).toBe(mockOrganization);
        });
    });

    describe('Journey Registration and Lookup', () => {
        it('should register and retrieve journey', () => {
            const mockJourney = { uuid: validUuid5 } as Journey;

            registry.registerJourney(mockJourney);
            const retrieved = registry.getJourney(validUuid5);

            expect(retrieved).toBe(mockJourney);
        });
    });

    describe('VisitedPlace Registration and Lookup', () => {
        it('should register and retrieve visited place', () => {
            const mockVisitedPlace = { uuid: validUuid6 } as VisitedPlace;

            registry.registerVisitedPlace(mockVisitedPlace);
            const retrieved = registry.getVisitedPlace(validUuid6);

            expect(retrieved).toBe(mockVisitedPlace);
        });
    });

    describe('Trip Registration and Lookup', () => {
        it('should register and retrieve trip', () => {
            const mockTrip = { uuid: validUuid7 } as Trip;

            registry.registerTrip(mockTrip);
            const retrieved = registry.getTrip(validUuid7);

            expect(retrieved).toBe(mockTrip);
        });
    });

    describe('TripChain Registration and Lookup', () => {
        it('should register and retrieve trip chain', () => {
            const mockTripChain = { uuid: validUuid8 } as TripChain;

            registry.registerTripChain(mockTripChain);
            const retrieved = registry.getTripChain(validUuid8);

            expect(retrieved).toBe(mockTripChain);
        });
    });

    describe('Segment Registration and Lookup', () => {
        it('should register and retrieve segment', () => {
            const mockSegment = { uuid: validUuid10 } as Segment;

            registry.registerSegment(mockSegment);
            const retrieved = registry.getSegment(validUuid10);

            expect(retrieved).toBe(mockSegment);
        });
    });

    describe('Junction Registration and Lookup', () => {
        it('should register and retrieve junction', () => {
            const mockJunction = { uuid: validUuid11 } as Junction;

            registry.registerJunction(mockJunction);
            const retrieved = registry.getJunction(validUuid11);

            expect(retrieved).toBe(mockJunction);
        });
    });

    describe('Clear Functionality', () => {
        it('should clear all registries', () => {
            const mockInterview = { uuid: validUuid } as Interview;
            const mockHousehold = { uuid: validUuid3 } as Household;
            const mockPerson = { uuid: validUuid4 } as Person;

            registry.registerInterview(mockInterview);
            registry.registerHousehold(mockHousehold);
            registry.registerPerson(mockPerson);

            registry.clear();

            expect(registry.getInterview(validUuid)).toBeUndefined();
            expect(registry.getHousehold(validUuid3)).toBeUndefined();
            expect(registry.getPerson(validUuid4)).toBeUndefined();
        });
    });

    describe('Parent-Child Relationship Integration', () => {
        it('should support complete survey object hierarchy', () => {
            // Create mock objects with parent-child relationships
            const mockInterview = { uuid: validUuid } as Interview;
            const mockHousehold = {
                uuid: validUuid3,
                interviewUuid: validUuid
            } as Household;
            const mockPerson = {
                uuid: validUuid4,
                householdUuid: validUuid3
            } as Person;
            const mockJourney = {
                uuid: validUuid5,
                personUuid: validUuid4
            } as Journey;
            const mockVisitedPlace = {
                uuid: validUuid6,
                journeyUuid: validUuid5
            } as VisitedPlace;
            const mockTrip = {
                uuid: validUuid7,
                journeyUuid: validUuid5
            } as Trip;
            const mockSegment = {
                uuid: validUuid10,
                tripUuid: validUuid7
            } as Segment;

            // Register all objects
            registry.registerInterview(mockInterview);
            registry.registerHousehold(mockHousehold);
            registry.registerPerson(mockPerson);
            registry.registerJourney(mockJourney);
            registry.registerVisitedPlace(mockVisitedPlace);
            registry.registerTrip(mockTrip);
            registry.registerSegment(mockSegment);

            // Verify all objects can be retrieved
            expect(registry.getInterview(validUuid)).toBe(mockInterview);
            expect(registry.getHousehold(validUuid3)).toBe(mockHousehold);
            expect(registry.getPerson(validUuid4)).toBe(mockPerson);
            expect(registry.getJourney(validUuid5)).toBe(mockJourney);
            expect(registry.getVisitedPlace(validUuid6)).toBe(mockVisitedPlace);
            expect(registry.getTrip(validUuid7)).toBe(mockTrip);
            expect(registry.getSegment(validUuid10)).toBe(mockSegment);
        });
    });

    describe('Edge Cases', () => {
        it('should handle null/undefined UUIDs gracefully', () => {
            const mockPerson1 = { uuid: null } as any as Person;
            const mockPerson2 = { uuid: undefined } as Person;
            const mockPerson3 = { uuid: '' } as Person;

            registry.registerPerson(mockPerson1);
            registry.registerPerson(mockPerson2);
            registry.registerPerson(mockPerson3);

            expect(registry.getPerson('null')).toBeUndefined();
            expect(registry.getPerson('undefined')).toBeUndefined();
            expect(registry.getPerson('')).toBeUndefined();
        });

        it('should handle non-existent UUID lookups', () => {
            expect(registry.getInterview(validUuid13)).toBeUndefined();
            expect(registry.getHousehold(validUuid13)).toBeUndefined();
            expect(registry.getPerson(validUuid13)).toBeUndefined();
            expect(registry.getJourney(validUuid13)).toBeUndefined();
            expect(registry.getVisitedPlace(validUuid13)).toBeUndefined();
            expect(registry.getTrip(validUuid13)).toBeUndefined();
            expect(registry.getSegment(validUuid13)).toBeUndefined();
        });

        it('should handle object replacement', () => {
            const mockPerson1 = { uuid: validUuid4, name: 'Person 1' } as any as Person;
            const mockPerson2 = { uuid: validUuid4, name: 'Person 2' } as any as Person;

            registry.registerPerson(mockPerson1);
            expect(registry.getPerson(validUuid4)).toBe(mockPerson1);

            // Register another object with same UUID - should replace
            registry.registerPerson(mockPerson2);
            expect(registry.getPerson(validUuid4)).toBe(mockPerson2);
        });
    });

    describe('Unregister Operations', () => {
        it('should unregister all object types', () => {
            // Register objects
            const objects = {
                interview: { uuid: validUuid } as Interview,
                place: { uuid: validUuid2 } as Place,
                household: { uuid: validUuid3 } as Household,
                person: { uuid: validUuid4 } as Person,
                vehicle: { uuid: validUuid12 } as Vehicle,
                organization: { uuid: validUuid9 } as Organization,
                journey: { uuid: validUuid5 } as Journey,
                visitedPlace: { uuid: validUuid6 } as VisitedPlace,
                trip: { uuid: validUuid7 } as Trip,
                tripChain: { uuid: validUuid8 } as TripChain,
                segment: { uuid: validUuid10 } as Segment,
                junction: { uuid: validUuid11 } as Junction
            };

            registry.registerInterview(objects.interview);
            registry.registerPlace(objects.place);
            registry.registerHousehold(objects.household);
            registry.registerPerson(objects.person);
            registry.registerVehicle(objects.vehicle);
            registry.registerOrganization(objects.organization);
            registry.registerJourney(objects.journey);
            registry.registerVisitedPlace(objects.visitedPlace);
            registry.registerTrip(objects.trip);
            registry.registerTripChain(objects.tripChain);
            registry.registerSegment(objects.segment);
            registry.registerJunction(objects.junction);

            // Unregister all
            registry.unregisterInterview(validUuid);
            registry.unregisterPlace(validUuid2);
            registry.unregisterHousehold(validUuid3);
            registry.unregisterPerson(validUuid4);
            registry.unregisterVehicle(validUuid12);
            registry.unregisterOrganization(validUuid9);
            registry.unregisterJourney(validUuid5);
            registry.unregisterVisitedPlace(validUuid6);
            registry.unregisterTrip(validUuid7);
            registry.unregisterTripChain(validUuid8);
            registry.unregisterSegment(validUuid10);
            registry.unregisterJunction(validUuid11);

            // Verify all are unregistered
            expect(registry.getInterview(validUuid)).toBeUndefined();
            expect(registry.getPlace(validUuid2)).toBeUndefined();
            expect(registry.getHousehold(validUuid3)).toBeUndefined();
            expect(registry.getPerson(validUuid4)).toBeUndefined();
            expect(registry.getVehicle(validUuid12)).toBeUndefined();
            expect(registry.getOrganization(validUuid9)).toBeUndefined();
            expect(registry.getJourney(validUuid5)).toBeUndefined();
            expect(registry.getVisitedPlace(validUuid6)).toBeUndefined();
            expect(registry.getTrip(validUuid7)).toBeUndefined();
            expect(registry.getTripChain(validUuid8)).toBeUndefined();
            expect(registry.getSegment(validUuid10)).toBeUndefined();
            expect(registry.getJunction(validUuid11)).toBeUndefined();
        });
    });
});
