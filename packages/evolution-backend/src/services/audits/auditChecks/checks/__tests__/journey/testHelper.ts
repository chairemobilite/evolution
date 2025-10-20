/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import type { Journey } from 'evolution-common/lib/services/baseObjects/Journey';
import type { Person } from 'evolution-common/lib/services/baseObjects/Person';
import type { Interview } from 'evolution-common/lib/services/baseObjects/interview/Interview';
import type { JourneyAuditCheckContext } from '../../../AuditCheckContexts';

export const createMockJourney = (overrides: Partial<Journey> = {}, validUuid = uuidV4()) => {
    return {
        _uuid: validUuid,
        startTime: 28800,
        endTime: 32400,
        ...overrides
    } as Journey;
};

export const createContextWithJourney = (journeyOverrides: Partial<Journey> = {}, validUuid = uuidV4()): JourneyAuditCheckContext => {
    return {
        journey: createMockJourney(journeyOverrides, validUuid),
        person: { _uuid: uuidV4() } as unknown as Person,
        household: undefined,
        home: undefined,
        interview: { _uuid: uuidV4() } as unknown as Interview
    };
};
