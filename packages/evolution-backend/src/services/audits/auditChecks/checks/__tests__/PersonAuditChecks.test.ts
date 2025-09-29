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
import { personAuditChecks } from '../PersonAuditChecks';
import { runPersonAuditChecks } from '../../AuditCheckRunners';
import { PersonAuditCheckContext } from '../../AuditCheckContexts';
import { SurveyObjectsRegistry } from 'evolution-common/lib/services/baseObjects/SurveyObjectsRegistry';

describe('PersonAuditChecks', () => {
    let surveyObjectsRegistry: SurveyObjectsRegistry;

    beforeEach(() => {
        surveyObjectsRegistry = new SurveyObjectsRegistry();
    });

    afterEach(() => {
        surveyObjectsRegistry.clear();
    });

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

    const createFullContext = (overrides: Partial<PersonAuditCheckContext> = {}): PersonAuditCheckContext => {
        return {
            person: createMockPerson(),
            household: createMockHousehold(),
            home: createMockHome(),
            interview: createMockInterview(),
            ...overrides
        };
    };

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
                objectType: 'person',
                objectUuid: validUuid,
                errorCode: 'P_M_Age',
                version: 1,
                level: 'error',
                message: 'Person age is missing',
                ignore: false
            });
        });
    });


    describe('runPersonAuditChecks function', () => {
        it('should run all person audits and format results', () => {
            const context = createFullContext({
                person: createMockPerson({ age: 30 })
            });

            const audits = runPersonAuditChecks(context, personAuditChecks);

            // Should return empty array since all audits pass
            expect(audits).toHaveLength(0);
        });

        it('should include failed audits in results', () => {
            // Test with missing age
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
                level: 'error',
                message: 'Person age is missing',
                ignore: false
            });
        });
    });
});
