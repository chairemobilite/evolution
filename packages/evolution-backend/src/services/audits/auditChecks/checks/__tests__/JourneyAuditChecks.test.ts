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
import { journeyAuditChecks } from '../JourneyAuditChecks';
import { runJourneyAuditChecks } from '../../AuditCheckRunners';
import { JourneyAuditCheckContext } from '../../AuditCheckContexts';
import { SurveyObjectsRegistry } from 'evolution-common/lib/services/baseObjects/SurveyObjectsRegistry';

describe('JourneyAuditChecks', () => {
    let surveyObjectsRegistry: SurveyObjectsRegistry;

    beforeEach(() => {
        surveyObjectsRegistry = new SurveyObjectsRegistry();
    });

    afterEach(() => {
        surveyObjectsRegistry.clear();
    });

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
        } as ExtendedPersonAttributes, surveyObjectsRegistry);
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
        } as ExtendedInterviewAttributesWithComposedObjects, {
            id: 123,
            participant_id: 1,
            uuid: interviewUuid,
            is_completed: false,
            response: {},
            validations: {},
            is_valid: true,
            is_active: true,
            is_questionable: false,
            survey_id: 1
        }, surveyObjectsRegistry);
    };

    const createFullContext = (overrides: Partial<JourneyAuditCheckContext> = {}): JourneyAuditCheckContext => {
        return {
            journey: createMockJourney(),
            person: createMockPerson(),
            household: createMockHousehold(),
            home: createMockHome(),
            interview: createMockInterview(),
            ...overrides
        };
    };

    describe('J_M_StartDate audit check', () => {
        it('should pass when journey has start date', () => {
            const context = createFullContext({
                journey: createMockJourney({ startDate: '2023-10-15' })
            });

            const result = journeyAuditChecks.J_M_StartDate(context);

            expect(result).toBeUndefined();
        });

        it('should error when journey start date is missing', () => {
            const context = createFullContext({
                journey: createMockJourney({ startDate: undefined })
            });

            const result = journeyAuditChecks.J_M_StartDate(context);

            expect(result).toEqual({
                objectType: 'journey',
                objectUuid: validUuid,
                errorCode: 'J_M_StartDate',
                version: 1,
                level: 'error',
                message: 'Journey start date is missing',
                ignore: false
            });
        });
    });

    describe('runJourneyAuditChecks function', () => {
        it('should run all journey audits and format results', () => {
            const context = createFullContext({
                journey: createMockJourney({ startDate: '2023-10-15' })
            });

            const audits = runJourneyAuditChecks(context, journeyAuditChecks);

            // Should return empty array since all audits pass
            expect(audits).toHaveLength(0);
        });

        it('should include failed audits in results', () => {
            const context = createFullContext({
                journey: createMockJourney({ startDate: undefined })
            });

            const audits = runJourneyAuditChecks(context, journeyAuditChecks);

            expect(audits).toHaveLength(1);

            // Check start date audit
            const startDateAudit = audits.find((audit) => audit.errorCode === 'J_M_StartDate');
            expect(startDateAudit).toEqual({
                objectType: 'journey',
                objectUuid: validUuid,
                errorCode: 'J_M_StartDate',
                version: 1,
                level: 'error',
                message: 'Journey start date is missing',
                ignore: false
            });
        });
    });
});
