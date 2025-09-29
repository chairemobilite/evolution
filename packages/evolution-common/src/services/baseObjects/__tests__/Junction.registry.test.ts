/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { SurveyObjectsRegistry } from '../SurveyObjectsRegistry';
import { Junction } from '../Junction';
import { Trip } from '../Trip';
import { v4 as uuidV4 } from 'uuid';

const validUuid = uuidV4();
const validUuid2 = uuidV4();
const validUuid3 = uuidV4();
const validUuid4 = uuidV4();

describe('Junction Registry Functionality', () => {
    let registry: SurveyObjectsRegistry;

    beforeEach(() => {
        registry = SurveyObjectsRegistry.getInstance();
        registry.clear();
    });

    afterEach(() => {
        registry.clear();
    });

    describe('Parent Access', () => {
        it('should access trip through registry', () => {
            const mockTrip = new Trip({
                _uuid: validUuid
            });

            const junction = new Junction({
                _uuid: validUuid2,
                parkingType: 'exterior',
                _tripUuid: validUuid
            });

            registry.registerTrip(mockTrip);
            registry.registerJunction(junction);

            expect(junction.trip).toBe(mockTrip);
        });

        it('should return undefined for missing trip', () => {
            const junction = new Junction({
                _uuid: validUuid2,
                parkingType: 'exterior',
                _tripUuid: validUuid4
            });

            registry.registerJunction(junction);

            expect(junction.trip).toBeUndefined();
        });

        it('should return undefined when no trip UUID is set', () => {
            const junction = new Junction({
                _uuid: validUuid2,
                parkingType: 'exterior'
            });

            registry.registerJunction(junction);

            expect(junction.trip).toBeUndefined();
        });
    });

    describe('Registry State Changes', () => {
        it('should reflect changes when trip is updated in registry', () => {
            const trip1 = new Trip({
                _uuid: validUuid
            });

            const trip2 = new Trip({
                _uuid: validUuid
            });

            const junction = new Junction({
                _uuid: validUuid2,
                parkingType: 'exterior',
                _tripUuid: validUuid
            });

            registry.registerTrip(trip1);
            registry.registerJunction(junction);

            expect(junction.trip).toBe(trip1);

            // Update trip in registry
            registry.registerTrip(trip2);

            expect(junction.trip).toBe(trip2);
        });

        it('should return undefined when trip is removed from registry', () => {
            const mockTrip = new Trip({
                _uuid: validUuid
            });

            const junction = new Junction({
                _uuid: validUuid2,
                parkingType: 'exterior',
                _tripUuid: validUuid
            });

            registry.registerTrip(mockTrip);
            registry.registerJunction(junction);

            expect(junction.trip).toBe(mockTrip);

            // Remove trip from registry
            registry.unregisterTrip(validUuid);

            expect(junction.trip).toBeUndefined();
        });
    });

    describe('UUID Management', () => {
        it('should handle tripUuid setter', () => {
            const mockTrip = new Trip({
                _uuid: validUuid3
            });

            const junction = new Junction({
                _uuid: validUuid2,
                parkingType: 'exterior'
            });

            registry.registerTrip(mockTrip);
            registry.registerJunction(junction);

            // Initially no trip
            expect(junction.trip).toBeUndefined();

            // Set trip UUID
            junction.tripUuid = validUuid3;

            expect(junction.trip).toBe(mockTrip);
        });

        it('should handle null/undefined trip UUID', () => {
            const junction = new Junction({
                _uuid: validUuid2,
                parkingType: 'exterior'
            });

            registry.registerJunction(junction);

            junction.tripUuid = undefined;
            expect(junction.trip).toBeUndefined();

            junction.tripUuid = null as any;
            expect(junction.trip).toBeUndefined();
        });
    });
});
