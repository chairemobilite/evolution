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
import { InterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import { visitedPlaceAuditChecks } from '../VisitedPlaceAuditChecks';
import { runVisitedPlaceAuditChecks } from '../../infrastructure/AuditCheckRunners';
import { VisitedPlaceAuditCheckContext } from '../../infrastructure/AuditCheckContexts';
import { ExtendedPlaceAttributes } from 'evolution-common/lib/services/baseObjects/Place';

describe('VisitedPlaceAuditChecks', () => {
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
        } as ExtendedPersonAttributes);
    };

    const createMockJourney = (overrides: Partial<Journey> = {}) => {
        return new Journey({
            _uuid: journeyUuid,
            ...overrides
        } as ExtendedJourneyAttributes);
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

    const createFullContext = (overrides: Partial<VisitedPlaceAuditCheckContext> = {}): VisitedPlaceAuditCheckContext => {
        return {
            visitedPlace: createMockVisitedPlace(),
            person: createMockPerson(),
            journey: createMockJourney(),
            household: createMockHousehold(),
            home: createMockHome(),
            interview: createMockInterview(),
            interviewAttributes: createMockInterviewAttributes(),
            ...overrides
        };
    };

    describe('VisitedPlaceHasGeography audit', () => {
        it('should pass when visited place has valid geography', () => {
            const context = createFullContext();

            const result = visitedPlaceAuditChecks.VP_M_Geography(context);

            expect(result).toBeUndefined();
        });

        it('should warn when visited place has no geography', () => {
            const context = createFullContext({
                visitedPlace: createMockVisitedPlace({ geography: undefined })
            });

            const result = visitedPlaceAuditChecks.VP_M_Geography(context);

            expect(result).toEqual({
                version: 1,
                level: 'warning',
                message: 'Visited place geography is missing',
                ignore: false
            });
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

            const result = visitedPlaceAuditChecks.VP_M_Geography(context);

            expect(result).toEqual({
                version: 1,
                level: 'error',
                message: 'Visited place coordinates are invalid',
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

            const result = visitedPlaceAuditChecks.VP_M_Geography(context);

            expect(result).toEqual({
                version: 1,
                level: 'error',
                message: 'Visited place coordinates are invalid',
                ignore: false
            });
        });
    });

    describe('VisitedPlaceHasBasicInfo audit', () => {
        it('should pass when visited place has uuid', () => {
            const context = createFullContext();

            const result = visitedPlaceAuditChecks.VP_M_Uuid(context);

            expect(result).toBeUndefined();
        });

        it('should error when visited place missing uuid', () => {
            const context = createFullContext({
                visitedPlace: createMockVisitedPlace({ _uuid: undefined })
            });

            const result = visitedPlaceAuditChecks.VP_M_Uuid(context);

            expect(result).toEqual({
                version: 1,
                level: 'error',
                message: 'Visited place UUID is missing',
                ignore: false
            });
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
            // Test with missing geography (UUID is valid)
            const context = createFullContext({
                visitedPlace: createMockVisitedPlace({
                    geography: undefined
                })
            });

            const audits = runVisitedPlaceAuditChecks(context, visitedPlaceAuditChecks);

            expect(audits).toHaveLength(1); // Only geography audit should fail

            // Check geography audit
            const geographyAudit = audits.find((audit) => audit.errorCode === 'VP_M_Geography');
            expect(geographyAudit).toEqual({
                objectType: 'visitedPlace',
                objectUuid: validUuid,
                errorCode: 'VP_M_Geography',
                version: 1,
                level: 'warning',
                message: 'Visited place geography is missing',
                ignore: false
            });
        });
    });
});
