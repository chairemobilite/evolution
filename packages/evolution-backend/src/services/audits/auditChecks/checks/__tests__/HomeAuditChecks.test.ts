/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { Home } from 'evolution-common/lib/services/baseObjects/Home';
import { ExtendedHouseholdAttributes, Household } from 'evolution-common/lib/services/baseObjects/Household';
import { ExtendedInterviewAttributesWithComposedObjects, Interview } from 'evolution-common/lib/services/baseObjects/interview/Interview';
import { homeAuditChecks } from '../HomeAuditChecks';
import { runHomeAuditChecks } from '../../AuditCheckRunners';
import { HomeAuditCheckContext } from '../../AuditCheckContexts';
import { SurveyObjectsRegistry } from 'evolution-common/lib/services/baseObjects/SurveyObjectsRegistry';

describe('HomeAuditChecks', () => {
    let surveyObjectsRegistry: SurveyObjectsRegistry;

    beforeEach(() => {
        surveyObjectsRegistry = new SurveyObjectsRegistry();
    });

    afterEach(() => {
        surveyObjectsRegistry.clear();
    });

    const validUuid = uuidV4();
    const interviewUuid = uuidV4();

    const createMockHome = (overrides: Partial<Home> = {}) => {
        return {
            _uuid: validUuid,
            geography: {
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'Point' as const,
                    coordinates: [-73.5, 45.5]
                }
            },
            ...overrides
        } as Home;
    };

    const createMockInterview = (overrides: Partial<Interview> = {}) => {
        return new Interview({
            _uuid: interviewUuid,
            ...overrides
        } as ExtendedInterviewAttributesWithComposedObjects, { id: 123, participant_id: 1 } as any, surveyObjectsRegistry);
    };

    const createMockHousehold = (overrides: Partial<Household> = {}) => {
        return new Household({
            _uuid: validUuid,
            size: 2,
            ...overrides
        } as ExtendedHouseholdAttributes, surveyObjectsRegistry);
    };

    describe('HM_M_Geography audit check', () => {
        it('should pass when home has valid geography', () => {
            const home = createMockHome();
            const interview = createMockInterview();
            const context: HomeAuditCheckContext = { home, interview, household: createMockHousehold() };

            const result = homeAuditChecks.HM_M_Geography(context);

            expect(result).toBeUndefined();
        });

        it('should error when home has no geography', () => {
            const home = createMockHome({ geography: undefined });
            const interview = createMockInterview();
            const context: HomeAuditCheckContext = { home, interview, household: createMockHousehold() };

            const result = homeAuditChecks.HM_M_Geography(context);

            expect(result).toEqual({
                objectType: 'home',
                objectUuid: validUuid,
                errorCode: 'HM_M_Geography',
                version: 1,
                level: 'error',
                message: 'Home geography is missing',
                ignore: false
            });
        });
    });

    describe('HM_I_Geography audit check', () => {
        it('should pass when home has valid geography', () => {
            const home = createMockHome();
            const interview = createMockInterview();
            const context: HomeAuditCheckContext = { home, interview, household: createMockHousehold() };

            const result = homeAuditChecks.HM_I_Geography(context);

            expect(result).toBeUndefined();
        });

        it('should error when geography has invalid coordinates', () => {
            const home = createMockHome({
                geography: {
                    type: 'Feature',
                    properties: {},
                    geometry: {
                        type: 'Point',
                        coordinates: [-73.5] // Missing latitude
                    }
                }
            });
            const interview = createMockInterview();
            const context: HomeAuditCheckContext = { home, interview, household: createMockHousehold() };

            const result = homeAuditChecks.HM_I_Geography(context);

            expect(result).toEqual({
                objectType: 'home',
                objectUuid: validUuid,
                errorCode: 'HM_I_Geography',
                version: 1,
                level: 'error',
                message: 'Home geography is invalid',
                ignore: false
            });
        });

        it('should error when geography has no coordinates', () => {
            const home = createMockHome({
                geography: {
                    type: 'Feature',
                    properties: {},
                    geometry: {
                        type: 'Point',
                        coordinates: [] as number[]
                    }
                }
            });
            const interview = createMockInterview();
            const context: HomeAuditCheckContext = { home, interview, household: createMockHousehold() };

            const result = homeAuditChecks.HM_I_Geography(context);

            expect(result).toEqual({
                objectType: 'home',
                objectUuid: validUuid,
                errorCode: 'HM_I_Geography',
                version: 1,
                level: 'error',
                message: 'Home geography is invalid',
                ignore: false
            });
        });

        it('should pass when geography is missing (handled by HM_M_Geography)', () => {
            const home = createMockHome({ geography: undefined });
            const interview = createMockInterview();
            const context: HomeAuditCheckContext = { home, interview, household: createMockHousehold() };

            const result = homeAuditChecks.HM_I_Geography(context);

            expect(result).toBeUndefined();
        });
    });

    describe('runHomeAuditChecks function', () => {
        it('should run all home audits and format results', () => {
            const home = createMockHome();
            const interview = createMockInterview();
            const context: HomeAuditCheckContext = { home, interview, household: createMockHousehold() };

            const audits = runHomeAuditChecks(context, homeAuditChecks);

            // Should return empty array since all audits pass
            expect(audits).toHaveLength(0);
        });

        it('should include failed audits in results', () => {
            // Test with missing geography (UUID is valid, but geography is missing)
            const home = createMockHome({
                geography: undefined
            });
            const interview = createMockInterview();
            const context: HomeAuditCheckContext = { home, interview, household: createMockHousehold() };

            const audits = runHomeAuditChecks(context, homeAuditChecks);

            expect(audits).toHaveLength(1); // Only geography missing audit should fail

            // Check geography audit
            const geographyAudit = audits.find((audit) => audit.errorCode === 'HM_M_Geography');
            expect(geographyAudit).toEqual({
                objectType: 'home',
                objectUuid: validUuid,
                errorCode: 'HM_M_Geography',
                version: 1,
                level: 'error',
                message: 'Home geography is missing',
                ignore: false
            });
        });

        it('should include invalid geography audits in results', () => {
            // Test with invalid geography (has geography but invalid coordinates)
            const home = createMockHome({
                geography: {
                    type: 'Feature',
                    properties: {},
                    geometry: {
                        type: 'Point',
                        coordinates: [-73.5] // Missing latitude
                    }
                }
            });
            const interview = createMockInterview();
            const context: HomeAuditCheckContext = { home, interview, household: createMockHousehold() };

            const audits = runHomeAuditChecks(context, homeAuditChecks);

            expect(audits).toHaveLength(1); // Only geography invalid audit should fail

            // Check geography audit
            const geographyAudit = audits.find((audit) => audit.errorCode === 'HM_I_Geography');
            expect(geographyAudit).toEqual({
                objectType: 'home',
                objectUuid: validUuid,
                errorCode: 'HM_I_Geography',
                version: 1,
                level: 'error',
                message: 'Home geography is invalid',
                ignore: false
            });
        });
    });
});
