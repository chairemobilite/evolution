/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { Segment } from 'evolution-common/lib/services/baseObjects/Segment';
import { ExtendedTripAttributes, Trip } from 'evolution-common/lib/services/baseObjects/Trip';
import { Journey } from 'evolution-common/lib/services/baseObjects/Journey';
import { Person } from 'evolution-common/lib/services/baseObjects/Person';
import { Household } from 'evolution-common/lib/services/baseObjects/Household';
import { Home } from 'evolution-common/lib/services/baseObjects/Home';
import { ExtendedJourneyAttributes } from 'evolution-common/lib/services/baseObjects/Journey';
import { ExtendedPersonAttributes } from 'evolution-common/lib/services/baseObjects/Person';
import { ExtendedInterviewAttributesWithComposedObjects, Interview } from 'evolution-common/lib/services/baseObjects/interview/Interview';
import { ExtendedHouseholdAttributes } from 'evolution-common/lib/services/baseObjects/Household';
import { InterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import { segmentAuditChecks } from '../SegmentAuditChecks';
import { runSegmentAuditChecks } from '../../infrastructure/AuditCheckRunners';
import { SegmentAuditCheckContext } from '../../infrastructure/AuditCheckContexts';
import { ExtendedPlaceAttributes } from 'evolution-common/lib/services/baseObjects/Place';

describe('SegmentAuditChecks', () => {
    const validUuid = uuidV4();
    const tripUuid = uuidV4();
    const journeyUuid = uuidV4();
    const personUuid = uuidV4();
    const householdUuid = uuidV4();
    const homeUuid = uuidV4();
    const interviewUuid = uuidV4();

    const createMockSegment = (overrides: Partial<Segment> = {}) => {
        return {
            _uuid: validUuid,
            mode: 'walk',
            ...overrides
        } as Segment;
    };

    const createMockTrip = (overrides: Partial<Trip> = {}) => {
        return new Trip({
            _uuid: tripUuid,
            ...overrides
        } as ExtendedTripAttributes);
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

    const createFullContext = (overrides: Partial<SegmentAuditCheckContext> = {}): SegmentAuditCheckContext => {
        return {
            segment: createMockSegment(),
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

    describe('S_M_Uuid audit check', () => {
        it('should pass when segment has UUID', () => {
            const context = createFullContext({
                segment: createMockSegment({ _uuid: validUuid })
            });

            const result = segmentAuditChecks.S_M_Uuid(context);

            expect(result).toBeUndefined();
        });

        it('should error when segment UUID is missing', () => {
            const context = createFullContext({
                segment: createMockSegment({ _uuid: undefined })
            });

            const result = segmentAuditChecks.S_M_Uuid(context);

            expect(result).toEqual({
                version: 1,
                level: 'error',
                message: 'Segment UUID is missing',
                ignore: false
            });
        });
    });

    describe('S_M_Mode audit check', () => {
        it('should pass when segment has mode', () => {
            const context = createFullContext({
                segment: createMockSegment({ mode: 'walk' })
            });

            const result = segmentAuditChecks.S_M_Mode(context);

            expect(result).toBeUndefined();
        });

        it('should warn when segment mode is missing', () => {
            const context = createFullContext({
                segment: createMockSegment({ mode: undefined })
            });

            const result = segmentAuditChecks.S_M_Mode(context);

            expect(result).toEqual({
                version: 1,
                level: 'warning',
                message: 'Segment mode is missing',
                ignore: false
            });
        });
    });

    describe('runSegmentAuditChecks function', () => {
        it('should run all segment audits and format results', () => {
            const context = createFullContext({
                segment: createMockSegment({ _uuid: validUuid, mode: 'walk' })
            });

            const audits = runSegmentAuditChecks(context, segmentAuditChecks);

            // Should return empty array since all audits pass
            expect(audits).toHaveLength(0);
        });

        it('should include failed audits in results', () => {
            // Test with missing mode (UUID is valid, but mode is missing)
            const context = createFullContext({
                segment: createMockSegment({
                    mode: undefined
                })
            });

            const audits = runSegmentAuditChecks(context, segmentAuditChecks);

            expect(audits).toHaveLength(1); // Only mode audit should fail

            // Check mode audit
            const modeAudit = audits.find((audit) => audit.errorCode === 'S_M_Mode');
            expect(modeAudit).toEqual({
                objectType: 'segment',
                objectUuid: validUuid,
                errorCode: 'S_M_Mode',
                version: 1,
                level: 'warning',
                message: 'Segment mode is missing',
                ignore: false
            });
        });
    });
});
