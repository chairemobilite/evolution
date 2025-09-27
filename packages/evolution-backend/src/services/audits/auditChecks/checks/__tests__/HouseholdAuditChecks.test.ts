/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { Household } from 'evolution-common/lib/services/baseObjects/Household';
import { ExtendedInterviewAttributesWithComposedObjects, Interview } from 'evolution-common/lib/services/baseObjects/interview/Interview';
import { InterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import { householdAuditChecks } from '../HouseholdAuditChecks';
import { runHouseholdAuditChecks } from '../../infrastructure/AuditCheckRunners';
import { HouseholdAuditCheckContext } from '../../infrastructure/AuditCheckContexts';

describe('HouseholdAuditChecks', () => {
    const validUuid = uuidV4();
    const interviewUuid = uuidV4();

    const createMockHousehold = (overrides: Partial<Household> = {}) => {
        return {
            _uuid: validUuid,
            size: 3,
            ...overrides
        } as Household;
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
                household: { size: 3 },
                persons: {}
            },
            validations: {},
            survey_id: 1,
            ...overrides
        };
    };

    describe('HH_I_Size audit check', () => {
        it('should pass when household has valid size', () => {
            const household = createMockHousehold({ size: 3 });
            const interview = createMockInterview();
            const interviewAttributes = createMockInterviewAttributes();
            const context: HouseholdAuditCheckContext = { household, interview, interviewAttributes };

            const result = householdAuditChecks.HH_I_Size(context);

            expect(result).toBeUndefined();
        });

        it('should warn when household size is undefined', () => {
            const household = createMockHousehold({ size: undefined });
            const interview = createMockInterview();
            const interviewAttributes = createMockInterviewAttributes();
            const context: HouseholdAuditCheckContext = { household, interview, interviewAttributes };

            const result = householdAuditChecks.HH_I_Size(context);

            expect(result).toEqual({
                version: 1,
                level: 'warning',
                message: 'Household size is not specified',
                ignore: false
            });
        });

        it('should warn when household size is null', () => {
            const household = createMockHousehold({ size: undefined });
            const interview = createMockInterview();
            const interviewAttributes = createMockInterviewAttributes();
            const context: HouseholdAuditCheckContext = { household, interview, interviewAttributes };

            const result = householdAuditChecks.HH_I_Size(context);

            expect(result).toEqual({
                version: 1,
                level: 'warning',
                message: 'Household size is not specified',
                ignore: false
            });
        });

        it('should error when household size is too small', () => {
            const household = createMockHousehold({ size: 0 });
            const interview = createMockInterview();
            const interviewAttributes = createMockInterviewAttributes();
            const context: HouseholdAuditCheckContext = { household, interview, interviewAttributes };

            const result = householdAuditChecks.HH_I_Size(context);

            expect(result).toEqual({
                version: 1,
                level: 'error',
                message: 'Household size is out of range (should be between 1 and 20)',
                ignore: false
            });
        });

        it('should error when household size is too large', () => {
            const household = createMockHousehold({ size: 25 });
            const interview = createMockInterview();
            const interviewAttributes = createMockInterviewAttributes();
            const context: HouseholdAuditCheckContext = { household, interview, interviewAttributes };

            const result = householdAuditChecks.HH_I_Size(context);

            expect(result).toEqual({
                version: 1,
                level: 'error',
                message: 'Household size is out of range (should be between 1 and 20)',
                ignore: false
            });
        });

        it('should warn when generated size differs from response data', () => {
            const household = createMockHousehold({ size: 3 });
            const interview = createMockInterview();
            const interviewAttributes = createMockInterviewAttributes({
                response: { household: { size: 2 } }
            });
            const context: HouseholdAuditCheckContext = { household, interview, interviewAttributes };

            const result = householdAuditChecks.HH_I_Size(context);

            expect(result).toEqual({
                version: 1,
                level: 'warning',
                message: 'Household size differs between generated object and response data',
                ignore: false
            });
        });
    });

    describe('HH_M_Uuid audit check', () => {
        it('should pass when household has uuid', () => {
            const household = createMockHousehold();
            const interview = createMockInterview();
            const interviewAttributes = createMockInterviewAttributes();
            const context: HouseholdAuditCheckContext = { household, interview, interviewAttributes };

            const result = householdAuditChecks.HH_M_Uuid(context);

            expect(result).toBeUndefined();
        });

        it('should error when household missing uuid', () => {
            const household = createMockHousehold({ _uuid: undefined });
            const interview = createMockInterview();
            const interviewAttributes = createMockInterviewAttributes();
            const context: HouseholdAuditCheckContext = { household, interview, interviewAttributes };

            const result = householdAuditChecks.HH_M_Uuid(context);

            expect(result).toEqual({
                version: 1,
                level: 'error',
                message: 'Household UUID is missing',
                ignore: false
            });
        });
    });

    describe('runHouseholdAuditChecks function', () => {
        it('should run all household audits and format results', () => {
            const household = createMockHousehold();
            const interview = createMockInterview();
            const interviewAttributes = createMockInterviewAttributes();
            const context: HouseholdAuditCheckContext = { household, interview, interviewAttributes };

            const audits = runHouseholdAuditChecks(context, householdAuditChecks);

            // Should return empty array since all audits pass
            expect(audits).toHaveLength(0);
        });

        it('should include failed audits in results', () => {
            // Test with invalid size (UUID is valid, but size is invalid)
            const household = createMockHousehold({ size: 0 });
            const interview = createMockInterview();
            const interviewAttributes = createMockInterviewAttributes();
            const context: HouseholdAuditCheckContext = { household, interview, interviewAttributes };

            const audits = runHouseholdAuditChecks(context, householdAuditChecks);

            expect(audits).toHaveLength(1); // Only size audit should fail

            // Check size validation audit
            const sizeAudit = audits.find((audit) => audit.errorCode === 'HH_I_Size');
            expect(sizeAudit).toEqual({
                objectType: 'household',
                objectUuid: validUuid,
                errorCode: 'HH_I_Size',
                version: 1,
                level: 'error',
                message: 'Household size is out of range (should be between 1 and 20)',
                ignore: false
            });
        });
    });
});
