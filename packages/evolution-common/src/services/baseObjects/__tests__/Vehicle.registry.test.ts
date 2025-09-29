/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { SurveyObjectsRegistry } from '../SurveyObjectsRegistry';
import { Vehicle } from '../Vehicle';
import { Person } from '../Person';
import { Organization } from '../Organization';
import { v4 as uuidV4 } from 'uuid';

const validUuid = uuidV4();
const validUuid2 = uuidV4();
const validUuid3 = uuidV4();
const validUuid4 = uuidV4();
const validUuid5 = uuidV4();
const validUuid6 = uuidV4();
const validUuid7 = uuidV4();

describe('Vehicle Registry Functionality', () => {
    let registry: SurveyObjectsRegistry;

    beforeEach(() => {
        registry = SurveyObjectsRegistry.getInstance();
        registry.clear();
    });

    afterEach(() => {
        registry.clear();
    });

    describe('Owner Access', () => {
        it('should access owner (person) through registry', () => {
            const mockPerson = new Person({
                _uuid: validUuid,
                age: 30
            });

            const vehicle = new Vehicle({
                _uuid: validUuid2,
                make: 'Toyota',
                _ownerUuid: validUuid
            });

            registry.registerPerson(mockPerson);
            registry.registerVehicle(vehicle);

            expect(vehicle.owner).toBe(mockPerson);
        });

        it('should return undefined for missing owner', () => {
            const vehicle = new Vehicle({
                _uuid: validUuid2,
                make: 'Toyota',
                _ownerUuid: validUuid6
            });

            registry.registerVehicle(vehicle);

            expect(vehicle.owner).toBeUndefined();
        });

        it('should return undefined when no owner UUID is set', () => {
            const vehicle = new Vehicle({
                _uuid: validUuid2,
                make: 'Toyota'
            });

            registry.registerVehicle(vehicle);

            expect(vehicle.owner).toBeUndefined();
        });
    });

    describe('Organization Access', () => {
        it('should access organization through registry', () => {
            const mockOrganization = new Organization({
                _uuid: validUuid3,
                name: 'Test Company'
            });

            const vehicle = new Vehicle({
                _uuid: validUuid2,
                make: 'Toyota',
                _organizationUuid: validUuid3
            });

            registry.registerOrganization(mockOrganization);
            registry.registerVehicle(vehicle);

            expect(vehicle.organization).toBe(mockOrganization);
        });

        it('should return undefined for missing organization', () => {
            const vehicle = new Vehicle({
                _uuid: validUuid2,
                make: 'Toyota',
                _organizationUuid: validUuid7
            });

            registry.registerVehicle(vehicle);

            expect(vehicle.organization).toBeUndefined();
        });

        it('should return undefined when no organization UUID is set', () => {
            const vehicle = new Vehicle({
                _uuid: validUuid2,
                make: 'Toyota'
            });

            registry.registerVehicle(vehicle);

            expect(vehicle.organization).toBeUndefined();
        });
    });

    describe('Dual Ownership', () => {
        it('should handle vehicle with both owner and organization', () => {
            const mockPerson = new Person({
                _uuid: validUuid,
                age: 30
            });

            const mockOrganization = new Organization({
                _uuid: validUuid3,
                name: 'Test Company'
            });

            const vehicle = new Vehicle({
                _uuid: validUuid2,
                make: 'Toyota',
                _ownerUuid: validUuid,
                _organizationUuid: validUuid3
            });

            registry.registerPerson(mockPerson);
            registry.registerOrganization(mockOrganization);
            registry.registerVehicle(vehicle);

            expect(vehicle.owner).toBe(mockPerson);
            expect(vehicle.organization).toBe(mockOrganization);
        });
    });

    describe('Registry State Changes', () => {
        it('should reflect changes when owner is updated in registry', () => {
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

            const vehicle = new Vehicle({
                _uuid: validUuid2,
                make: 'Toyota',
                _ownerUuid: validUuid
            });

            registry.registerPerson(person1);
            registry.registerVehicle(vehicle);

            expect(vehicle.owner).toBe(person1);

            // Update person in registry
            registry.registerPerson(person2);

            expect(vehicle.owner).toBe(person2);
        });

        it('should return undefined when owner is removed from registry', () => {
            const mockPerson = new Person({
                _uuid: validUuid,
                age: 30
            });

            const vehicle = new Vehicle({
                _uuid: validUuid2,
                make: 'Toyota',
                _ownerUuid: validUuid
            });

            registry.registerPerson(mockPerson);
            registry.registerVehicle(vehicle);

            expect(vehicle.owner).toBe(mockPerson);

            // Remove person from registry
            registry.unregisterPerson(validUuid);

            expect(vehicle.owner).toBeUndefined();
        });

        it('should reflect changes when organization is updated in registry', () => {
            const org1 = new Organization({
                _uuid: validUuid3,
                name: 'Company A'
            });

            const org2 = new Organization({
                _uuid: validUuid3,
                name: 'Company B'
            });

            const vehicle = new Vehicle({
                _uuid: validUuid2,
                make: 'Toyota',
                _organizationUuid: validUuid3
            });

            registry.registerOrganization(org1);
            registry.registerVehicle(vehicle);

            expect(vehicle.organization).toBe(org1);

            // Update organization in registry
            registry.registerOrganization(org2);

            expect(vehicle.organization).toBe(org2);
        });
    });

    describe('UUID Management', () => {
        it('should handle ownerUuid setter', () => {
            const mockPerson = new Person({
                _uuid: validUuid4,
                age: 25
            });

            const vehicle = new Vehicle({
                _uuid: validUuid2,
                make: 'Toyota'
            });

            // Initially no owner
            expect(vehicle.owner).toBeUndefined();

            // Set owner UUID
            vehicle.ownerUuid = validUuid4;

            expect(vehicle.owner).toBe(mockPerson);
        });

        it('should handle organizationUuid setter', () => {
            const mockOrganization = new Organization({
                _uuid: validUuid5,
                name: 'New Company'
            });

            const vehicle = new Vehicle({
                _uuid: validUuid2,
                make: 'Toyota'
            });

            registry.registerOrganization(mockOrganization);
            registry.registerVehicle(vehicle);

            // Initially no organization
            expect(vehicle.organization).toBeUndefined();

            // Set organization UUID
            vehicle.organizationUuid = validUuid5;

            expect(vehicle.organization).toBe(mockOrganization);
        });

        it('should handle null/undefined parent UUIDs', () => {
            const vehicle = new Vehicle({
                _uuid: validUuid2,
                make: 'Toyota'
            });

            registry.registerVehicle(vehicle);

            vehicle.ownerUuid = undefined;
            expect(vehicle.owner).toBeUndefined();

            vehicle.organizationUuid = null as any;
            expect(vehicle.organization).toBeUndefined();
        });
    });
});
