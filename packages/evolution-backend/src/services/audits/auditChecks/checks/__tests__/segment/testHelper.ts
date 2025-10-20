/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import type { Segment } from 'evolution-common/lib/services/baseObjects/Segment';
import type { Trip } from 'evolution-common/lib/services/baseObjects/Trip';
import type { Journey } from 'evolution-common/lib/services/baseObjects/Journey';
import type { Person } from 'evolution-common/lib/services/baseObjects/Person';
import type { Interview } from 'evolution-common/lib/services/baseObjects/interview/Interview';
import type { SegmentAuditCheckContext } from '../../../AuditCheckContexts';

export const createMockSegment = (overrides: Partial<Segment> = {}, validUuid = uuidV4()) => {
    return {
        _uuid: validUuid,
        mode: 'walk',
        ...overrides
    } as Segment;
};

export const createContextWithSegment = (segmentOverrides: Partial<Segment> = {}, validUuid = uuidV4()): SegmentAuditCheckContext => {
    return {
        segment: createMockSegment(segmentOverrides, validUuid),
        trip: { _uuid: uuidV4() } as unknown as Trip,
        journey: { _uuid: uuidV4() } as unknown as Journey,
        person: { _uuid: uuidV4() } as unknown as Person,
        household: undefined,
        home: undefined,
        interview: { _uuid: uuidV4() } as unknown as Interview
    };
};
