/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { Trip } from 'evolution-common/lib/services/baseObjects/Trip';
import { Segment } from 'evolution-common/lib/services/baseObjects/Segment';
import { Journey } from 'evolution-common/lib/services/baseObjects/Journey';
import { Person } from 'evolution-common/lib/services/baseObjects/Person';
import { Household } from 'evolution-common/lib/services/baseObjects/Household';
import { Home } from 'evolution-common/lib/services/baseObjects/Home';
import { ExtendedJourneyAttributes } from 'evolution-common/lib/services/baseObjects/Journey';
import { ExtendedInterviewAttributesWithComposedObjects, Interview } from 'evolution-common/lib/services/baseObjects/interview/Interview';
import { ExtendedPersonAttributes } from 'evolution-common/lib/services/baseObjects/Person';
import { ExtendedHouseholdAttributes } from 'evolution-common/lib/services/baseObjects/Household';
import { tripAuditChecks } from '../TripAuditChecks';
import { runTripAuditChecks } from '../../AuditCheckRunners';
import { TripAuditCheckContext } from '../../AuditCheckContexts';
import { ExtendedPlaceAttributes } from 'evolution-common/lib/services/baseObjects/Place';
import { SurveyObjectsRegistry } from 'evolution-common/lib/services/baseObjects/SurveyObjectsRegistry';

describe('TripAuditChecks', () => {
    let surveyObjectsRegistry: SurveyObjectsRegistry;

    beforeEach(() => {
        surveyObjectsRegistry = new SurveyObjectsRegistry();
    });

    afterEach(() => {
        surveyObjectsRegistry.clear();
    });

    const validUuid = uuidV4();
    const journeyUuid = uuidV4();
    const personUuid = uuidV4();
    const householdUuid = uuidV4();
    const homeUuid = uuidV4();
    const interviewUuid = uuidV4();

    const createMockTrip = (overrides: Partial<Trip> = {}) => {
        return {
            _uuid: validUuid,
            startDate: '2023-10-15',
            ...overrides
        } as Trip;
    };

    const createMockSegment = (overrides: Partial<Segment> = {}) => {
        return {
            _uuid: uuidV4(),
            mode: 'walk',
            ...overrides
        } as Segment;
    };

    const createMockJourney = (overrides: Partial<Journey> = {}) => {
        return new Journey({
            _uuid: journeyUuid,
            ...overrides
        } as ExtendedJourneyAttributes, surveyObjectsRegistry);
    };

    const createMockPerson = (overrides: Partial<Person> = {}) => {
        return new Person({
            _uuid: personUuid,
            age: 30,
            ...overrides
        } as ExtendedPersonAttributes, surveyObjectsRegistry);
    };

    const createMockHousehold = (overrides: Partial<Household> = {}) => {
        return new Household({
            _uuid: householdUuid,
            size: 2,
            ...overrides
        } as ExtendedHouseholdAttributes, surveyObjectsRegistry);
    };

    const createMockHome = (overrides: Partial<Home> = {}) => {
        return new Home({
            _uuid: homeUuid,
            ...overrides
        } as ExtendedPlaceAttributes, surveyObjectsRegistry);
    };

    const createMockInterview = (overrides: Partial<Interview> = {}) => {
        return new Interview({
            _uuid: interviewUuid,
            ...overrides
        } as ExtendedInterviewAttributesWithComposedObjects, { id: 123, participant_id: 1 } as any, surveyObjectsRegistry);
    };

    const createFullContext = (overrides: Partial<TripAuditCheckContext> = {}): TripAuditCheckContext => {
        return {
            trip: createMockTrip(),
            journey: createMockJourney(),
            person: createMockPerson(),
            household: createMockHousehold(),
            home: createMockHome(),
            interview: createMockInterview(),
            ...overrides
        };
    };

    describe('T_M_Segments audit check', () => {
        it('should pass when trip has segments', () => {
            const context = createFullContext({
                trip: createMockTrip({ segments: [createMockSegment({ mode: 'walk' })] })
            });

            const result = tripAuditChecks.T_M_Segments(context);

            expect(result).toBeUndefined();
        });

        it('should error when trip segments are missing', () => {
            const context = createFullContext({
                trip: createMockTrip({ segments: undefined })
            });

            const result = tripAuditChecks.T_M_Segments(context);

            expect(result).toEqual({
                objectType: 'trip',
                objectUuid: validUuid,
                errorCode: 'T_M_Segments',
                version: 1,
                level: 'error',
                message: 'Trip segments are missing',
                ignore: false
            });
        });

        it('should error when trip has empty segments array', () => {
            const context = createFullContext({
                trip: createMockTrip({ segments: [] })
            });

            const result = tripAuditChecks.T_M_Segments(context);

            expect(result).toEqual({
                objectType: 'trip',
                objectUuid: validUuid,
                errorCode: 'T_M_Segments',
                version: 1,
                level: 'error',
                message: 'Trip segments are missing',
                ignore: false
            });
        });
    });

    describe('runTripAuditChecks function', () => {
        it('should run all trip audits and format results', () => {
            const context = createFullContext({
                trip: createMockTrip({ segments: [createMockSegment({ mode: 'walk' })] })
            });

            const audits = runTripAuditChecks(context, tripAuditChecks);

            // Should return empty array since all audits pass
            expect(audits).toHaveLength(0);
        });

        it('should include failed audits in results', () => {
            // Test with missing segments
            const context = createFullContext({
                trip: createMockTrip({ segments: undefined })
            });

            const audits = runTripAuditChecks(context, tripAuditChecks);

            expect(audits).toHaveLength(1); // Only segments audit should fail

            // Check segments audit
            const segmentsAudit = audits.find((audit) => audit.errorCode === 'T_M_Segments');
            expect(segmentsAudit).toEqual({
                objectType: 'trip',
                objectUuid: validUuid,
                errorCode: 'T_M_Segments',
                version: 1,
                level: 'error',
                message: 'Trip segments are missing',
                ignore: false
            });
        });
    });
});
