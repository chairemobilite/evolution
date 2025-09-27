/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { Trip } from 'evolution-common/lib/services/baseObjects/Trip';
import { Journey } from 'evolution-common/lib/services/baseObjects/Journey';
import { Person } from 'evolution-common/lib/services/baseObjects/Person';
import { Household } from 'evolution-common/lib/services/baseObjects/Household';
import { Home } from 'evolution-common/lib/services/baseObjects/Home';
import { ExtendedJourneyAttributes } from 'evolution-common/lib/services/baseObjects/Journey';
import { ExtendedInterviewAttributesWithComposedObjects, Interview } from 'evolution-common/lib/services/baseObjects/interview/Interview';
import { ExtendedPersonAttributes } from 'evolution-common/lib/services/baseObjects/Person';
import { ExtendedHouseholdAttributes } from 'evolution-common/lib/services/baseObjects/Household';
import { InterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import { tripAuditChecks } from '../TripAuditChecks';
import { runTripAuditChecks } from '../../infrastructure/AuditCheckRunners';
import { TripAuditCheckContext } from '../../infrastructure/AuditCheckContexts';
import { ExtendedPlaceAttributes } from 'evolution-common/lib/services/baseObjects/Place';

describe('TripAuditChecks', () => {
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

    const createMockJourney = (overrides: Partial<Journey> = {}) => {
        return new Journey({
            _uuid: journeyUuid,
            ...overrides
        } as ExtendedJourneyAttributes);
    };

    const createMockPerson = (overrides: Partial<Person> = {}) => {
        return new Person({
            _uuid: personUuid,
            age: 30,
            ...overrides
        } as ExtendedPersonAttributes);
    };

    const createMockHousehold = (overrides: Partial<Household> = {}) => {
        return new Household({
            _uuid: householdUuid,
            size: 2,
            ...overrides
        } as ExtendedHouseholdAttributes);
    };

    const createMockHome = (overrides: Partial<Home> = {}) => {
        return new Home({
            _uuid: homeUuid,
            ...overrides
        } as ExtendedPlaceAttributes);
    };

    const createMockInterview = (overrides: Partial<Interview> = {}) => {
        return new Interview({
            _uuid: interviewUuid,
            ...overrides
        } as ExtendedInterviewAttributesWithComposedObjects, { id: 123, participant_id: 1 } as any);
    };

    const createMockInterviewAttributes = (overrides: Partial<InterviewAttributes> = {}): InterviewAttributes => {
        return {
            uuid: interviewUuid,
            id: 123,
            participant_id: 1,
            is_valid: true,
            is_active: true,
            is_completed: false,
            is_questionable: false,
            is_validated: false,
            response: {
                household: {},
                persons: {}
            },
            validations: {},
            survey_id: 1,
            ...overrides
        };
    };

    const createFullContext = (overrides: Partial<TripAuditCheckContext> = {}): TripAuditCheckContext => {
        return {
            trip: createMockTrip(),
            journey: createMockJourney(),
            person: createMockPerson(),
            household: createMockHousehold(),
            home: createMockHome(),
            interview: createMockInterview(),
            interviewAttributes: createMockInterviewAttributes(),
            ...overrides
        };
    };

    describe('T_M_Uuid audit check', () => {
        it('should pass when trip has UUID', () => {
            const context = createFullContext({
                trip: createMockTrip({ _uuid: validUuid })
            });

            const result = tripAuditChecks.T_M_Uuid(context);

            expect(result).toBeUndefined();
        });

        it('should error when trip UUID is missing', () => {
            const context = createFullContext({
                trip: createMockTrip({ _uuid: undefined })
            });

            const result = tripAuditChecks.T_M_Uuid(context);

            expect(result).toEqual({
                version: 1,
                level: 'error',
                message: 'Trip UUID is missing',
                ignore: false
            });
        });
    });

    describe('T_M_StartDate audit check', () => {
        it('should pass when trip has start date', () => {
            const context = createFullContext({
                trip: createMockTrip({ startDate: '2023-10-15' })
            });

            const result = tripAuditChecks.T_M_StartDate(context);

            expect(result).toBeUndefined();
        });

        it('should warn when trip start date is missing', () => {
            const context = createFullContext({
                trip: createMockTrip({ startDate: undefined })
            });

            const result = tripAuditChecks.T_M_StartDate(context);

            expect(result).toEqual({
                version: 1,
                level: 'warning',
                message: 'Trip start date is missing',
                ignore: false
            });
        });
    });


    describe('runTripAuditChecks function', () => {
        it('should run all trip audits and format results', () => {
            const context = createFullContext({
                trip: createMockTrip({ _uuid: validUuid, startDate: '2023-10-15' })
            });

            const audits = runTripAuditChecks(context, tripAuditChecks);

            // Should return empty array since all audits pass
            expect(audits).toHaveLength(0);
        });

        it('should include failed audits in results', () => {
            // Test with missing start date (UUID is valid, but startDate is missing)
            const context = createFullContext({
                trip: createMockTrip({
                    startDate: undefined
                })
            });

            const audits = runTripAuditChecks(context, tripAuditChecks);

            expect(audits).toHaveLength(1); // Only start date audit should fail

            // Check start date audit
            const startDateAudit = audits.find((audit) => audit.errorCode === 'T_M_StartDate');
            expect(startDateAudit).toEqual({
                objectType: 'trip',
                objectUuid: validUuid,
                errorCode: 'T_M_StartDate',
                version: 1,
                level: 'warning',
                message: 'Trip start date is missing',
                ignore: false
            });
        });
    });
});
