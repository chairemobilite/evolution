/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import type { Trip } from 'evolution-common/lib/services/baseObjects/Trip';
import type { Journey } from 'evolution-common/lib/services/baseObjects/Journey';
import type { Person } from 'evolution-common/lib/services/baseObjects/Person';
import type { Interview } from 'evolution-common/lib/services/baseObjects/interview/Interview';
import type { TripAuditCheckContext } from '../../../AuditCheckContexts';

export const createMockTrip = (overrides: Partial<Trip> = {}, validUuid = uuidV4()) => {
    return {
        _uuid: validUuid,
        startDate: '2023-10-15',
        ...overrides
    } as Trip;
};

export const createContextWithTrip = (tripOverrides: Partial<Trip> = {}, validUuid = uuidV4()): TripAuditCheckContext => {
    return {
        trip: createMockTrip(tripOverrides, validUuid),
        journey: { _uuid: uuidV4() } as unknown as Journey,
        person: { _uuid: uuidV4() } as unknown as Person,
        household: undefined,
        home: undefined,
        interview: { _uuid: uuidV4() } as unknown as Interview
    };
};

test('dummy', () => {
    // Needs at least one test in the file
});
