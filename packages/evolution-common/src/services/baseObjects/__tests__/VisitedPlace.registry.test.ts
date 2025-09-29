/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { SurveyObjectsRegistry } from '../SurveyObjectsRegistry';
import { VisitedPlace } from '../VisitedPlace';
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

describe('VisitedPlace Registry Functionality', () => {
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

            const visitedPlace = new VisitedPlace({
                _uuid: validUuid3,
                activity: 'home',
                _journeyUuid: validUuid
            });

            registry.registerJourney(mockJourney);
            registry.registerVisitedPlace(visitedPlace);

            expect(visitedPlace.journey).toBe(mockJourney);
        });

        it('should access person through journey', () => {
            const mockPerson = new Person({
                _uuid: validUuid2,
                age: 30
            });

            const mockJourney = new Journey({
                _uuid: validUuid,
                name: 'Daily Journey',
                _personUuid: validUuid2
            });

            const visitedPlace = new VisitedPlace({
                _uuid: validUuid3,
                activity: 'home',
                _journeyUuid: validUuid
            });

            registry.registerPerson(mockPerson);
            registry.registerJourney(mockJourney);
            registry.registerVisitedPlace(visitedPlace);

            expect(visitedPlace.person).toBe(mockPerson);
        });

        it('should access household through person', () => {
            const mockHousehold = new Household({
                _uuid: validUuid8,
                size: 2
            });

            const mockPerson = new Person({
                _uuid: validUuid2,
                age: 30,
                _householdUuid: validUuid8
            });

            const mockJourney = new Journey({
                _uuid: validUuid,
                name: 'Daily Journey',
                _personUuid: validUuid2
            });

            const visitedPlace = new VisitedPlace({
                _uuid: validUuid3,
                activity: 'home',
                _journeyUuid: validUuid
            });

            registry.registerHousehold(mockHousehold);
            registry.registerPerson(mockPerson);
            registry.registerJourney(mockJourney);
            registry.registerVisitedPlace(visitedPlace);

            expect(visitedPlace.household).toBe(mockHousehold);
        });

        it('should return undefined for missing journey', () => {
            const visitedPlace = new VisitedPlace({
                _uuid: validUuid3,
                activity: 'home',
                _journeyUuid: validUuid4
            });

            registry.registerVisitedPlace(visitedPlace);

            expect(visitedPlace.journey).toBeUndefined();
            expect(visitedPlace.person).toBeUndefined();
            expect(visitedPlace.household).toBeUndefined();
        });

        it('should return undefined when no journey UUID is set', () => {
            const visitedPlace = new VisitedPlace({
                _uuid: validUuid3,
                activity: 'home'
            });

            registry.registerVisitedPlace(visitedPlace);

            expect(visitedPlace.journey).toBeUndefined();
            expect(visitedPlace.person).toBeUndefined();
            expect(visitedPlace.household).toBeUndefined();
        });
    });

    describe('Partial Hierarchy', () => {
        it('should handle missing person in journey chain', () => {
            const mockJourney = new Journey({
                _uuid: validUuid,
                name: 'Daily Journey',
                _personUuid: validUuid5
            });

            const visitedPlace = new VisitedPlace({
                _uuid: validUuid3,
                activity: 'home',
                _journeyUuid: validUuid
            });

            registry.registerJourney(mockJourney);
            registry.registerVisitedPlace(visitedPlace);

            expect(visitedPlace.journey).toBe(mockJourney);
            expect(visitedPlace.person).toBeUndefined();
            expect(visitedPlace.household).toBeUndefined();
        });

        it('should handle missing household in person chain', () => {
            const mockPerson = new Person({
                _uuid: validUuid2,
                age: 30,
                _householdUuid: validUuid7
            });

            const mockJourney = new Journey({
                _uuid: validUuid,
                name: 'Daily Journey',
                _personUuid: validUuid2
            });

            const visitedPlace = new VisitedPlace({
                _uuid: validUuid3,
                activity: 'home',
                _journeyUuid: validUuid
            });

            registry.registerPerson(mockPerson);
            registry.registerJourney(mockJourney);
            registry.registerVisitedPlace(visitedPlace);

            expect(visitedPlace.journey).toBe(mockJourney);
            expect(visitedPlace.person).toBe(mockPerson);
            expect(visitedPlace.household).toBeUndefined();
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

            const visitedPlace = new VisitedPlace({
                _uuid: validUuid3,
                activity: 'home',
                _journeyUuid: validUuid
            });

            registry.registerJourney(journey1);
            registry.registerVisitedPlace(visitedPlace);

            expect(visitedPlace.journey).toBe(journey1);

            // Update journey in registry
            registry.registerJourney(journey2);

            expect(visitedPlace.journey).toBe(journey2);
        });

        it('should return undefined when journey is removed from registry', () => {
            const mockJourney = new Journey({
                _uuid: validUuid,
                name: 'Daily Journey'
            });

            const visitedPlace = new VisitedPlace({
                _uuid: validUuid3,
                activity: 'home',
                _journeyUuid: validUuid
            });

            registry.registerJourney(mockJourney);
            registry.registerVisitedPlace(visitedPlace);

            expect(visitedPlace.journey).toBe(mockJourney);

            // Remove journey from registry
            registry.unregisterJourney(validUuid);

            expect(visitedPlace.journey).toBeUndefined();
        });
    });

    describe('UUID Management', () => {
        it('should handle journeyUuid setter', () => {
            const mockJourney = new Journey({
                _uuid: validUuid6,
                name: 'New Journey'
            });

            const visitedPlace = new VisitedPlace({
                _uuid: validUuid3,
                activity: 'home'
            });

            registry.registerJourney(mockJourney);
            registry.registerVisitedPlace(visitedPlace);

            // Initially no journey
            expect(visitedPlace.journey).toBeUndefined();

            // Set journey UUID
            visitedPlace.journeyUuid = validUuid6;

            expect(visitedPlace.journey).toBe(mockJourney);
        });

        it('should handle null/undefined journey UUID', () => {
            const visitedPlace = new VisitedPlace({
                _uuid: validUuid3,
                activity: 'home'
            });

            registry.registerVisitedPlace(visitedPlace);

            visitedPlace.journeyUuid = undefined;
            expect(visitedPlace.journey).toBeUndefined();

            visitedPlace.journeyUuid = null as any;
            expect(visitedPlace.journey).toBeUndefined();
        });
    });
});
