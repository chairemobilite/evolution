/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { VisitedPlace } from 'evolution-common/lib/services/baseObjects/VisitedPlace';
import { ExtendedPersonAttributes, Person } from 'evolution-common/lib/services/baseObjects/Person';
import { ExtendedJourneyAttributes, Journey } from 'evolution-common/lib/services/baseObjects/Journey';
import { ExtendedHouseholdAttributes, Household } from 'evolution-common/lib/services/baseObjects/Household';
import { Home } from 'evolution-common/lib/services/baseObjects/Home';
import { ExtendedInterviewAttributesWithComposedObjects, Interview } from 'evolution-common/lib/services/baseObjects/interview/Interview';
import { visitedPlaceAuditChecks } from '../VisitedPlaceAuditChecks';
import { runVisitedPlaceAuditChecks } from '../../AuditCheckRunners';
import { VisitedPlaceAuditCheckContext } from '../../AuditCheckContexts';
import { ExtendedPlaceAttributes } from 'evolution-common/lib/services/baseObjects/Place';
import { SurveyObjectsRegistry } from 'evolution-common/lib/services/baseObjects/SurveyObjectsRegistry';

describe('VisitedPlaceAuditChecks', () => {
    let surveyObjectsRegistry: SurveyObjectsRegistry;

    beforeEach(() => {
        surveyObjectsRegistry = new SurveyObjectsRegistry();
    });

    afterEach(() => {
        surveyObjectsRegistry.clear();
    });

    const validUuid = uuidV4();
    const personUuid = uuidV4();
    const journeyUuid = uuidV4();
    const householdUuid = uuidV4();
    const homeUuid = uuidV4();
    const interviewUuid = uuidV4();

    const createMockVisitedPlace = (overrides: Partial<VisitedPlace> = {}) => {
        return {
            _uuid: validUuid,
            activity: 'work',
            geography: {
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'Point' as const,
                    coordinates: [-73.5, 45.5]
                }
            },
            ...overrides
        } as VisitedPlace;
    };

    const createMockPerson = (overrides: Partial<Person> = {}) => {
        return new Person({
            _uuid: personUuid,
            age: 30,
            ...overrides
        } as ExtendedPersonAttributes, surveyObjectsRegistry);
    };

    const createMockJourney = (overrides: Partial<Journey> = {}) => {
        return new Journey({
            _uuid: journeyUuid,
            ...overrides
        } as ExtendedJourneyAttributes, surveyObjectsRegistry);
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

    const createFullContext = (overrides: Partial<VisitedPlaceAuditCheckContext> = {}): VisitedPlaceAuditCheckContext => {
        return {
            visitedPlace: createMockVisitedPlace(),
            person: createMockPerson(),
            journey: createMockJourney(),
            household: createMockHousehold(),
            home: createMockHome(),
            interview: createMockInterview(),
            ...overrides
        };
    };

    describe('VP_M_Geography audit check', () => {
        it('should pass when visited place has geography', () => {
            const context = createFullContext();

            const result = visitedPlaceAuditChecks.VP_M_Geography(context);

            expect(result).toBeUndefined();
        });

        it('should error when visited place has no geography', () => {
            const context = createFullContext({
                visitedPlace: createMockVisitedPlace({ geography: undefined })
            });

            const result = visitedPlaceAuditChecks.VP_M_Geography(context);

            expect(result).toEqual({
                objectType: 'visitedPlace',
                objectUuid: validUuid,
                errorCode: 'VP_M_Geography',
                version: 1,
                level: 'error',
                message: 'Visited place geography is missing',
                ignore: false
            });
        });
    });

    describe('VP_I_Geography audit check', () => {
        it('should pass when visited place has valid geography', () => {
            const context = createFullContext();

            const result = visitedPlaceAuditChecks.VP_I_Geography(context);

            expect(result).toBeUndefined();
        });

        it('should error when geography has invalid coordinates', () => {
            const context = createFullContext({
                visitedPlace: createMockVisitedPlace({
                    geography: {
                        type: 'Feature',
                        properties: {},
                        geometry: {
                            type: 'Point',
                            coordinates: [-73.5] // Missing latitude
                        }
                    }
                })
            });

            const result = visitedPlaceAuditChecks.VP_I_Geography(context);

            expect(result).toEqual({
                objectType: 'visitedPlace',
                objectUuid: validUuid,
                errorCode: 'VP_I_Geography',
                version: 1,
                level: 'error',
                message: 'Visited place geography is invalid',
                ignore: false
            });
        });

        it('should error when geography has no coordinates', () => {
            const context = createFullContext({
                visitedPlace: createMockVisitedPlace({
                    geography: {
                        type: 'Feature',
                        properties: {},
                        geometry: {
                            type: 'Point',
                            coordinates: [] as number[]
                        }
                    }
                })
            });

            const result = visitedPlaceAuditChecks.VP_I_Geography(context);

            expect(result).toEqual({
                objectType: 'visitedPlace',
                objectUuid: validUuid,
                errorCode: 'VP_I_Geography',
                version: 1,
                level: 'error',
                message: 'Visited place geography is invalid',
                ignore: false
            });
        });

        it('should pass when geography is missing (handled by VP_M_Geography)', () => {
            const context = createFullContext({
                visitedPlace: createMockVisitedPlace({ geography: undefined })
            });

            const result = visitedPlaceAuditChecks.VP_I_Geography(context);

            expect(result).toBeUndefined();
        });
    });

    describe('runVisitedPlaceAuditChecks function', () => {
        it('should run all visited place audits and format results', () => {
            const context = createFullContext();

            const audits = runVisitedPlaceAuditChecks(context, visitedPlaceAuditChecks);

            // Should return empty array since all audits pass
            expect(audits).toHaveLength(0);
        });

        it('should include failed audits in results', () => {
            // Test with missing geography
            const context = createFullContext({
                visitedPlace: createMockVisitedPlace({
                    geography: undefined
                })
            });

            const audits = runVisitedPlaceAuditChecks(context, visitedPlaceAuditChecks);

            expect(audits).toHaveLength(1); // Only geography missing audit should fail

            // Check geography audit
            const geographyAudit = audits.find((audit) => audit.errorCode === 'VP_M_Geography');
            expect(geographyAudit).toEqual({
                objectType: 'visitedPlace',
                objectUuid: validUuid,
                errorCode: 'VP_M_Geography',
                version: 1,
                level: 'error',
                message: 'Visited place geography is missing',
                ignore: false
            });
        });

        it('should include invalid geography audits in results', () => {
            // Test with invalid geography (has geography but invalid coordinates)
            const context = createFullContext({
                visitedPlace: createMockVisitedPlace({
                    geography: {
                        type: 'Feature',
                        properties: {},
                        geometry: {
                            type: 'Point',
                            coordinates: [-73.5] // Missing latitude
                        }
                    }
                })
            });

            const audits = runVisitedPlaceAuditChecks(context, visitedPlaceAuditChecks);

            expect(audits).toHaveLength(1); // Only geography invalid audit should fail

            // Check geography audit
            const geographyAudit = audits.find((audit) => audit.errorCode === 'VP_I_Geography');
            expect(geographyAudit).toEqual({
                objectType: 'visitedPlace',
                objectUuid: validUuid,
                errorCode: 'VP_I_Geography',
                version: 1,
                level: 'error',
                message: 'Visited place geography is invalid',
                ignore: false
            });
        });
    });
});
