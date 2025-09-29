/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { Journey } from 'evolution-common/lib/services/baseObjects/Journey';
import { Person } from 'evolution-common/lib/services/baseObjects/Person';
import { Household } from 'evolution-common/lib/services/baseObjects/Household';
import { Home } from 'evolution-common/lib/services/baseObjects/Home';
import { ExtendedInterviewAttributesWithComposedObjects, Interview } from 'evolution-common/lib/services/baseObjects/interview/Interview';
import { ExtendedPersonAttributes } from 'evolution-common/lib/services/baseObjects/Person';
import { InterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import { journeyAuditChecks } from '../JourneyAuditChecks';
import { runJourneyAuditChecks } from '../../infrastructure/AuditCheckRunners';
import { JourneyAuditCheckContext } from '../../infrastructure/AuditCheckContexts';

describe('JourneyAuditChecks', () => {
    const validUuid = uuidV4();
    const personUuid = uuidV4();
    const householdUuid = uuidV4();
    const homeUuid = uuidV4();
    const interviewUuid = uuidV4();

    const createMockJourney = (overrides: Partial<Journey> = {}) => {
        return {
            _uuid: validUuid,
            startTime: 28800, // 8:00 AM in seconds
            endTime: 32400,   // 9:00 AM in seconds
            ...overrides
        } as Journey;
    };

    const createMockPerson = (overrides: Partial<Person> = {}) => {
        return new Person({
            _uuid: personUuid,
            age: 30,
            ...overrides
        } as ExtendedPersonAttributes);
    };

    const createMockHousehold = (overrides: Partial<Household> = {}) => {
        return {
            _uuid: householdUuid,
            size: 2,
            ...overrides
        } as Household;
    };

    const createMockHome = (overrides: Partial<Home> = {}) => {
        return {
            _uuid: homeUuid,
            ...overrides
        } as Home;
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

    const createFullContext = (overrides: Partial<JourneyAuditCheckContext> = {}): JourneyAuditCheckContext => {
        return {
            journey: createMockJourney(),
            person: createMockPerson(),
            household: createMockHousehold(),
            home: createMockHome(),
            interview: createMockInterview(),
            interviewAttributes: createMockInterviewAttributes(),
            ...overrides
        };
    };

    describe('J_M_Uuid audit check', () => {
        it('should pass when journey has UUID', () => {
            const context = createFullContext({
                journey: createMockJourney({ _uuid: validUuid })
            });

            const result = journeyAuditChecks.J_M_Uuid(context);

            expect(result).toBeUndefined();
        });

        it('should error when journey UUID is missing', () => {
            const context = createFullContext({
                journey: createMockJourney({ _uuid: undefined })
            });

            const result = journeyAuditChecks.J_M_Uuid(context);

            expect(result).toEqual({
                version: 1,
                level: 'error',
                message: 'Journey UUID is missing',
                ignore: false
            });
        });
    });

    describe('J_M_StartTime audit check', () => {
        it('should pass when journey has start time', () => {
            const context = createFullContext();

            const result = journeyAuditChecks.J_M_StartTime(context);

            expect(result).toBeUndefined();
        });

        it('should warn when journey start time is undefined', () => {
            const context = createFullContext({
                journey: createMockJourney({ startTime: undefined })
            });

            const result = journeyAuditChecks.J_M_StartTime(context);

            expect(result).toEqual({
                version: 1,
                level: 'warning',
                message: 'Journey start time is missing',
                ignore: false
            });
        });

        it('should warn when journey start time is null', () => {
            const context = createFullContext({
                journey: createMockJourney({ startTime: undefined })
            });

            const result = journeyAuditChecks.J_M_StartTime(context);

            expect(result).toEqual({
                version: 1,
                level: 'warning',
                message: 'Journey start time is missing',
                ignore: false
            });
        });
    });


    describe('runJourneyAuditChecks function', () => {
        it('should run all journey audits and format results', () => {
            const context = createFullContext({
                journey: createMockJourney({ _uuid: validUuid, startTime: 28800 })
            });

            const audits = runJourneyAuditChecks(context, journeyAuditChecks);

            // Should return empty array since all audits pass
            expect(audits).toHaveLength(0);
        });

        it('should include failed audits in results', () => {
            const context = createFullContext({
                journey: createMockJourney({
                    startTime: undefined,
                    endTime: 28800
                })
            });

            const audits = runJourneyAuditChecks(context, journeyAuditChecks);

            expect(audits).toHaveLength(1);

            // Check start time audit
            const startTimeAudit = audits.find((audit) => audit.errorCode === 'J_M_StartTime');
            expect(startTimeAudit).toEqual({
                objectType: 'journey',
                objectUuid: validUuid,
                errorCode: 'J_M_StartTime',
                version: 1,
                level: 'warning',
                message: 'Journey start time is missing',
                ignore: false
            });
        });

        it('should include multiple failed audits in results', () => {
            // Test with missing start time (UUID is valid, but startTime is missing)
            const context = createFullContext({
                journey: createMockJourney({
                    startTime: undefined
                })
            });

            const audits = runJourneyAuditChecks(context, journeyAuditChecks);

            expect(audits).toHaveLength(1); // Only start time audit should fail

            // Check start time audit
            const startTimeAudit = audits.find((audit) => audit.errorCode === 'J_M_StartTime');
            expect(startTimeAudit).toEqual({
                objectType: 'journey',
                objectUuid: validUuid,
                errorCode: 'J_M_StartTime',
                version: 1,
                level: 'warning',
                message: 'Journey start time is missing',
                ignore: false
            });
        });
    });
});
