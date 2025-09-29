/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { SurveyObjectsRegistry } from '../SurveyObjectsRegistry';
import { Segment } from '../Segment';
import { Trip } from '../Trip';
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
const validUuid9 = uuidV4();

describe('Segment Registry Functionality', () => {
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

            const segment = new Segment({
                _uuid: validUuid2,
                mode: 'walk',
                _tripUuid: validUuid
            });

            expect(segment.trip).toBe(mockTrip);
        });

        it('should access journey through trip', () => {
            const mockJourney = new Journey({
                _uuid: validUuid3,
                name: 'Daily Journey'
            });

            const mockTrip = new Trip({
                _uuid: validUuid,
                _journeyUuid: validUuid3
            });

            const segment = new Segment({
                _uuid: validUuid2,
                mode: 'walk',
                _tripUuid: mockTrip._uuid
            });


            expect(segment.journey).toBe(mockJourney);
        });

        it('should access person through journey', () => {
            const mockPerson = new Person({
                _uuid: validUuid4,
                age: 30
            });

            const mockJourney = new Journey({
                _uuid: validUuid3,
                name: 'Daily Journey',
                _personUuid: validUuid4
            });

            const mockTrip = new Trip({
                _uuid: validUuid,
                _journeyUuid: mockJourney._uuid
            });

            const segment = new Segment({
                _uuid: validUuid2,
                mode: 'walk',
                _tripUuid: mockTrip._uuid
            });

            expect(segment.person).toBe(mockPerson);
        });

        it('should access household through person', () => {
            const mockHousehold = new Household({
                _uuid: validUuid5,
                size: 2
            });

            const mockPerson = new Person({
                _uuid: validUuid4,
                age: 30,
                _householdUuid: mockHousehold._uuid
            });

            const mockJourney = new Journey({
                _uuid: validUuid3,
                name: 'Daily Journey',
                _personUuid: mockPerson._uuid
            });

            const mockTrip = new Trip({
                _uuid: validUuid,
                _journeyUuid: mockJourney._uuid
            });

            const segment = new Segment({
                _uuid: validUuid2,
                mode: 'walk',
                _tripUuid: mockTrip._uuid
            });

            expect(segment.household).toBe(mockHousehold);
        });

        it('should return undefined for missing trip', () => {
            const segment = new Segment({
                _uuid: validUuid2,
                mode: 'walk',
                _tripUuid: validUuid6
            });

            registry.registerSegment(segment);

            expect(segment.trip).toBeUndefined();
            expect(segment.journey).toBeUndefined();
            expect(segment.person).toBeUndefined();
            expect(segment.household).toBeUndefined();
        });

        it('should return undefined when no trip UUID is set', () => {
            const segment = new Segment({
                _uuid: validUuid2,
                mode: 'walk'
            });

            registry.registerSegment(segment);

            expect(segment.trip).toBeUndefined();
            expect(segment.journey).toBeUndefined();
            expect(segment.person).toBeUndefined();
            expect(segment.household).toBeUndefined();
        });
    });

    describe('Complete Hierarchy Navigation', () => {
        it('should support full hierarchy navigation from segment to household', () => {
            // Create complete hierarchy
            const mockHousehold = new Household({
                _uuid: validUuid5,
                size: 2
            });

            const mockPerson = new Person({
                _uuid: validUuid4,
                age: 30,
                _householdUuid: validUuid5
            });

            const mockJourney = new Journey({
                _uuid: validUuid3,
                name: 'Daily Journey',
                _personUuid: validUuid4
            });

            const mockTrip = new Trip({
                _uuid: validUuid,
                _journeyUuid: validUuid3
            });

            const segment = new Segment({
                _uuid: validUuid2,
                mode: 'walk',
                _tripUuid: validUuid
            });

            // Register all objects
            registry.registerHousehold(mockHousehold);
            registry.registerPerson(mockPerson);
            registry.registerJourney(mockJourney);
            registry.registerTrip(mockTrip);
            registry.registerSegment(segment);

            // Test full hierarchy navigation
            expect(segment.trip).toBe(mockTrip);
            expect(segment.journey).toBe(mockJourney);
            expect(segment.person).toBe(mockPerson);
            expect(segment.household).toBe(mockHousehold);

            // Test chained navigation
            expect(segment.trip?.journey).toBe(mockJourney);
            expect(segment.journey?.person).toBe(mockPerson);
            expect(segment.person?.household).toBe(mockHousehold);
        });
    });

    describe('Partial Hierarchy', () => {
        it('should handle missing journey in trip chain', () => {
            const mockTrip = new Trip({
                _uuid: validUuid,
                _journeyUuid: validUuid7
            });

            const segment = new Segment({
                _uuid: validUuid2,
                mode: 'walk',
                _tripUuid: validUuid
            });

            registry.registerTrip(mockTrip);
            registry.registerSegment(segment);

            expect(segment.trip).toBe(mockTrip);
            expect(segment.journey).toBeUndefined();
            expect(segment.person).toBeUndefined();
            expect(segment.household).toBeUndefined();
        });

        it('should handle missing person in journey chain', () => {
            const mockJourney = new Journey({
                _uuid: validUuid3,
                name: 'Daily Journey',
                _personUuid: validUuid9
            });

            const mockTrip = new Trip({
                _uuid: validUuid,
                _journeyUuid: validUuid3
            });

            const segment = new Segment({
                _uuid: validUuid2,
                mode: 'walk',
                _tripUuid: validUuid
            });

            registry.registerJourney(mockJourney);
            registry.registerTrip(mockTrip);
            registry.registerSegment(segment);

            expect(segment.trip).toBe(mockTrip);
            expect(segment.journey).toBe(mockJourney);
            expect(segment.person).toBeUndefined();
            expect(segment.household).toBeUndefined();
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

            const segment = new Segment({
                _uuid: validUuid2,
                mode: 'walk',
                _tripUuid: validUuid
            });

            registry.registerTrip(trip1);
            registry.registerSegment(segment);

            expect(segment.trip).toBe(trip1);

            // Update trip in registry
            registry.registerTrip(trip2);

            expect(segment.trip).toBe(trip2);
        });

        it('should return undefined when trip is removed from registry', () => {
            const mockTrip = new Trip({
                _uuid: validUuid
            });

            const segment = new Segment({
                _uuid: validUuid2,
                mode: 'walk',
                _tripUuid: validUuid
            });

            registry.registerTrip(mockTrip);
            registry.registerSegment(segment);

            expect(segment.trip).toBe(mockTrip);

            // Remove trip from registry
            registry.unregisterTrip(validUuid);

            expect(segment.trip).toBeUndefined();
        });
    });

    describe('UUID Management', () => {
        it('should handle tripUuid setter', () => {
            const mockTrip = new Trip({
                _uuid: validUuid8
            });

            const segment = new Segment({
                _uuid: validUuid2,
                mode: 'walk'
            });

            registry.registerTrip(mockTrip);
            registry.registerSegment(segment);

            // Initially no trip
            expect(segment.trip).toBeUndefined();

            // Set trip UUID
            segment.tripUuid = validUuid8;

            expect(segment.trip).toBe(mockTrip);
        });

        it('should handle null/undefined trip UUID', () => {
            const segment = new Segment({
                _uuid: validUuid2,
                mode: 'walk'
            });

            registry.registerSegment(segment);

            segment.tripUuid = undefined;
            expect(segment.trip).toBeUndefined();

            segment.tripUuid = null as any;
            expect(segment.trip).toBeUndefined();
        });
    });
});
