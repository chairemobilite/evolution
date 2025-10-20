/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import type { Home } from 'evolution-common/lib/services/baseObjects/Home';
import type { Interview } from 'evolution-common/lib/services/baseObjects/interview/Interview';
import type { Household } from 'evolution-common/lib/services/baseObjects/Household';
import type { HomeAuditCheckContext } from '../../../AuditCheckContexts';

export const createMockHome = (overrides: Partial<Home> = {}, validUuid = uuidV4()) => {
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

export const createContextWithHome = (homeOverrides: Partial<Home> = {}, validUuid = uuidV4()): HomeAuditCheckContext => {
    return {
        home: createMockHome(homeOverrides, validUuid),
        interview: { _uuid: uuidV4() } as unknown as Interview,
        household: { _uuid: uuidV4() } as unknown as Household
    };
};

test('dummy', () => {
    // Needs at least one test in the file
});
