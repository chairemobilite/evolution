/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { Person } from 'evolution-common/lib/services/baseObjects/Person';
import { Household } from 'evolution-common/lib/services/baseObjects/Household';
import { Home } from 'evolution-common/lib/services/baseObjects/Home';
import { ExtendedInterviewAttributesWithComposedObjects, Interview } from 'evolution-common/lib/services/baseObjects/interview/Interview';
import { ExtendedHouseholdAttributes } from 'evolution-common/lib/services/baseObjects/Household';
import { ExtendedPlaceAttributes } from 'evolution-common/lib/services/baseObjects/Place';
import { InterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import { personAuditChecks } from '../PersonAuditChecks';
import { runPersonAuditChecks } from '../../infrastructure/AuditCheckRunners';
import { PersonAuditCheckContext } from '../../infrastructure/AuditCheckContexts';

describe('PersonAuditChecks', () => {
    const validUuid = uuidV4();
    const householdUuid = uuidV4();
    const homeUuid = uuidV4();
    const interviewUuid = uuidV4();

    const createMockPerson = (overrides: Partial<Person> = {}) => {
        return {
            _uuid: validUuid,
            age: 30,
            ...overrides
        } as Person;
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

    const createFullContext = (overrides: Partial<PersonAuditCheckContext> = {}): PersonAuditCheckContext => {
        return {
            person: createMockPerson(),
            household: createMockHousehold(),
            home: createMockHome(),
            interview: createMockInterview(),
            interviewAttributes: createMockInterviewAttributes(),
            ...overrides
        };
    };

    describe('P_M_Uuid audit check', () => {
        it('should pass when person has valid UUID', () => {
            const context = createFullContext({
                person: createMockPerson({ _uuid: validUuid })
            });

            const result = personAuditChecks.P_M_Uuid(context);

            expect(result).toBeUndefined();
        });

        it('should error when person UUID is missing', () => {
            const context = createFullContext({
                person: createMockPerson({ _uuid: undefined })
            });

            const result = personAuditChecks.P_M_Uuid(context);

            expect(result).toEqual({
                version: 1,
                level: 'error',
                message: 'Person UUID is missing',
                ignore: false
            });
        });
    });

    describe('P_M_Age audit check', () => {
        it('should pass when person has valid age', () => {
            const context = createFullContext({
                person: createMockPerson({ age: 30 })
            });

            const result = personAuditChecks.P_M_Age(context);

            expect(result).toBeUndefined();
        });

        it('should warn when person age is undefined', () => {
            const context = createFullContext({
                person: createMockPerson({ age: undefined })
            });

            const result = personAuditChecks.P_M_Age(context);

            expect(result).toEqual({
                version: 1,
                level: 'warning',
                message: 'Person age is missing',
                ignore: false
            });
        });
    });


    describe('runPersonAuditChecks function', () => {
        it('should run all person audits and format results', () => {
            const context = createFullContext({
                person: createMockPerson({ _uuid: validUuid, age: 30 })
            });

            const audits = runPersonAuditChecks(context, personAuditChecks);

            // Should return empty array since all audits pass
            expect(audits).toHaveLength(0);
        });

        it('should include failed audits in results', () => {
            // Test with missing age (UUID is valid, but age is missing)
            const context = createFullContext({
                person: createMockPerson({
                    age: undefined
                })
            });

            const audits = runPersonAuditChecks(context, personAuditChecks);

            expect(audits).toHaveLength(1); // Only age audit should fail

            // Check age audit
            const ageAudit = audits.find((audit) => audit.errorCode === 'P_M_Age');
            expect(ageAudit).toEqual({
                objectType: 'person',
                objectUuid: validUuid,
                errorCode: 'P_M_Age',
                version: 1,
                level: 'warning',
                message: 'Person age is missing',
                ignore: false
            });
        });
    });
});
